import type { EquippedItem } from './types';

interface CosmeticPreviewEquipmentInput {
  readonly id: string;
  readonly name: string;
  readonly modelAsset: number;
}

type BundledEquipmentDefinition = Omit<EquippedItem, 'id' | 'name'>;

const BUNDLED_EQUIPMENT: Readonly<Record<string, BundledEquipmentDefinition>> = {
  wings: {
    slot: 'accessory',
    assetSource: require('../../assets/models/cosmetics/wings.glb'),
    transform: {
      targetHeight: 1.35,
      position: [0, 1.08, -0.16],
      rotation: [0, 0, 0],
      scaleMultiplier: 1.05,
    },
  },
  dumbell: {
    slot: 'hands',
    assetSource: require('../../assets/models/cosmetics/dumbell.glb'),
    transform: {
      targetHeight: 0.42,
      position: [0.34, 0.88, 0.08],
      rotation: [0.2, 0.1, 1.45],
      scaleMultiplier: 1,
    },
  },
};

function normalizeEquipmentId(id: string): string {
  return id.replace(/^local-/, '').trim().toLowerCase();
}

export function getBundledEquipmentItemById(
  cosmeticId: string,
  name?: string
): EquippedItem | null {
  const normalizedId = normalizeEquipmentId(cosmeticId);
  const config = BUNDLED_EQUIPMENT[normalizedId];
  if (!config) {
    return null;
  }

  return {
    id: cosmeticId,
    name: name ?? normalizedId,
    ...config,
  };
}

export function getPreviewEquipmentItem(
  cosmetic: CosmeticPreviewEquipmentInput
): EquippedItem | null {
  const config = getBundledEquipmentItemById(cosmetic.id, cosmetic.name);
  if (!config) {
    return null;
  }

  return {
    ...config,
    assetSource: cosmetic.modelAsset,
  };
}
