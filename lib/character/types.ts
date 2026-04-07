import type { CharacterBuild, CharacterTier } from '@/types';

export type EquipmentSlot = 'head' | 'chest' | 'hands' | 'feet' | 'accessory';
export type CharacterModelId = 'starter';

export interface EquippedItem {
  readonly id: string;
  readonly slot: EquipmentSlot;
  readonly modelPath: string;
  readonly name: string;
}

export interface CharacterModelConfig {
  readonly id: CharacterModelId;
  readonly build: CharacterBuild;
  readonly tier: CharacterTier;
  readonly modelPath: string;
  readonly assetSource: number;
  readonly scale: number;
  readonly idleAnimationSpeed: number;
}
