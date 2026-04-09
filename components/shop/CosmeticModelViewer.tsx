// IMPORTANT: polyfill must be installed before any code touches `three`.
import { installThreeRNPolyfills } from '@/lib/three/rn-polyfills';
installThreeRNPolyfills();

import { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, View } from 'react-native';
import { parseGlbRN } from '@/lib/three/glb-preprocess';

let GLView: any = null;
let THREE: any = null;
let ExpoTHREE: any = null;
let GLTFLoader: any = null;
let Asset: any = null;
let FileSystem: any = null;

function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
  const bufferCtor = (globalThis as any).Buffer;
  if (bufferCtor?.from) {
    const decoded = bufferCtor.from(base64, 'base64');
    return decoded.buffer.slice(
      decoded.byteOffset,
      decoded.byteOffset + decoded.byteLength
    );
  }
  throw new Error('No base64 decoder available');
}

interface CosmeticModelViewerProps {
  readonly modelAsset: number;
  readonly size: number;
  readonly autoRotate?: boolean;
  readonly interactive?: boolean;
}

/**
 * Generic self-contained .glb viewer with drag-to-rotate and optional
 * idle auto-rotate. Used in the shop cosmetic preview modal.
 */
export function CosmeticModelViewer({
  modelAsset,
  size,
  autoRotate = true,
  interactive = true,
}: CosmeticModelViewerProps) {
  const [glReady, setGlReady] = useState(false);
  const modelRef = useRef<any>(null);
  const frameRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastTouchXRef = useRef(0);
  const autoRotateRef = useRef(autoRotate);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDraggingRef.current = true;
        autoRotateRef.current = false;
        lastTouchXRef.current = evt.nativeEvent.pageX;
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      },
      onPanResponderMove: (evt) => {
        if (!modelRef.current) return;
        const dx = evt.nativeEvent.pageX - lastTouchXRef.current;
        modelRef.current.rotation.y += dx * 0.012;
        lastTouchXRef.current = evt.nativeEvent.pageX;
      },
      onPanResponderRelease: () => {
        isDraggingRef.current = false;
        resumeTimerRef.current = setTimeout(() => {
          autoRotateRef.current = autoRotate;
        }, 2500);
      },
    })
  ).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      GLView = require('expo-gl').GLView;
      THREE = require('three');
      ExpoTHREE = require('expo-three');
      GLTFLoader = require('three/examples/jsm/loaders/GLTFLoader').GLTFLoader;
      Asset = require('expo-asset').Asset;
      FileSystem = require('expo-file-system');
      setGlReady(true);
    } catch (e) {
      console.warn('[CosmeticModelViewer] Failed to load 3D libs:', e);
      setGlReady(false);
    }
  }, []);

  const onContextCreate = useCallback(
    async (gl: any) => {
      if (!THREE || !ExpoTHREE || !GLTFLoader || !Asset || !FileSystem) return;

      const scene = new THREE.Scene();
      const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
      // Camera framing is recomputed after the model loads (see fit step).
      const camera = new THREE.PerspectiveCamera(35, aspect, 0.01, 1000);
      camera.position.set(0, 1.0, 5);
      camera.lookAt(0, 1.0, 0);

      const renderer = new ExpoTHREE.Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0);
      try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch {}

      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(2, 3, 3);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xce96ff, 0.7);
      fill.position.set(-2, 1.5, 1);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0x81ecff, 0.6);
      rim.position.set(0, 2, -3);
      scene.add(rim);

      try {
        const [asset] = await Asset.loadAsync([modelAsset]);
        const uri = asset.localUri || asset.uri;
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const arrayBuffer = decodeBase64ToArrayBuffer(base64);
        console.log('[CosmeticModelViewer] GLB loaded bytes:', arrayBuffer.byteLength);
        const loader = new GLTFLoader();
        const gltf = await parseGlbRN(loader, arrayBuffer);
        const model = gltf.scene || gltf.scenes?.[0];
        if (!model) throw new Error('GLTF has no scene');

        let meshCount = 0;
        model.traverse((child: any) => {
          if (!child.isMesh) return;
          meshCount += 1;
          // Preserve loaded PBR materials + textures.
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of materials) {
            if (!material) continue;
            if (material.map) {
              try { material.map.colorSpace = THREE.SRGBColorSpace; } catch {}
              material.map.needsUpdate = true;
            }
            if (material.emissiveMap) material.emissiveMap.needsUpdate = true;
            if (material.normalMap) material.normalMap.needsUpdate = true;
            if (material.roughnessMap) material.roughnessMap.needsUpdate = true;
            if (material.metalnessMap) material.metalnessMap.needsUpdate = true;
            material.needsUpdate = true;
          }
          child.frustumCulled = false;
          child.visible = true;
        });
        console.log('[CosmeticModelViewer] mesh count:', meshCount);

        // Normalize size and center the model.
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const sz = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(sz.x, sz.y, sz.z) || 1;
        const targetSize = 2.0;
        const scaleFactor = targetSize / maxDim;
        model.scale.setScalar(scaleFactor);

        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        model.position.x -= scaledCenter.x;
        model.position.y -= scaledBox.min.y;
        model.position.z -= scaledCenter.z;

        scene.add(model);
        modelRef.current = model;

        // Fortnite-style camera fit: bounding sphere + margin so the model
        // is fully visible at every Y rotation, no cutoffs.
        const finalBox = new THREE.Box3().setFromObject(model);
        const sphere = finalBox.getBoundingSphere(new THREE.Sphere());
        const fov = camera.fov * (Math.PI / 180);
        const fitHeight = sphere.radius / Math.sin(fov / 2);
        const fitWidth = fitHeight / Math.min(camera.aspect, 1);
        const distance = Math.max(fitHeight, fitWidth) * 1.35;
        camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + distance);
        camera.lookAt(sphere.center);
        camera.near = Math.max(0.01, distance / 100);
        camera.far = distance * 10;
        camera.updateProjectionMatrix();
        console.log(
          '[CosmeticModelViewer] fit: radius=',
          sphere.radius.toFixed(2),
          'distance=',
          distance.toFixed(2)
        );

        if (renderer.compile) renderer.compile(scene, camera);
      } catch (err: any) {
        console.warn(
          '[CosmeticModelViewer] Model load failed:',
          err?.message ?? err,
          err?.stack
        );
      }

      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        if (modelRef.current && autoRotateRef.current && !isDraggingRef.current) {
          modelRef.current.rotation.y += 0.012;
        }
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      animate();
    },
    [modelAsset]
  );

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  if (!glReady || Platform.OS === 'web') {
    return <View style={{ width: size, height: size }} />;
  }

  if (!interactive) {
    return (
      <View
        style={{ width: size, height: size }}
        pointerEvents="none"
      >
        <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }} {...panResponder.panHandlers}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
    </View>
  );
}
