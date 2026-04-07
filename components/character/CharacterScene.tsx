import { useRef, useEffect, useCallback, useState } from 'react';
import { View, Platform, PanResponder } from 'react-native';
import type { CharacterBuild, CharacterTier } from '@/types';
import type { CharacterModelConfig } from '@/lib/character/types';
import { getCharacterModelConfig } from '@/lib/character/model-registry';

// Lazy imports for 3D
let GLView: any = null;
let THREE: any = null;
let ExpoTHREE: any = null;

interface CharacterSceneProps {
  readonly build: CharacterBuild;
  readonly tier: CharacterTier;
  readonly size: number;
  readonly enableRotation?: boolean;
}

export function CharacterScene({
  build,
  tier,
  size,
  enableRotation = true,
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
    getCharacterModelConfig(build, tier)
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
      // expo-three default export includes loadAsync + the texture polyfill
      ExpoTHREE = require('expo-three');
      setGlReady(true);
    } catch (e) {
      console.warn('[CharacterScene] Failed to load 3D libs:', e);
      setGlReady(false);
    }
  }, []);

  useEffect(() => {
    configRef.current = getCharacterModelConfig(build, tier);
  }, [build, tier]);

  const onContextCreate = useCallback(
    async (gl: any) => {
      if (!THREE || !ExpoTHREE) {
        console.warn('[CharacterScene] THREE or ExpoTHREE not loaded');
        return;
      }

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
      const camera = new THREE.PerspectiveCamera(28, aspect, 0.1, 100);
      camera.position.set(0, 1.1, 3.2);
      camera.lookAt(0, 0.85, 0);
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

      // Load model using expo-three's loadAsync — handles textures correctly
      try {
        await loadCharacterModel(scene, renderer, camera);
        console.log('[CharacterScene] ✅ Model loaded successfully');
      } catch (err) {
        console.warn('[CharacterScene] ❌ Model load failed:', err);
        // Fallback: visible capsule so we know it failed
        const geo = new THREE.CapsuleGeometry(0.3, 0.8, 8, 16);
        const mat = new THREE.MeshStandardMaterial({ color: getTierColor(tier) });
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
          modelRef.current.rotation.y += 0.005 * configRef.current.idleAnimationSpeed;
        }
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      animate();
    },
    [build, tier, enableRotation]
  );

  async function loadCharacterModel(scene: any, renderer: any, camera: any) {
    if (!ExpoTHREE || !THREE) throw new Error('ExpoTHREE/THREE not initialized');

    console.log('[CharacterScene] Calling ExpoTHREE.loadAsync...');

    // ExpoTHREE.loadAsync handles:
    //  - Asset resolution (require → local URI)
    //  - .glb binary loading via fetch().arrayBuffer()
    //  - GLTFLoader.parse() with the correct callback signature
    //  - Texture polyfill via polyfillTextureLoader.fx
    const gltf = await ExpoTHREE.loadAsync(
      configRef.current.assetSource,
      undefined, // onProgress
      undefined  // onAssetRequested
    );

    console.log('[CharacterScene] loadAsync returned, gltf:', !!gltf, 'scene:', !!gltf?.scene);

    const model = gltf.scene || gltf.scenes?.[0];
    if (!model) throw new Error('GLTF has no scene');

    // Force SRGB on diffuse maps
    model.traverse((child: any) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of materials) {
        if (!mat) continue;
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.needsUpdate = true;
        }
        if (mat.emissiveMap) mat.emissiveMap.needsUpdate = true;
        if (mat.normalMap) mat.normalMap.needsUpdate = true;
        if (mat.roughnessMap) mat.roughnessMap.needsUpdate = true;
        if (mat.metalnessMap) mat.metalnessMap.needsUpdate = true;
        mat.needsUpdate = true;
      }
    });

    // Auto-center and scale
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());

    const targetHeight = 2.0;
    const scaleFactor = targetHeight / sz.y;
    model.scale.setScalar(scaleFactor * configRef.current.scale);

    model.position.x = -center.x * scaleFactor;
    model.position.y = -box.min.y * scaleFactor;
    model.position.z = -center.z * scaleFactor;

    scene.add(model);
    modelRef.current = model;

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
