import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import type { PlayerType } from '@/types';
import {
  CharacterDisplay,
  getCharacterTier,
  getCharacterBuild,
} from '@/components/ui/CharacterDisplay';
import { CharacterScene } from './CharacterScene';

interface CharacterDisplay3DProps {
  readonly level: number;
  readonly strengthCount: number;
  readonly scoutCount: number;
  readonly isWorkingOut?: boolean;
  readonly size?: 'sm' | 'md' | 'lg' | 'xl';
  readonly playerType?: PlayerType;
}

const SIZE_PX: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 48,
  md: 80,
  lg: 112,
  xl: 260,
};

/**
 * Drop-in replacement for CharacterDisplay.
 * Same props interface — renders 3D character on native, falls back to
 * emoji-based CharacterDisplay if GL fails or on web.
 */
export function CharacterDisplay3D({
  level,
  strengthCount,
  scoutCount,
  isWorkingOut = false,
  size = 'md',
  playerType,
}: CharacterDisplay3DProps) {
  const [use3D, setUse3D] = useState(false);

  useEffect(() => {
    // Only attempt 3D on native platforms
    if (Platform.OS === 'web') {
      setUse3D(false);
      return;
    }

    try {
      require('expo-gl');
      require('three');
      setUse3D(true);
    } catch {
      setUse3D(false);
    }
  }, []);

  if (!use3D) {
    // CharacterDisplay only supports sm/md/lg — map xl to lg
    const fallbackSize = size === 'xl' ? 'lg' : size;
    return (
      <CharacterDisplay
        level={level}
        strengthCount={strengthCount}
        scoutCount={scoutCount}
        isWorkingOut={isWorkingOut}
        size={fallbackSize}
        playerType={playerType}
      />
    );
  }

  const tier = getCharacterTier(level);
  const build = playerType && playerType.confidence > 0
    ? (playerType.category === 'cardio_specialist'
        ? 'cardio'
        : playerType.category === 'strength_specialist'
        ? 'strength'
        : 'balanced')
    : getCharacterBuild(strengthCount, scoutCount);

  return (
    <CharacterScene
      build={build}
      tier={tier}
      size={SIZE_PX[size]}
      enableRotation={!isWorkingOut}
    />
  );
}
