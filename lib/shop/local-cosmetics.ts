import type { CosmeticRarity } from '@/types';

/**
 * Locally-bundled cosmetics shown in the shop's Costumes tab.
 * These items are not yet in the Supabase `cosmetic_catalog` table — purchases
 * are stubbed until a server-side catalog row exists. They render in the shop
 * with a clickable preview modal that loads the .glb with 360° drag rotation.
 */
export interface LocalCosmetic {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rarity: CosmeticRarity;
  readonly price_coins: number;
  readonly price_diamonds?: number;
  readonly modelAsset: number;
  readonly thumbnail: number;
  readonly isLocal: true;
}

export const LOCAL_COSMETICS: readonly LocalCosmetic[] = [
  {
    id: 'local-asufratleader',
    name: 'ASU Frat Leader',
    description:
      'Top of the pledge class. A leader build sculpted after the legendary ASU frat commander — brings pure alpha presence to your arena.',
    rarity: 'legendary',
    price_coins: 5000,
    price_diamonds: 1200,
    modelAsset: require('../../assets/models/cosmetics/asufratleader.glb'),
    thumbnail: require('../../assets/models/cosmetics/thumbs/asufratleader3d.png'),
    isLocal: true,
  },
  {
    id: 'local-wings',
    name: 'Ascendant Wings',
    description:
      'Ethereal wings that unfurl when you climb the leaderboard. A legendary back cosmetic earned only by the airborne elite.',
    rarity: 'legendary',
    price_coins: 4500,
    price_diamonds: 1000,
    modelAsset: require('../../assets/models/cosmetics/wings.glb'),
    thumbnail: require('../../assets/models/cosmetics/thumbs/wings.png'),
    isLocal: true,
  },
  {
    id: 'local-blackheadphones',
    name: 'Blackout Headphones',
    description:
      'Studio-grade matte-black headphones. Locks you in the zone — every rep counts a little more with these on.',
    rarity: 'rare',
    price_coins: 1200,
    modelAsset: require('../../assets/models/cosmetics/blackheadphones.glb'),
    thumbnail: require('../../assets/models/cosmetics/thumbs/headphones-black.png'),
    isLocal: true,
  },
  {
    id: 'local-dumbell',
    name: 'Iron Dumbbell',
    description:
      'The classic. A hand-weight cosmetic for hand slot loadouts — because the fundamentals never go out of style.',
    rarity: 'common',
    price_coins: 300,
    modelAsset: require('../../assets/models/cosmetics/dumbell.glb'),
    thumbnail: require('../../assets/models/cosmetics/thumbs/dumbell.webp'),
    isLocal: true,
  },
  {
    id: 'local-bench',
    name: 'Power Bench',
    description:
      'A full flat bench cosmetic prop. Flex in style — bring your own bench anywhere your clan fights.',
    rarity: 'common',
    price_coins: 400,
    modelAsset: require('../../assets/models/cosmetics/bench.glb'),
    thumbnail: require('../../assets/models/cosmetics/thumbs/dumbell.webp'),
    isLocal: true,
  },
];
