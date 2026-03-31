import {
  calculateStrengthRawScore,
  calculateStrengthRawScoreLegacy,
  getSetMultiplier,
} from '@/lib/scoring/raw-score';
import type { StrengthSet } from '@/types';

describe('getSetMultiplier', () => {
  it('returns 1.0 for sets 1-5 (indices 0-4)', () => {
    expect(getSetMultiplier(0)).toBe(1.0);
    expect(getSetMultiplier(4)).toBe(1.0);
  });

  it('returns 0.5 for sets 6-10 (indices 5-9)', () => {
    expect(getSetMultiplier(5)).toBe(0.5);
    expect(getSetMultiplier(9)).toBe(0.5);
  });

  it('returns 0.1 for sets 11+ (indices 10+)', () => {
    expect(getSetMultiplier(10)).toBe(0.1);
    expect(getSetMultiplier(20)).toBe(0.1);
  });
});

describe('calculateStrengthRawScore (diminishing volume)', () => {
  it('scores 5 or fewer sets per exercise at full value', () => {
    const sets: StrengthSet[] = [
      { exercise: 'Squat', sets: 3, reps: 5, weight_kg: 100 },
    ];
    // 3 sets × 5 reps × 100kg = 1500 (all at 1.0x)
    expect(calculateStrengthRawScore(sets)).toBe(1500);
  });

  it('applies 0.5x to sets 6-10 per exercise', () => {
    const sets: StrengthSet[] = [
      { exercise: 'Squat', sets: 7, reps: 5, weight_kg: 100 },
    ];
    // Sets 1-5: 5 × 500 × 1.0 = 2500
    // Sets 6-7: 2 × 500 × 0.5 = 500
    // Total: 3000
    expect(calculateStrengthRawScore(sets)).toBe(3000);
  });

  it('applies 0.1x to sets 11+ per exercise', () => {
    const sets: StrengthSet[] = [
      { exercise: 'Squat', sets: 12, reps: 5, weight_kg: 100 },
    ];
    // Sets 1-5: 5 × 500 × 1.0 = 2500
    // Sets 6-10: 5 × 500 × 0.5 = 1250
    // Sets 11-12: 2 × 500 × 0.1 = 100
    // Total: 3850
    expect(calculateStrengthRawScore(sets)).toBe(3850);
  });

  it('tracks set count per exercise independently', () => {
    const sets: StrengthSet[] = [
      { exercise: 'Squat', sets: 5, reps: 5, weight_kg: 100 },
      { exercise: 'Bench', sets: 5, reps: 5, weight_kg: 60 },
    ];
    // Squat: 5 × 500 × 1.0 = 2500
    // Bench: 5 × 300 × 1.0 = 1500 (resets for new exercise)
    // Total: 4000
    expect(calculateStrengthRawScore(sets)).toBe(4000);
  });

  it('accumulates set count across multiple entries for same exercise', () => {
    const sets: StrengthSet[] = [
      { exercise: 'Squat', sets: 4, reps: 5, weight_kg: 100 },
      { exercise: 'Squat', sets: 4, reps: 5, weight_kg: 100 },
    ];
    // Entry 1: sets 1-4 at 1.0x → 4 × 500 = 2000
    // Entry 2: set 5 at 1.0x → 500, sets 6-8 at 0.5x → 3 × 250 = 750
    // Total: 3250
    expect(calculateStrengthRawScore(sets)).toBe(3250);
  });

  it('is always less than or equal to legacy scoring', () => {
    const sets: StrengthSet[] = [
      { exercise: 'Squat', sets: 10, reps: 5, weight_kg: 100 },
    ];
    const diminishing = calculateStrengthRawScore(sets);
    const legacy = calculateStrengthRawScoreLegacy(sets);
    expect(diminishing).toBeLessThanOrEqual(legacy);
  });

  it('equals legacy scoring for 5 or fewer sets', () => {
    const sets: StrengthSet[] = [
      { exercise: 'Squat', sets: 3, reps: 5, weight_kg: 100 },
      { exercise: 'Bench', sets: 3, reps: 8, weight_kg: 60 },
    ];
    expect(calculateStrengthRawScore(sets)).toBe(
      calculateStrengthRawScoreLegacy(sets)
    );
  });

  it('handles empty sets', () => {
    expect(calculateStrengthRawScore([])).toBe(0);
  });
});
