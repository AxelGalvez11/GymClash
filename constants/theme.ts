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
