import { calculateWilksCoefficient } from '@/lib/scoring/raw-score';

describe('calculateWilksCoefficient', () => {
  it('returns 1.0 when body weight is null', () => {
    expect(calculateWilksCoefficient(null, 'male')).toBe(1.0);
  });

  it('returns 1.0 when biological sex is null', () => {
    expect(calculateWilksCoefficient(80, null)).toBe(1.0);
  });

  it('returns 1.0 when biological sex is unknown', () => {
    expect(calculateWilksCoefficient(80, 'other')).toBe(1.0);
  });

  it('returns approximately 1.0 for baseline male weight (80kg)', () => {
    const coeff = calculateWilksCoefficient(80, 'male');
    expect(coeff).toBeGreaterThan(0.9);
    expect(coeff).toBeLessThan(1.1);
  });

  it('gives lighter lifters a higher multiplier (male)', () => {
    const light = calculateWilksCoefficient(60, 'male');
    const heavy = calculateWilksCoefficient(120, 'male');
    expect(light).toBeGreaterThan(heavy);
  });

  it('gives lighter lifters a higher multiplier (female)', () => {
    const light = calculateWilksCoefficient(50, 'female');
    const heavy = calculateWilksCoefficient(90, 'female');
    expect(light).toBeGreaterThan(heavy);
  });

  it('returns a value between 0.5 and 2.0', () => {
    const weights = [40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140];
    for (const w of weights) {
      const maleCoeff = calculateWilksCoefficient(w, 'male');
      const femaleCoeff = calculateWilksCoefficient(w, 'female');
      expect(maleCoeff).toBeGreaterThanOrEqual(0.5);
      expect(maleCoeff).toBeLessThanOrEqual(2.0);
      expect(femaleCoeff).toBeGreaterThanOrEqual(0.5);
      expect(femaleCoeff).toBeLessThanOrEqual(2.0);
    }
  });

  it('returns 1.0 for zero body weight', () => {
    expect(calculateWilksCoefficient(0, 'male')).toBe(1.0);
  });

  it('returns 1.0 for negative body weight', () => {
    expect(calculateWilksCoefficient(-70, 'male')).toBe(1.0);
  });
});
