import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { CharacterBuild, CharacterTier } from '@/types';
import { getCharacterModelConfig } from '@/lib/character/model-registry';
import type { CharacterModelConfig } from '@/lib/character/types';

interface UseCharacterModelReturn {
  readonly config: CharacterModelConfig;
  readonly isLoaded: boolean;
  readonly error: string | null;
}

/**
 * Loads and caches 3D character model configuration.
 * When real .glb models are available, this hook will handle
 * asset loading via expo-asset and model caching.
 */
export function useCharacterModel(
  build: CharacterBuild,
  tier: CharacterTier
): UseCharacterModelReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configRef = useRef<CharacterModelConfig>(
    getCharacterModelConfig(build, tier)
  );

  useEffect(() => {
    configRef.current = getCharacterModelConfig(build, tier);

    if (Platform.OS === 'web') {
      setError('3D models not supported on web');
      setIsLoaded(false);
      return;
    }

    // When .glb assets are available, this will use expo-asset to
    // download and cache the model file. For now, mark as loaded
    // since we use procedural geometry as placeholder.
    setIsLoaded(true);
    setError(null);
  }, [build, tier]);

  return {
    config: configRef.current,
    isLoaded,
    error,
  };
}
