import type { CharacterBuild, CharacterTier } from '@/types';

export type EquipmentSlot = 'head' | 'chest' | 'hands' | 'feet' | 'accessory';
export type CharacterModelId = 'starter';

export interface EquipmentTransform {
  readonly targetHeight: number;
  readonly position: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
  readonly scaleMultiplier?: number;
}

export interface EquippedItem {
  readonly id: string;
  readonly slot: EquipmentSlot;
  readonly name: string;
  readonly assetSource: number;
  readonly modelPath?: string;
  readonly transform: EquipmentTransform;
}

export interface CharacterModelConfig {
  readonly id: CharacterModelId;
  readonly build: CharacterBuild;
  readonly tier: CharacterTier;
  readonly modelPath: string;
  readonly assetSource: number;
  readonly resourceAssets?: Readonly<Record<string, number>>;
  readonly scale: number;
  readonly idleAnimationSpeed: number;
}
