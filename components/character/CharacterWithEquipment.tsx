import type { CharacterBuild, CharacterTier } from '@/types';
import type { EquippedItem } from '@/lib/character/types';
import { CharacterScene } from './CharacterScene';

interface CharacterWithEquipmentProps {
  readonly build: CharacterBuild;
  readonly tier: CharacterTier;
  readonly equipment: readonly EquippedItem[];
  readonly size: number;
  readonly enableRotation?: boolean;
}

/**
 * Loads base character model + attaches equipment meshes to skeleton bones.
 *
 * Currently delegates to CharacterScene (equipment attachment requires
 * real .glb models with named skeleton bones). When art assets are ready,
 * this component will:
 * 1. Load base model via GLTFLoader
 * 2. For each equipped item, load its .glb and attach to the matching bone
 * 3. Run combined idle animation
 */
export function CharacterWithEquipment({
  build,
  tier,
  size,
  enableRotation = true,
}: CharacterWithEquipmentProps) {
  // Equipment rendering will be enabled when .glb models with
  // named skeleton bones are available. For now, render base character.
  return (
    <CharacterScene
      build={build}
      tier={tier}
      size={size}
      enableRotation={enableRotation}
    />
  );
}
