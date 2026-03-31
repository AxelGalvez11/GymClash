import { calculateBrzycki1RM } from '@/lib/scoring/raw-score';

describe('calculateBrzycki1RM', () => {
  it('returns weight itself for 1 rep', () => {
    expect(calculateBrzycki1RM(100, 1)).toBe(100);
  });

  it('estimates 1RM correctly for standard rep ranges', () => {
    // 100kg × 5 reps → 100 × (36 / (37-5)) = 100 × 1.125 = 112.5
    expect(calculateBrzycki1RM(100, 5)).toBe(112.5);
  });

  it('estimates higher 1RM for more reps at same weight', () => {
    const fiveRep = calculateBrzycki1RM(100, 5)!;
    const eightRep = calculateBrzycki1RM(100, 8)!;
    expect(eightRep).toBeGreaterThan(fiveRep);
  });

  it('returns null for reps > 10', () => {
    expect(calculateBrzycki1RM(100, 11)).toBeNull();
    expect(calculateBrzycki1RM(100, 20)).toBeNull();
  });

  it('returns null for reps < 1', () => {
    expect(calculateBrzycki1RM(100, 0)).toBeNull();
    expect(calculateBrzycki1RM(100, -1)).toBeNull();
  });

  it('returns null for zero or negative weight', () => {
    expect(calculateBrzycki1RM(0, 5)).toBeNull();
    expect(calculateBrzycki1RM(-50, 5)).toBeNull();
  });

  it('produces reasonable 1RM estimates', () => {
    // A 5RM of 100kg should estimate roughly 112-113kg 1RM
    const result = calculateBrzycki1RM(100, 5)!;
    expect(result).toBeGreaterThan(110);
    expect(result).toBeLessThan(115);

    // A 10RM of 100kg should estimate roughly 133kg 1RM
    const tenRep = calculateBrzycki1RM(100, 10)!;
    expect(tenRep).toBeGreaterThan(130);
    expect(tenRep).toBeLessThan(140);
  });
});
