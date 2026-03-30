import { normalizeScore } from '@/lib/scoring/normalization';

describe('normalizeScore', () => {
  const populationMedian = 1000;

  it('returns raw score when no baseline and population median is 0', () => {
    expect(
      normalizeScore({ rawScore: 500, baseline: null, populationMedian: 0 })
    ).toBe(500);
  });

  it('uses population median as fallback when no baseline', () => {
    const result = normalizeScore({
      rawScore: 1000,
      baseline: null,
      populationMedian,
    });
    // raw matches median → relative component = 1.0
    // 1000 × 0.6 + (1.0 × 1000) × 0.4 = 600 + 400 = 1000
    expect(result).toBe(1000);
  });

  it('boosts relative component when performing above baseline', () => {
    const result = normalizeScore({
      rawScore: 1500,
      baseline: 1000,
      populationMedian,
    });
    // relative = 1500/1000 = 1.5
    // 1500 × 0.6 + (1.5 × 1000) × 0.4 = 900 + 600 = 1500
    expect(result).toBe(1500);
  });

  it('reduces relative component when performing below baseline', () => {
    const result = normalizeScore({
      rawScore: 500,
      baseline: 1000,
      populationMedian,
    });
    // relative = 500/1000 = 0.5 (at floor)
    // 500 × 0.6 + (0.5 × 1000) × 0.4 = 300 + 200 = 500
    expect(result).toBe(500);
  });

  it('clamps relative component at 2.0 for extreme overperformance', () => {
    const result = normalizeScore({
      rawScore: 5000,
      baseline: 1000,
      populationMedian,
    });
    // relative = 5000/1000 = 5.0 → clamped to 2.0
    // 5000 × 0.6 + (2.0 × 1000) × 0.4 = 3000 + 800 = 3800
    expect(result).toBe(3800);
  });

  it('ensures beginners contribute meaningfully relative to advanced users', () => {
    // Beginner: raw 200, no baseline
    const beginner = normalizeScore({
      rawScore: 200,
      baseline: null,
      populationMedian,
    });
    // Advanced: raw 3000, baseline 2500
    const advanced = normalizeScore({
      rawScore: 3000,
      baseline: 2500,
      populationMedian,
    });

    // Advanced should score higher, but beginner should get a meaningful score
    expect(advanced).toBeGreaterThan(beginner);
    expect(beginner).toBeGreaterThan(0);

    // Beginner's normalized score should be higher than raw due to relative component
    // raw 200, relative = 200/1000 = 0.5 (floored)
    // 200 × 0.6 + 0.5 × 1000 × 0.4 = 120 + 200 = 320
    expect(beginner).toBeGreaterThan(200);
  });
});
