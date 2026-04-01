// Theme tokens — single source of truth for design values.
// NativeWind handles most styling via Tailwind classes in tailwind.config.js.
// These constants are for programmatic use (charts, animations, status bar, etc.)

export const Colors = {
  /** Brand/accent — use useAccent() for the dynamic user-selected accent. */
  brand: {
    DEFAULT: '#8B5CF6',
    light: '#A78BFA',
    dark: '#6D28D9',
  },
  rank: {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
    champion: '#FF6B6B',
  },
  /** Black-first surface system — no purple tint. */
  surface: {
    DEFAULT: '#0A0A0A',
    raised: '#141414',
    overlay: '#1C1C1C',
    border: '#2A2A2A',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    muted: '#666666',
  },
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
} as const;

export const Rank = {
  rookie: { label: 'Rookie', color: Colors.rank.bronze, minXp: 0 },
  iron: { label: 'Iron', color: Colors.rank.silver, minXp: 1000 },
  steel: { label: 'Steel', color: Colors.rank.gold, minXp: 3000 },
  titan: { label: 'Titan', color: Colors.rank.platinum, minXp: 7000 },
  apex: { label: 'Apex', color: Colors.rank.diamond, minXp: 15000 },
  demon_slayer: { label: 'Demon Slayer', color: Colors.rank.champion, minXp: 30000 },
} as const;

// ─── Arena System ────────────────────────────────────────

export type ArenaTier = 'rustyard' | 'iron_forge' | 'titan_vault' | 'apex_colosseum';

export const Arena: Record<
  ArenaTier,
  { label: string; accent: string; badge: string; minTrophies: number }
> = {
  rustyard: {
    label: 'Rustyard',
    accent: '#8B7355',
    badge: '🔩',
    minTrophies: 0,
  },
  iron_forge: {
    label: 'Iron Forge',
    accent: '#C0C0C0',
    badge: '⚒️',
    minTrophies: 300,
  },
  titan_vault: {
    label: 'Titan Vault',
    accent: '#FFD700',
    badge: '🏛️',
    minTrophies: 700,
  },
  apex_colosseum: {
    label: 'Apex Colosseum',
    accent: '#FF6B6B',
    badge: '🏆',
    minTrophies: 1200,
  },
} as const;

export function getArenaTier(trophyRating: number): ArenaTier {
  if (trophyRating >= 1200) return 'apex_colosseum';
  if (trophyRating >= 700) return 'titan_vault';
  if (trophyRating >= 300) return 'iron_forge';
  return 'rustyard';
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
