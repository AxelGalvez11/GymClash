import type { CharacterBuild, CharacterTier } from '@/types';
import type { CharacterModelConfig, CharacterModelId, EquipmentSlot } from './types';

/**
 * Character model selection.
 * - Male (default) → finalmalemodel1.glb
 * - Female         → femalemodel1.glb
 * Both are self-contained binary .glb files (no external .bin/textures).
 */
const EQUIPMENT_BASE_PATH = 'assets/models/equipment';

const MALE_MODEL_PATH = 'assets/models/characters/finalmalemodel1.glb';
const MALE_MODEL_ASSET = require('../../assets/models/characters/finalmalemodel1.glb');

const FEMALE_MODEL_PATH = 'assets/models/characters/femalemodel1.glb';
const FEMALE_MODEL_ASSET = require('../../assets/models/characters/femalemodel1.glb');

export const DEFAULT_CHARACTER_MODEL_ID: CharacterModelId = 'starter';

const TIER_SCALE: Record<CharacterTier, number> = {
  basic: 1.0,
  equipped: 1.0,
  geared: 1.0,
  elite: 1.0,
  legendary: 1.0,
  mythic: 1.0,
};

const TIER_ANIMATION_SPEED: Record<CharacterTier, number> = {
  basic: 0.6,
  equipped: 0.6,
  geared: 0.6,
  elite: 0.6,
  legendary: 0.6,
  mythic: 0.6,
};

export type BiologicalSex = 'male' | 'female' | null | undefined;

export function getCharacterModelConfig(
  build: CharacterBuild,
  tier: CharacterTier,
  sex?: BiologicalSex
): CharacterModelConfig {
  const isFemale = sex === 'female';
  return {
    id: DEFAULT_CHARACTER_MODEL_ID,
    build,
    tier,
    modelPath: isFemale ? FEMALE_MODEL_PATH : MALE_MODEL_PATH,
    assetSource: isFemale ? FEMALE_MODEL_ASSET : MALE_MODEL_ASSET,
    resourceAssets: {},
    scale: TIER_SCALE[tier],
    idleAnimationSpeed: TIER_ANIMATION_SPEED[tier],
  };
}

export function getEquipmentModelPath(
  cosmeticId: string,
  slot: EquipmentSlot
): string {
  return `${EQUIPMENT_BASE_PATH}/${slot}/${cosmeticId}.glb`;
}

/**
 * Returns the skeleton bone name where equipment attaches.
 * These names must match the bones in the base character .glb files.
 */
export function getEquipmentAttachBone(slot: EquipmentSlot): string {
  switch (slot) {
    case 'head':
      return 'Head';
    case 'chest':
      return 'Spine2';
    case 'hands':
      return 'RightHand';
    case 'feet':
      return 'RightFoot';
    case 'accessory':
      return 'Hips';
  }
}
