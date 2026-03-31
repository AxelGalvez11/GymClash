import { calculateBrzycki1RM } from '@/lib/scoring/raw-score';
import { GameConfig } from '@/constants/theme';

describe('1RM plausibility check (125% rule)', () => {
  const PLAUSIBILITY_FACTOR = GameConfig.ONE_RM_PLAUSIBILITY_FACTOR;

  it('uses 1.25 as the plausibility factor', () => {
    expect(PLAUSIBILITY_FACTOR).toBe(1.25);
  });

  it('passes when new 1RM is within 125% of stored best', () => {
    const stored1RM = 100;
    const newSet = { weight_kg: 110, reps: 3 };
    const estimated = calculateBrzycki1RM(newSet.weight_kg, newSet.reps)!;
    // 110 × (36/34) = 116.47

    const isSuspicious = estimated > stored1RM * PLAUSIBILITY_FACTOR; // 125
    expect(isSuspicious).toBe(false);
  });

  it('flags when new 1RM exceeds 125% of stored best', () => {
    const stored1RM = 100;
    const newSet = { weight_kg: 130, reps: 3 };
    const estimated = calculateBrzycki1RM(newSet.weight_kg, newSet.reps)!;
    // 130 × (36/34) = 137.65

    const isSuspicious = estimated > stored1RM * PLAUSIBILITY_FACTOR; // 125
    expect(isSuspicious).toBe(true);
  });

  it('does not flag when there is no stored 1RM', () => {
    const stored1RM: number | null = null;
    const newSet = { weight_kg: 200, reps: 1 };
    const estimated = calculateBrzycki1RM(newSet.weight_kg, newSet.reps)!;

    // No stored 1RM → cannot be suspicious
    const isSuspicious = stored1RM !== null && estimated > stored1RM * PLAUSIBILITY_FACTOR;
    expect(isSuspicious).toBe(false);
  });

  it('handles edge case of exactly 125%', () => {
    const stored1RM = 100;
    const exactThreshold = stored1RM * PLAUSIBILITY_FACTOR; // 125
    // Not suspicious at exactly the threshold (strictly greater than)
    const isSuspicious = exactThreshold > stored1RM * PLAUSIBILITY_FACTOR;
    expect(isSuspicious).toBe(false);
  });
});
