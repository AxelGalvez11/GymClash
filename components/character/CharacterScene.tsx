// IMPORTANT: polyfill must be installed before any code touches `three`.
import { installThreeRNPolyfills } from '@/lib/three/rn-polyfills';
installThreeRNPolyfills();

import { useRef, useEffect, useCallback, useState } from 'react';
import { View, Platform, PanResponder } from 'react-native';
import { parseGlbRN } from '@/lib/three/glb-preprocess';
import type { CharacterBuild, CharacterTier } from '@/types';
import type { CharacterModelConfig, EquippedItem } from '@/lib/character/types';
import { getCharacterModelConfig, type BiologicalSex } from '@/lib/character/model-registry';

// Lazy imports for 3D
let GLView: any = null;
let THREE: any = null;
let ExpoTHREE: any = null;
let GLTFLoader: any = null;
let Asset: any = null;
let FileSystem: any = null;

const STARTER_MODEL_COLOR = 0xc7ccd8;

interface CharacterSceneProps {
  readonly build: CharacterBuild;
  readonly tier: CharacterTier;
  readonly size: number;
  readonly enableRotation?: boolean;
  readonly sex?: BiologicalSex;
  readonly equipment?: readonly EquippedItem[];
}

function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
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

  throw new Error('No base64 decoder available for character model');
}

async function loadBinaryGlbAsset(assetSource: number): Promise<ArrayBuffer> {
  if (!Asset || !FileSystem) {
    throw new Error('3D asset loaders not initialized');
  }

  const [asset] = await Asset.loadAsync([assetSource]);
  const uri = asset.localUri || asset.uri;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decodeBase64ToArrayBuffer(base64);
}

async function parseBundledGlbAsset(assetSource: number): Promise<any> {
  if (!GLTFLoader) {
    throw new Error('GLTFLoader not initialized');
  }

  const loader = new GLTFLoader();
  const arrayBuffer = await loadBinaryGlbAsset(assetSource);
  console.log('[CharacterScene] GLB loaded bytes:', arrayBuffer.byteLength);
  return parseGlbRN(loader, arrayBuffer);
}

function prepareLoadedModel(model: any) {
  if (!THREE) return;

  model.traverse((child: any) => {
    if (!child.isMesh) return;

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
}

function normalizeCharacterModel(model: any, scaleMultiplier: number) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const targetHeight = 2.0;
  const scaleFactor = targetHeight / Math.max(size.y, 0.001);
  model.scale.setScalar(scaleFactor * scaleMultiplier);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  model.position.x -= scaledCenter.x;
  model.position.y -= scaledBox.min.y;
  model.position.z -= scaledCenter.z;
}

function placeAttachmentModel(model: any, item: EquippedItem) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scaleFactor =
    item.transform.targetHeight / Math.max(size.y, 0.001);

  model.scale.setScalar(scaleFactor * (item.transform.scaleMultiplier ?? 1));

  const centeredBox = new THREE.Box3().setFromObject(model);
  const centeredCenter = centeredBox.getCenter(new THREE.Vector3());
  model.position.x -= centeredCenter.x;
  model.position.y -= centeredCenter.y;
  model.position.z -= centeredCenter.z;

  const [rx = 0, ry = 0, rz = 0] = item.transform.rotation ?? [0, 0, 0];
  model.rotation.set(rx, ry, rz);

  const [px, py, pz] = item.transform.position;
  model.position.x += px;
  model.position.y += py;
  model.position.z += pz;
}

