// Theme tokens — single source of truth for design values.
// NativeWind handles most styling via Tailwind classes in tailwind.config.js.
// These constants are for programmatic use (charts, animations, status bar, etc.)

import type { StreakTierConfig, WarChatReaction, ConfettiConfig } from '@/types';

export const Colors = {
  // Victory Peak surface system (purple-tinted midnight void)
  surface: {
    DEFAULT: '#0c0c1f',       // Base layer (midnight void)
    container: '#17172f',      // Section layer
    containerLow: '#111127',   // Secondary sections
    containerHigh: '#1d1d37',  // Interactive cards
    containerHighest: '#23233f', // Active/elevated
    containerLowest: '#000000', // Recessed inputs
    bright: '#292948',         // Floating elements
    variant: '#23233f',        // Alternative grouping
    tint: '#ce96ff',           // Chromatic glow tint
    // Backward compat aliases
    raised: '#17172f',
    overlay: '#1d1d37',
    border: '#46465c',
  },
  text: {
    primary: '#e5e3ff',        // on-background (soft lavender)
    secondary: '#aaa8c3',      // on-surface-variant
    muted: '#74738b',          // outline
  },
  // Elixir Purple system
  primary: {
    DEFAULT: '#ce96ff',
    dim: '#a434ff',
    fixed: '#c583ff',
    fixedDim: '#bb6fff',
    container: '#c583ff',
    onPrimary: '#48007a',
  },
  // Victory Gold system
  secondary: {
    DEFAULT: '#ffd709',
    dim: '#efc900',
    fixed: '#ffd709',
    container: '#705d00',
    onSecondary: '#5b4b00',
  },
  // Battle Blue system
  tertiary: {
    DEFAULT: '#81ecff',
    dim: '#00d4ec',
    fixed: '#00e3fd',
    container: '#00e3fd',
    onTertiary: '#005762',
  },
  success: '#10B981',
  warning: '#ffd709',     // Same as secondary
  danger: '#ff6e84',      // Error
  info: '#81ecff',        // Same as tertiary
  error: {
    DEFAULT: '#ff6e84',
    dim: '#d73357',
    container: '#a70138',
  },
  outline: {
    DEFAULT: '#74738b',
    variant: '#46465c',
  },
  rank: {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#ffd709',       // Victory Gold
    platinum: '#E5E4E2',
    diamond: '#81ecff',    // Battle Blue
    champion: '#ff6e84',   // Error pink
  },
  // Keep brand for backward compat but point to primary
  brand: {
    DEFAULT: '#ce96ff',
    light: '#c583ff',
    dark: '#a434ff',
  },
} as const;

// ─── Spacing Scale ───────────────────────────────────────
// 4pt grid. Snap all margin/padding/gap to these values.
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  huge: 32,
  mega: 48,
} as const;

// ─── Border Radius Scale ─────────────────────────────────
// sm → badges/tags. md → buttons/inputs. lg → cards. xl → modals/sheets. pill → fully rounded.
export const Radius = {
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  pill: 999,
} as const;

// ─── Icon Size Scale ─────────────────────────────────────
// xs → inline decoration. sm → list rows. md → primary buttons/tabs. lg → hero CTAs. xl → feature icons.
export const IconSize = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
} as const;

