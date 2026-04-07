import type { CharacterBuild, CharacterTier } from '@/types';
import type { CharacterModelConfig, CharacterModelId, EquipmentSlot } from './types';

/**
 * Every player starts on the same base 3D body.
 * Future unlocks/shop purchases can swap this id for owned models.
 */
const EQUIPMENT_BASE_PATH = 'assets/models/equipment';
const STARTER_MODEL_PATH = 'assets/models/characters/model2.glb';
const STARTER_MODEL_ASSET = require('../../assets/models/characters/model2.glb');

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

export function getCharacterModelConfig(
  build: CharacterBuild,
  tier: CharacterTier
): CharacterModelConfig {
  return {
    id: DEFAULT_CHARACTER_MODEL_ID,
    build,
    tier,
    modelPath: STARTER_MODEL_PATH,
    assetSource: STARTER_MODEL_ASSET,
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