export function CharacterScene({
  build,
  tier,
  size,
  enableRotation = true,
  sex,
  equipment = [],
}: CharacterSceneProps) {
  const [glReady, setGlReady] = useState(false);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const mixerRef = useRef<any>(null);
  const clockRef = useRef<any>(null);
  const frameRef = useRef<number>(0);
  const configRef = useRef<CharacterModelConfig>(
    getCharacterModelConfig(build, tier, sex)
  );

  // Touch rotation
  const isDraggingRef = useRef(false);
  const lastTouchXRef = useRef(0);
  const autoRotateRef = useRef(enableRotation);
  const autoRotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDraggingRef.current = true;
        autoRotateRef.current = false;
        lastTouchXRef.current = evt.nativeEvent.pageX;
        if (autoRotateTimerRef.current) clearTimeout(autoRotateTimerRef.current);
      },
      onPanResponderMove: (evt) => {
        if (!modelRef.current) return;
        const dx = evt.nativeEvent.pageX - lastTouchXRef.current;
        modelRef.current.rotation.y += dx * 0.01;
        lastTouchXRef.current = evt.nativeEvent.pageX;
      },
      onPanResponderRelease: () => {
        isDraggingRef.current = false;
        autoRotateTimerRef.current = setTimeout(() => {
          autoRotateRef.current = enableRotation;
        }, 3000);
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
      console.warn('[CharacterScene] Failed to load 3D libs:', e);
      setGlReady(false);
    }
  }, []);

  useEffect(() => {
    configRef.current = getCharacterModelConfig(build, tier, sex);
  }, [build, tier, sex]);

  const onContextCreate = useCallback(
    async (gl: any) => {
      if (!THREE || !ExpoTHREE || !GLTFLoader || !Asset || !FileSystem) {
        console.warn('[CharacterScene] 3D dependencies not loaded');
        return;
      }

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
      // Camera framing is recomputed after the model loads (see fitCameraToModel).
      const camera = new THREE.PerspectiveCamera(35, aspect, 0.01, 1000);
      camera.position.set(0, 1.0, 5);
      camera.lookAt(0, 1.0, 0);
      cameraRef.current = camera;

      const renderer = new ExpoTHREE.Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0);
      try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch {}
      rendererRef.current = renderer;

      // Bright even lighting
      scene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
      keyLight.position.set(1, 3, 3);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
      fillLight.position.set(-2, 2, 1);
      scene.add(fillLight);
      const backLight = new THREE.DirectionalLight(0xce96ff, 0.6);
      backLight.position.set(0, 2, -3);
      scene.add(backLight);
      const bottomLight = new THREE.DirectionalLight(0xffffff, 0.4);
      bottomLight.position.set(0, -1, 2);
      scene.add(bottomLight);

      const clock = new THREE.Clock();
      clockRef.current = clock;

      try {
        await loadCharacterModel(scene, renderer, camera);
      } catch (err: any) {
        console.warn('[CharacterScene] Model load failed:', err?.message ?? err, err?.stack);
        const geo = new THREE.CapsuleGeometry(0.3, 0.8, 8, 16);
        const mat = new THREE.MeshStandardMaterial({ color: STARTER_MODEL_COLOR });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, 0.7, 0);
        scene.add(mesh);
        modelRef.current = mesh;
      }

      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        if (mixerRef.current && clockRef.current) {
          mixerRef.current.update(clockRef.current.getDelta());
        }
        if (modelRef.current && autoRotateRef.current && !isDraggingRef.current) {
          modelRef.current.rotation.y += 0.012;
        }
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      animate();
    },
    [build, tier, enableRotation, equipment]
  );

  async function loadCharacterModel(scene: any, renderer: any, camera: any) {
    if (!THREE || !GLTFLoader || !Asset || !FileSystem) {
      throw new Error('3D model loaders not initialized');
    }

    const resourceAssets = configRef.current.resourceAssets ?? {};
    const resourceEntries = Object.entries(resourceAssets);
    const isBinaryGlb =
      resourceEntries.length === 0 &&
      configRef.current.modelPath.toLowerCase().endsWith('.glb');

    const [gltfAsset] = await Asset.loadAsync([configRef.current.assetSource]);
    const gltfUri = gltfAsset.localUri || gltfAsset.uri;

    let gltf: any;
    if (isBinaryGlb) {
      gltf = await parseBundledGlbAsset(configRef.current.assetSource);
    } else {
      // Legacy path: .gltf + external .bin/textures
      const loadedResourceAssets = await Asset.loadAsync(
        resourceEntries.map(([, moduleId]) => moduleId)
      );
      const gltfJson = await FileSystem.readAsStringAsync(gltfUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const bufferUriMap = Object.fromEntries(
        resourceEntries
          .filter(([name]) => name.endsWith('.bin'))
          .map(([name], index) => {
            const asset = loadedResourceAssets[index];
            return [name, asset.localUri || asset.uri];
          })
      );
      const textureAssetMap = Object.fromEntries(
        resourceEntries
          .filter(([name]) => !name.endsWith('.bin'))
          .map(([name, moduleId]) => [name, moduleId])
      );

      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url: string) => bufferUriMap[url] ?? url);

      const loader = new GLTFLoader(manager);
      loader.register((parser: any) => {
        parser.textureLoader.setPath(textureAssetMap);
        return { name: 'GYMCLASH_NATIVE_TEXTURES' };
      });
      gltf = await new Promise<any>((resolve, reject) => {
        loader.parse(gltfJson, '', resolve, reject);
      });
    }

    const model = gltf.scene || gltf.scenes?.[0];
    if (!model) throw new Error('GLTF has no scene');

    let meshCount = 0;
    model.traverse((child: any) => {
      if (child.isMesh) meshCount += 1;
    });
    prepareLoadedModel(model);
    console.log('[CharacterScene] mesh count:', meshCount);

    normalizeCharacterModel(model, configRef.current.scale);

    for (const item of equipment) {
      try {
        const attachmentGltf = await parseBundledGlbAsset(item.assetSource);
        const attachment = attachmentGltf.scene || attachmentGltf.scenes?.[0];
        if (!attachment) {
          continue;
        }
        prepareLoadedModel(attachment);
        placeAttachmentModel(attachment, item);
        model.add(attachment);
      } catch (error: any) {
        console.warn(
          `[CharacterScene] Equipment load failed for ${item.id}:`,
          error?.message ?? error
        );
      }
    }

    scene.add(model);
    modelRef.current = model;

    // Fit camera so the entire bounding sphere is visible at every Y rotation
    // (Fortnite-style — no cutoffs when spinning).
    const finalBox = new THREE.Box3().setFromObject(model);
    const sphere = finalBox.getBoundingSphere(new THREE.Sphere());
    const fov = camera.fov * (Math.PI / 180);
    const fitHeight = sphere.radius / Math.sin(fov / 2);
    const fitWidth = fitHeight / Math.min(camera.aspect, 1);
    const distance = Math.max(fitHeight, fitWidth) * 1.35; // 35% margin
    camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + distance);
    camera.lookAt(sphere.center);
    camera.near = Math.max(0.01, distance / 100);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
    console.log(
      '[CharacterScene] fit: radius=',
      sphere.radius.toFixed(2),
      'distance=',
      distance.toFixed(2)
    );

    // Force texture upload to GPU
    if (renderer.compile) {
      renderer.compile(scene, camera);
    }

    // Play first animation if present
    if (gltf.animations?.length > 0) {
      const mixer = new THREE.AnimationMixer(model);
      mixer.clipAction(gltf.animations[0]).play();
      mixerRef.current = mixer;
    }
  }

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (mixerRef.current) mixerRef.current.stopAllAction();
      if (autoRotateTimerRef.current) clearTimeout(autoRotateTimerRef.current);
    };
  }, []);

  if (!glReady || Platform.OS === 'web') return null;

  return (
    <View style={{ width: size, height: size }} {...panResponder.panHandlers}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
    </View>
  );
}

function getTierColor(tier: CharacterTier): number {
  const colors: Record<CharacterTier, number> = {
    basic: 0x74738b, equipped: 0xc0c0c0, geared: 0xffd700,
    elite: 0xe5e4e2, legendary: 0xb9f2ff, mythic: 0xff6b35,
  };
  return colors[tier];
}
