/**
 * RN-safe GLB loading.
 *
 * With `installThreeRNPolyfills()` installed, three.js's `GLTFLoader` can
 * parse binary GLBs with embedded textures directly — the patched Blob +
 * URL.createObjectURL + TextureLoader pipeline handles everything natively.
 *
 * This is a thin wrapper so callers stay agnostic of the internal mechanism.
 */

export async function parseGlbRN(
  loader: any,
  arrayBuffer: ArrayBuffer
): Promise<any> {
  return new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, '', resolve, reject);
  });
}