// ─── Typography Scale ────────────────────────────────────
// Pair font family + size + letter spacing for consistent type.
export const Type = {
  label:    { fontFamily: 'Lexend-SemiBold',    fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  caption:  { fontFamily: 'BeVietnamPro-Regular', fontSize: 11, letterSpacing: 0 },
  body:     { fontFamily: 'BeVietnamPro-Regular', fontSize: 13, letterSpacing: 0 },
  bodyBold: { fontFamily: 'Lexend-SemiBold',    fontSize: 13, letterSpacing: 0 },
  title:    { fontFamily: 'Epilogue-Bold',      fontSize: 16, letterSpacing: 0 },
  heading:  { fontFamily: 'Epilogue-Bold',      fontSize: 22, letterSpacing: -0.3 },
  display:  { fontFamily: 'Epilogue-Bold',      fontSize: 30, letterSpacing: -0.5 },
  mono:     { fontFamily: 'SpaceMono',          fontSize: 13, letterSpacing: 0 },
} as const;

// ─── Elevation / Shadow Presets ──────────────────────────
// Use these instead of ad-hoc inline shadow objects. Includes iOS + Android.
import { Platform } from 'react-native';

const iosShadow = (color: string, opacity: number, radius: number, offsetY: number = 0) =>
  Platform.OS === 'ios'
    ? {
        shadowColor: color,
        shadowOpacity: opacity,
        shadowRadius: radius,
        shadowOffset: { width: 0, height: offsetY },
      }
    : { elevation: Math.round(radius / 2) };

export const Elevation = {
  // Subtle card — default resting state
  card:     iosShadow('#000000', 0.2, 8, 2),
  // Interactive floating element — modals, popovers, sheets
  floating: iosShadow('#000000', 0.35, 16, 4),
  // Hero CTA with brand glow
  hero:     iosShadow('#a434ff', 0.5, 20, 4),
  // Cyan accent glow for tertiary actions
  heroCyan: iosShadow('#81ecff', 0.4, 16, 0),
  // Purple subtle glow for selection states
  glowPurple: iosShadow('#ce96ff', 0.3, 12, 0),
  // Gold glow for trophy / premium actions
  glowGold: iosShadow('#ffd709', 0.4, 14, 0),
  // Danger glow for destructive confirmation
  glowDanger: iosShadow('#ff6e84', 0.35, 12, 0),
} as const;

export const Rank = {
  rookie: { label: 'Rookie', color: '#aaa8c3', minXp: 0 },
  iron: { label: 'Iron', color: '#8b8b8b', minXp: 1000 },
  bronze_plate: { label: 'Bronze Plate', color: '#cd7f32', minXp: 3000 },
  silver_plate: { label: 'Silver Plate', color: '#c0c0c0', minXp: 5000 },
  gold_plate: { label: 'Gold Plate', color: '#ffd700', minXp: 7000 },
  elite: { label: 'Elite', color: '#ce96ff', minXp: 12000 },
  champion: { label: 'Champion', color: '#ff6e84', minXp: 20000 },
  olympian: { label: 'Olympian', color: '#ffd709', minXp: 30000 },
} as const;

// ─── Arena System ────────────────────────────────────────

export type ArenaTier =
  | 'sweat_zone'
  | 'pump_room'
  | 'grindhouse'
  | 'rack_arena'
  | 'the_iron_yard'
  | 'barbell_pit'
  | 'plate_factory'
  | 'pr_chamber'
  | 'strength_circuit'
  | 'deadlift_den'
  | 'titan_training_grounds'
  | 'forge_of_strength'
  | 'arena_of_reps'
  | 'champions_floor'
  | 'iron_pantheon'
  | 'valhalla_barbell'
  | 'hall_of_ascension'
  | 'mount_olympus'
  | 'the_colosseum';

export const Arena: Record<
  ArenaTier,
  { label: string; accent: string; badge: string; emblem: string; minTrophies: number; description: string }
> = {
  sweat_zone: {
    label: 'Sweat Zone',
    accent: '#8B7355',
    badge: '💧',
    emblem: 'tint',
    minTrophies: 0,
    description: 'Every legend starts somewhere. Welcome to the grind.',
  },
  pump_room: {
    label: 'Pump Room',
    accent: '#A0896C',
    badge: '💪',
    emblem: 'hand-rock-o',
    minTrophies: 100,
    description: 'You found the pump. Now keep it flowing.',
  },
  grindhouse: {
    label: 'Grindhouse',
    accent: '#B0B0B0',
    badge: '⚙️',
    emblem: 'cog',
    minTrophies: 200,
    description: 'Day in, day out. The grind never lies.',
  },
  rack_arena: {
    label: 'Rack Arena',
    accent: '#C0C0C0',
    badge: '🏋️',
    emblem: 'cubes',
    minTrophies: 350,
    description: 'Step up to the rack. Prove you belong.',
  },
  the_iron_yard: {
    label: 'The Iron Yard',
    accent: '#A8A8A8',
    badge: '⚒️',
    emblem: 'industry',
    minTrophies: 500,
    description: 'Where iron meets willpower.',
  },
  barbell_pit: {
    label: 'Barbell Pit',
    accent: '#D4A84B',
    badge: '🔥',
    emblem: 'anchor',
    minTrophies: 650,
    description: 'Descend into the pit. Only the strong rise.',
  },
  plate_factory: {
    label: 'Plate Factory',
    accent: '#E0C068',
    badge: '🏭',
    emblem: 'cogs',
    minTrophies: 800,
    description: 'Stacking plates is your profession now.',
  },
  pr_chamber: {
    label: 'PR Chamber',
    accent: '#FFD700',
    badge: '📈',
    emblem: 'trophy',
    minTrophies: 1000,
    description: 'Personal records are forged in this chamber.',
  },
  strength_circuit: {
    label: 'Strength Circuit',
    accent: '#FFC107',
    badge: '⚡',
    emblem: 'bolt',
    minTrophies: 1200,
    description: 'Power surges through every rep.',
  },
  deadlift_den: {
    label: 'Deadlift Den',
    accent: '#FF9800',
    badge: '🐻',
    emblem: 'link',
    minTrophies: 1400,
    description: 'Heavy pulls and heavier resolve.',
  },
  titan_training_grounds: {
    label: 'Titan Training Grounds',
    accent: '#FF6D00',
    badge: '🏛️',
    emblem: 'shield',
    minTrophies: 1600,
    description: 'Train where titans once walked.',
  },
  forge_of_strength: {
    label: 'Forge of Strength',
    accent: '#FF5722',
    badge: '🔨',
    emblem: 'fire',
    minTrophies: 1850,
    description: 'Raw power hammered into perfection.',
  },
  arena_of_reps: {
    label: 'Arena of Reps',
    accent: '#E91E63',
    badge: '⚔️',
    emblem: 'refresh',
    minTrophies: 2100,
    description: 'Every rep is a battle won.',
  },
  champions_floor: {
    label: "Champion's Floor",
    accent: '#9C27B0',
    badge: '👑',
    emblem: 'star',
    minTrophies: 2400,
    description: 'Only champions set foot here.',
  },
  iron_pantheon: {
    label: 'Iron Pantheon',
    accent: '#7B1FA2',
    badge: '🏆',
    emblem: 'university',
    minTrophies: 2700,
    description: 'Ascend among the iron gods.',
  },
  valhalla_barbell: {
    label: 'Valhalla Barbell',
    accent: '#4A148C',
    badge: '⚡',
    emblem: 'bolt',
    minTrophies: 3000,
    description: 'The worthy are called to lift eternal.',
  },
  hall_of_ascension: {
    label: 'Hall of Ascension',
    accent: '#311B92',
    badge: '✨',
    emblem: 'arrow-up',
    minTrophies: 3400,
    description: 'Transcend your limits. Ascend beyond.',
  },
  mount_olympus: {
    label: 'Mount Olympus',
    accent: '#1A237E',
    badge: '🌩️',
    emblem: 'diamond',
    minTrophies: 3800,
    description: 'Where mortals become legends.',
  },
  the_colosseum: {
    label: 'The Colosseum',
    accent: '#FF6B6B',
    badge: '🏟️',
    emblem: 'building',
    minTrophies: 4200,
    description: 'The pinnacle. The crowd roars for you.',
  },
} as const;

/** Ordered list of arena tiers by descending trophy threshold for lookup. */
const ARENA_TIERS_DESC: readonly ArenaTier[] = (
  Object.entries(Arena) as [ArenaTier, (typeof Arena)[ArenaTier]][]
)
  .sort((a, b) => b[1].minTrophies - a[1].minTrophies)
  .map(([tier]) => tier);

export function getArenaTier(trophyRating: number): ArenaTier {
  for (const tier of ARENA_TIERS_DESC) {
    if (trophyRating >= Arena[tier].minTrophies) return tier;
  }
  return 'sweat_zone';
}

// ─── Trophy Rewards ──────────────────────────────────────

export const TrophyRewards = {
  ACCEPTED_WORKOUT: 12,
  LOW_CONFIDENCE_WORKOUT: 8,
  DAILY_GOAL_COMPLETE: 6,
  ACTIVE_RECOVERY: 4,
  CLAN_WAR_WIN: 30,
  CLAN_WAR_LOSS: -15,
  MISSED_DAY_DECAY: -5,
} as const;

// ─── Game Config ─────────────────────────────────────────

export const GameConfig = {
  /** Max streak bonus multiplier (15% at 30+ days) */
  MAX_STREAK_BONUS: 0.15,

  /** Days at which streak bonus maxes out */
  STREAK_MAX_DAYS: 30,

  /** Grace period: missed days before streak resets */
  STREAK_GRACE_DAYS: 1,

  /** Base participation bonus for completing any workout */
  PARTICIPATION_BONUS: 50,

  /** Per-user daily contribution cap for clan wars (diminishing returns threshold) */
  DAILY_CONTRIBUTION_CAP: 500,

  /** Diminishing returns factor after cap */
  DIMINISHING_RETURNS_FACTOR: 0.25,

  /** Per-user weekly contribution cap for clan wars (hard cap) */
  WEEKLY_CONTRIBUTION_CAP: 20000,

  /** Clan war score weights */
  WAR_WEIGHT_OUTPUT: 0.3,
  WAR_WEIGHT_PARTICIPATION: 0.3,
  WAR_WEIGHT_CONSISTENCY: 0.2,
  WAR_WEIGHT_DIVERSITY: 0.2,

  /** Max clan members */
  MAX_CLAN_MEMBERS: 30,

  /** Season duration in weeks */
  SEASON_DURATION_WEEKS: 10,

  /** 1RM plausibility: flag if new 1RM exceeds stored best by this factor */
  ONE_RM_PLAUSIBILITY_FACTOR: 1.25,

  /** Active recovery minimum duration in seconds */
  ACTIVE_RECOVERY_MIN_DURATION: 600,
} as const;

// ─── Streak Tiers ───────────────────────────────────────

export const StreakTiers: readonly StreakTierConfig[] = [
  { tier: 'ember',     minDays: 1,   label: 'Ember',     color: Colors.warning,       emoji: '🔥', pulseSpeed: 0,    glowRadius: 0 },
  { tier: 'torch',     minDays: 7,   label: 'Torch',     color: '#FF8C00',            emoji: '🔥', pulseSpeed: 2000, glowRadius: 2 },
  { tier: 'bonfire',   minDays: 14,  label: 'Bonfire',   color: '#FF6347',            emoji: '🔥', pulseSpeed: 1500, glowRadius: 4 },
  { tier: 'inferno',   minDays: 30,  label: 'Inferno',   color: Colors.danger,        emoji: '🔥', pulseSpeed: 1000, glowRadius: 6 },
  { tier: 'supernova', minDays: 60,  label: 'Supernova', color: '#FF1493',            emoji: '💥', pulseSpeed: 800,  glowRadius: 8 },
  { tier: 'eternal',   minDays: 100, label: 'Eternal',   color: '#00BFFF',            emoji: '💎', pulseSpeed: 600,  glowRadius: 10 },
] as const;

export function getStreakTier(days: number): StreakTierConfig {
  for (let i = StreakTiers.length - 1; i >= 0; i--) {
    if (days >= StreakTiers[i].minDays) return StreakTiers[i];
  }
  return StreakTiers[0];
}

// ─── Leaderboard Zone Colors ────────────────────────────

export const LeaderboardZoneColors = {
  promote: Colors.success,
  safe: Colors.text.muted,
  demote: Colors.danger,
} as const;

// ─── War Chat Reactions ─────────────────────────────────

export const WAR_CHAT_REACTIONS: Record<WarChatReaction, { emoji: string; label: string }> = {
  flex:     { emoji: '💪', label: 'Flex' },
  fire:     { emoji: '🔥', label: 'Fire' },
  trophy:   { emoji: '🏆', label: 'Trophy' },
  lets_go:  { emoji: '⚡', label: "Let's Go" },
  rest_day: { emoji: '😴', label: 'Rest Day' },
} as const;

// ─── Confetti Defaults ──────────────────────────────────

export const DEFAULT_CONFETTI: ConfettiConfig = {
  particleCount: 25,
  colors: ['#ffd709', '#ff6e84', '#81ecff', '#10B981', '#ce96ff'],
  duration: 2000,
  spread: 60,
} as const;
