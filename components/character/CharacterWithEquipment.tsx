import type { CharacterBuild, CharacterTier } from '@/types';
import type { EquippedItem } from '@/lib/character/types';
import { CharacterScene } from './CharacterScene';

interface CharacterWithEquipmentProps {
  readonly build: CharacterBuild;
  readonly tier: CharacterTier;
  readonly equipment: readonly EquippedItem[];
  readonly size: number;
  readonly enableRotation?: boolean;
  readonly sex?: 'male' | 'female' | null;
}

/**
 * Loads the base character model and applies static equipment anchors.
 *
 * The current bundled GLBs are not rigged, so attachments are placed using
 * tuned offsets relative to the normalized body instead of skeleton bones.
 */
export function CharacterWithEquipment({
  build,
  tier,
  equipment,
  size,
  enableRotation = true,
  sex,
}: CharacterWithEquipmentProps) {
  return (
    <CharacterScene
      build={build}
      tier={tier}
      equipment={equipment}
      size={size}
      enableRotation={enableRotation}
      sex={sex}
    />
  );
}
