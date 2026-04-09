/**
 * React Native polyfills for three.js — enables GLTFLoader to load binary
 * GLB files with embedded textures in Expo + expo-gl + expo-three.
 *
 * This is the canonical fix used by @react-three/fiber/native v9.5.0.
 * See: https://github.com/pmndrs/react-three-fiber/blob/master/packages/fiber/src/native/polyfills.ts
 *
 * What it patches:
 *   1. BlobManager.createFromParts — so `new Blob([typedArray], { type })`
 *      accepts ArrayBuffer / ArrayBufferView (React Native's Blob does not).
 *   2. URL.createObjectURL — returns a data: URI for our patched blobs.
 *   3. THREE.LoaderUtils.extractUrlBase — doesn't choke on data: URIs.
 *   4. THREE.TextureLoader.prototype.load — loads via expo-gl's documented
 *      `gl.texImage2D({ localUri })` fake-DataTexture path, which is the
 *      ONLY reliable way to get cache-dir / data-URI textures onto the GPU
 *      in React Native.
 *   5. THREE.FileLoader.prototype.load — reads files as base64 → ArrayBuffer.
 *
 * MUST be called before any `require('three')` runs.
 */

import * as THREE from 'three';
import { Image, NativeModules, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { fromByteArray } from 'base64-js';
import { Buffer } from 'buffer';

// Legacy FileSystem API — stable, supported through SDK 54+.
const fs: any = require('expo-file-system/legacy');

let patched = false;

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Resolve any loader input (string URI, bundler module id, data URI, blob URI)
 * to a real `file://` URI that can be passed to `Image.getSize` / `fs.readAsStringAsync`.
 */
async function getAsset(input: string | number): Promise<string> {
  if (typeof input === 'string') {
    // Already a file URI — use directly.
    if (input.startsWith('file:')) return input;

    // React Native BlobManager URIs → fetch blob → base64 → file.
    const blobScheme =
      (NativeModules as any).BlobModule?.BLOB_URI_SCHEME ?? '__no_match__';
    if (input.startsWith('blob:') || input.startsWith(blobScheme)) {
      const blob = await new Promise<Blob>((res, rej) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', input as string);
        xhr.responseType = 'blob';
        xhr.onload = () => res(xhr.response);
        xhr.onerror = rej;
        xhr.send();
      });
      const data = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsText(blob);
      });
      input = `data:${blob.type};base64,${data}`;
    }

    // Data URI → write bytes to cache as a real file.
    if (input.startsWith('data:')) {
      const [header, data] = input.split(';base64,');
      const type = header.split('/')[1]?.split('+')[0] || 'bin';
      const uri = fs.cacheDirectory + uuidv4() + `.${type}`;
      await fs.writeAsStringAsync(uri, data, {
        encoding: fs.EncodingType.Base64,
      });
      return uri;
    }

    return input;
  }

  // Bundler module id (number from require()) or existing Asset instance.
  const asset = await Asset.fromModule(input as any).downloadAsync();
  let uri = asset.localUri || asset.uri;

  // Android release builds: copy drawable asset to cache so it has a file URI.
  if (uri && !uri.includes(':')) {
    const file = `${fs.cacheDirectory}ExponentAsset-${asset.hash}.${asset.type}`;
    await fs.copyAsync({ from: uri, to: file });
    uri = file;
  }
  return uri;
}

