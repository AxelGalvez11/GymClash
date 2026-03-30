import {
  calculateStrengthRawScore,
  calculateScoutRawScore,
  calculatePaceMultiplier,
} from '@/lib/scoring/raw-score';
import type { StrengthSet, RouteData } from '@/types';

describe('calculateStrengthRawScore', () => {
  it('calculates tonnage from a single exercise', () => {
    const sets: StrengthSet[] = [
      { exercise: 'Squat', sets: 3, reps: 5, weight_kg: 100 },
    ];
    // 3 × 5 × 100 = 1500
    expect(calculateStrengthRawScore(sets)).toBe(1500);
  });

  it('sums tonnage across multiple exercises', () => {
    const sets: StrengthSet[] = [
      { exercise: 'Squat', sets: 3, reps: 5, weight_kg: 100 },
      { exercise: 'Bench', sets: 3, reps: 8, weight_kg: 60 },
    ];
    // 1500 + 1440 = 2940
    expect(calculateStrengthRawScore(sets)).toBe(2940);
  });

  it('returns 0 for empty sets', () => {
    expect(calculateStrengthRawScore([])).toBe(0);
  });

  it('handles zero weight correctly', () => {
    const sets: StrengthSet[] = [
      { exercise: 'Bodyweight Squats', sets: 3, reps: 20, weight_kg: 0 },
    ];
    expect(calculateStrengthRawScore(sets)).toBe(0);
  });
});

describe('calculatePaceMultiplier', () => {
  it('returns 1.0 for base pace of 6:00/km', () => {
    expect(calculatePaceMultiplier(6.0)).toBe(1.0);
  });

  it('returns higher multiplier for faster paces', () => {
    const result = calculatePaceMultiplier(4.0);
    expect(result).toBeGreaterThan(1.0);
    expect(result).toBe(1.5); // 6/4 = 1.5 (at cap)
  });

  it('caps at 1.5 for very fast paces', () => {
    expect(calculatePaceMultiplier(2.0)).toBe(1.5); // clamped to 3.0 min → 6/3 = 2.0, capped to 1.5
  });

  it('returns lower multiplier for slower paces', () => {
    const result = calculatePaceMultiplier(8.0);
    expect(result).toBeLessThan(1.0);
    expect(result).toBe(0.75); // 6/8 = 0.75
  });

  it('floors at 0.5 for very slow paces', () => {
    expect(calculatePaceMultiplier(15.0)).toBe(0.5); // 6/15 = 0.4, floored to 0.5
  });
});

describe('calculateScoutRawScore', () => {
  it('calculates score for a standard 5km run', () => {
    const route: RouteData = {
      distance_km: 5,
      avg_pace_min_per_km: 6.0,
      elevation_gain_m: 50,
    };
    // 5 × 1.0 × 100 = 500
    expect(calculateScoutRawScore(route)).toBe(500);
  });

  it('rewards faster runners with higher scores', () => {
    const fast: RouteData = {
      distance_km: 5,
      avg_pace_min_per_km: 4.0,
      elevation_gain_m: 50,
    };
    const slow: RouteData = {
      distance_km: 5,
      avg_pace_min_per_km: 8.0,
      elevation_gain_m: 50,
    };
    expect(calculateScoutRawScore(fast)).toBeGreaterThan(
      calculateScoutRawScore(slow)
    );
  });

  it('rewards longer distances more than faster paces', () => {
    const long_slow: RouteData = {
      distance_km: 10,
      avg_pace_min_per_km: 7.0,
      elevation_gain_m: 100,
    };
    const short_fast: RouteData = {
      distance_km: 3,
      avg_pace_min_per_km: 4.0,
      elevation_gain_m: 30,
    };
    // 10 × (6/7) × 100 = 857 vs 3 × 1.5 × 100 = 450
    expect(calculateScoutRawScore(long_slow)).toBeGreaterThan(
      calculateScoutRawScore(short_fast)
    );
  });
});
