import { GameConfig } from '@/constants/theme';
import type { ScoreModifiers } from '@/types';

/**
 * Calculate streak bonus.
 * Ramps linearly from 0% at day 0 to MAX_STREAK_BONUS at STREAK_MAX_DAYS.
 * Rewards consistency without being punitive — missing one day doesn't destroy progress.
 */
export function calculateStreakBonus(currentStreak: number): number {
  const clampedStreak = Math.min(
    Math.max(currentStreak, 0),
    GameConfig.STREAK_MAX_DAYS
  );
  return (clampedStreak / GameConfig.STREAK_MAX_DAYS) * GameConfig.MAX_STREAK_BONUS;
}

/**
 * Calculate participation bonus.
 * Fixed bonus for completing any valid workout. Ensures beginners
 * who show up consistently contribute meaningfully even with low raw scores.
 */
export function calculateParticipationBonus(): number {
  return GameConfig.PARTICIPATION_BONUS;
}

/**
 * Build the full modifiers object for a scored workout.
 */
export function buildModifiers(
  currentStreak: number,
  confidenceScore: number
): ScoreModifiers {
  return {
    streak_bonus: calculateStreakBonus(currentStreak),
    participation_bonus: calculateParticipationBonus(),
    confidence_multiplier: Math.max(0, Math.min(1, confidenceScore)),
  };
}

/**
 * Apply modifiers to a raw score to produce the final score.
 *
 * final = (raw + participation) × (1 + streak_bonus) × confidence_multiplier
 *
 * - Participation bonus is additive (ensures floor contribution)
 * - Streak bonus is multiplicative (rewards consistency proportionally)
 * - Confidence multiplier scales the whole result (anti-cheat gate)
 */
export function applyModifiers(
  rawScore: number,
  modifiers: ScoreModifiers
): number {
  const withParticipation = rawScore + modifiers.participation_bonus;
  const withStreak = withParticipation * (1 + modifiers.streak_bonus);
  const withConfidence = withStreak * modifiers.confidence_multiplier;
  return Math.round(withConfidence * 100) / 100;
}