export function installThreeRNPolyfills(): void {
  if (patched) return;
  if (Platform.OS === 'web') {
    patched = true;
    return;
  }

  // ─── Patch 1: BlobManager.createFromParts ────────────────────────────────
  // Detect whether `new Blob([ArrayBuffer], { type })` already works.
  let blobOk = false;
  try {
    const probe = new Blob([new ArrayBuffer(4) as any]);
    URL.revokeObjectURL(URL.createObjectURL(probe));
    blobOk = true;
  } catch {
    blobOk = false;
  }

  if (!blobOk) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const BlobManagerModule = require('react-native/Libraries/Blob/BlobManager.js');
      const BlobManager: any = BlobManagerModule.default ?? BlobManagerModule;

      const origCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = function (blob: any): string {
        if (blob && blob.data && blob.data._base64) {
          return `data:${blob.type};base64,${blob.data._base64}`;
        }
        return origCreateObjectURL.call(URL, blob);
      };

      const origCreateFromParts = BlobManager.createFromParts;
      BlobManager.createFromParts = function (parts: any[], options: any) {
        const mapped = parts.map((part: any) => {
          if (part instanceof ArrayBuffer || ArrayBuffer.isView(part)) {
            const u8 =
              part instanceof ArrayBuffer
                ? new Uint8Array(part)
                : new Uint8Array(
                    (part as ArrayBufferView).buffer,
                    (part as ArrayBufferView).byteOffset,
                    (part as ArrayBufferView).byteLength
                  );
            return fromByteArray(u8);
          }
          return part;
        });
        const blob = origCreateFromParts.call(BlobManager, mapped, options);
        // Stash concatenated base64 on the blob so createObjectURL can find it.
        if (!blob.data) blob.data = {};
        blob.data._base64 = '';
        for (let i = 0; i < mapped.length; i += 1) {
          const m: any = mapped[i];
          blob.data._base64 += (m && m.data && m.data._base64) ?? m;
        }
        return blob;
      };
    } catch (e) {
      console.warn('[rn-polyfills] BlobManager patch failed:', e);
    }
  }

  // ─── Patch 2: LoaderUtils.extractUrlBase ─────────────────────────────────
  const origExtractUrlBase = THREE.LoaderUtils.extractUrlBase.bind(
    THREE.LoaderUtils
  );
  THREE.LoaderUtils.extractUrlBase = (url: string) =>
    typeof url === 'string' && !url.startsWith('data:')
      ? origExtractUrlBase(url)
      : './';

  // ─── Patch 3: TextureLoader.prototype.load ───────────────────────────────
  // Returns a fake DataTexture whose `image.data = { localUri }`. expo-gl's
  // texImage2D recognizes this shape and loads the image natively via
  // EXGLImageUtils::loadImage. This is the documented expo-gl mechanism.
  (THREE.TextureLoader as any).prototype.load = function load(
    this: any,
    url: string,
    onLoad?: (texture: any) => void,
    _onProgress?: any,
    onError?: (err: any) => void
  ) {
    if (this.path && typeof url === 'string') url = this.path + url;

    const texture: any = new THREE.Texture();
    getAsset(url)
      .then(async (uri) => {
        const { width, height } = await new Promise<{
          width: number;
          height: number;
        }>((resolve, reject) => {
          Image.getSize(
            uri,
            (w: number, h: number) => resolve({ width: w, height: h }),
            reject
          );
        });
        texture.image = { data: { localUri: uri }, width, height };
        texture.flipY = true; // expo-gl ≥ 12.4 default
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;
        texture.isDataTexture = true; // Force verbatim gl.texImage2D path
        onLoad?.(texture);
      })
      .catch((err) => {
        console.warn('[rn-polyfills] TextureLoader failed:', err);
        onError?.(err);
      });

    return texture;
  };

  // ─── Patch 4: FileLoader.prototype.load ──────────────────────────────────
  // Read arbitrary files (buffers, external .bin, etc) as ArrayBuffer.
  (THREE.FileLoader as any).prototype.load = function load(
    this: any,
    url: string,
    onLoad?: (data: any) => void,
    _onProgress?: any,
    onError?: (err: any) => void
  ) {
    if (this.path && typeof url === 'string') url = this.path + url;

    this.manager.itemStart(url);

    getAsset(url)
      .then(async (uri) => {
        const base64 = await fs.readAsStringAsync(uri, {
          encoding: fs.EncodingType.Base64,
        });
        const buf = Buffer.from(base64, 'base64');
        // Return a fresh ArrayBuffer view that three can treat as bytes.
        const arrayBuffer = buf.buffer.slice(
          buf.byteOffset,
          buf.byteOffset + buf.byteLength
        );
        onLoad?.(arrayBuffer);
      })
      .catch((err) => {
        console.warn('[rn-polyfills] FileLoader failed:', err);
        onError?.(err);
        this.manager.itemError(url);
      })
      .finally(() => {
        this.manager.itemEnd(url);
      });
  };

  patched = true;
  console.log('[rn-polyfills] installed (BlobManager=' + (blobOk ? 'native' : 'patched') + ')');
}
