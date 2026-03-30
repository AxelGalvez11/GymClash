import {
  calculateStreakBonus,
  calculateParticipationBonus,
  applyModifiers,
  buildModifiers,
} from '@/lib/scoring/modifiers';
import { GameConfig } from '@/constants/theme';
import type { ScoreModifiers } from '@/types';

describe('calculateStreakBonus', () => {
  it('returns 0 for no streak', () => {
    expect(calculateStreakBonus(0)).toBe(0);
  });

  it('returns proportional bonus for mid-range streak', () => {
    // 15 days = 50% of max
    const bonus = calculateStreakBonus(15);
    expect(bonus).toBeCloseTo(GameConfig.MAX_STREAK_BONUS / 2);
  });

  it('caps at MAX_STREAK_BONUS', () => {
    expect(calculateStreakBonus(30)).toBe(GameConfig.MAX_STREAK_BONUS);
    expect(calculateStreakBonus(100)).toBe(GameConfig.MAX_STREAK_BONUS);
  });

  it('handles negative streak gracefully', () => {
    expect(calculateStreakBonus(-5)).toBe(0);
  });
});

describe('calculateParticipationBonus', () => {
  it('returns the fixed participation bonus', () => {
    expect(calculateParticipationBonus()).toBe(GameConfig.PARTICIPATION_BONUS);
  });
});

describe('buildModifiers', () => {
  it('builds modifiers with correct fields', () => {
    const mods = buildModifiers(7, 0.9);
    expect(mods.streak_bonus).toBeGreaterThan(0);
    expect(mods.participation_bonus).toBe(GameConfig.PARTICIPATION_BONUS);
    expect(mods.confidence_multiplier).toBe(0.9);
  });

  it('clamps confidence to 0-1 range', () => {
    const tooHigh = buildModifiers(0, 1.5);
    expect(tooHigh.confidence_multiplier).toBe(1);

    const tooLow = buildModifiers(0, -0.5);
    expect(tooLow.confidence_multiplier).toBe(0);
  });
});

describe('applyModifiers', () => {
  it('applies all modifiers correctly', () => {
    const modifiers: ScoreModifiers = {
      streak_bonus: 0.1,
      participation_bonus: 50,
      confidence_multiplier: 1.0,
    };
    // (1000 + 50) × 1.1 × 1.0 = 1155
    expect(applyModifiers(1000, modifiers)).toBe(1155);
  });

  it('zero confidence results in zero score', () => {
    const modifiers: ScoreModifiers = {
      streak_bonus: 0.15,
      participation_bonus: 50,
      confidence_multiplier: 0,
    };
    expect(applyModifiers(1000, modifiers)).toBe(0);
  });

  it('participation bonus ensures beginners get meaningful scores', () => {
    const modifiers: ScoreModifiers = {
      streak_bonus: 0,
      participation_bonus: 50,
      confidence_multiplier: 1.0,
    };
    // Even with raw score of 10 (very light workout), final score = 60
    expect(applyModifiers(10, modifiers)).toBe(60);
  });

  it('streak bonus amplifies stronger workouts more', () => {
    const withStreak: ScoreModifiers = {
      streak_bonus: 0.15,
      participation_bonus: 50,
      confidence_multiplier: 1.0,
    };
    const withoutStreak: ScoreModifiers = {
      streak_bonus: 0,
      participation_bonus: 50,
      confidence_multiplier: 1.0,
    };

    const bigWorkout = 2000;
    const smallWorkout = 100;

    const bigDiff =
      applyModifiers(bigWorkout, withStreak) -
      applyModifiers(bigWorkout, withoutStreak);
    const smallDiff =
      applyModifiers(smallWorkout, withStreak) -
      applyModifiers(smallWorkout, withoutStreak);

    // Streak bonus benefits larger workouts more (multiplicative)
    expect(bigDiff).toBeGreaterThan(smallDiff);
  });
});
