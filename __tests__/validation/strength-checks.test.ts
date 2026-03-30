import {
  checkTonnagePlausibility,
  checkWorkoutDensity,
  checkRestIntervals,
  checkTonnageSpike,
  validateStrengthWorkout,
} from '@/lib/validation/strength-checks';
import type { StrengthSet } from '@/types';

const normalSets: StrengthSet[] = [
  { exercise: 'Squat', sets: 4, reps: 5, weight_kg: 100 },
  { exercise: 'Bench', sets: 3, reps: 8, weight_kg: 80 },
  { exercise: 'Row', sets: 3, reps: 8, weight_kg: 70 },
];

describe('checkTonnagePlausibility', () => {
  it('passes for normal workout tonnage', () => {
    const result = checkTonnagePlausibility(normalSets);
    expect(result.passed).toBe(true);
  });

  it('fails for impossible tonnage', () => {
    const absurdSets: StrengthSet[] = [
      { exercise: 'Squat', sets: 100, reps: 100, weight_kg: 200 },
    ];
    // 100 × 100 × 200 = 2,000,000 kg
    const result = checkTonnagePlausibility(absurdSets);
    expect(result.passed).toBe(false);
    expect(result.reason_code).toBe('tonnage_spike');
  });
});

describe('checkWorkoutDensity', () => {
  it('passes for normal workout duration', () => {
    // 10 total sets in 60 min = 10 sets/hour
    const result = checkWorkoutDensity(normalSets, 3600);
    expect(result.passed).toBe(true);
  });

  it('fails for impossibly dense workout', () => {
    const denseSets: StrengthSet[] = [
      { exercise: 'Squat', sets: 20, reps: 5, weight_kg: 100 },
      { exercise: 'Bench', sets: 20, reps: 8, weight_kg: 80 },
      { exercise: 'Deadlift', sets: 20, reps: 5, weight_kg: 120 },
    ];
    // 60 sets in 30 min = 120 sets/hour
    const result = checkWorkoutDensity(denseSets, 1800);
    expect(result.passed).toBe(false);
    expect(result.reason_code).toBe('impossible_density');
  });
});

describe('checkRestIntervals', () => {
  it('passes for reasonable rest periods', () => {
    // 10 total sets, 60 min → plenty of rest
    const result = checkRestIntervals(normalSets, 3600);
    expect(result.passed).toBe(true);
  });

  it('fails for impossibly short rest', () => {
    const manySets: StrengthSet[] = [
      { exercise: 'Squat', sets: 10, reps: 5, weight_kg: 100 },
    ];
    // 10 sets in 5 min → ~0s rest
    const result = checkRestIntervals(manySets, 300);
    expect(result.passed).toBe(false);
    expect(result.reason_code).toBe('impossible_rest');
  });

  it('passes for single set (no rest needed)', () => {
    const singleSet: StrengthSet[] = [
      { exercise: 'Deadlift', sets: 1, reps: 1, weight_kg: 200 },
    ];
    const result = checkRestIntervals(singleSet, 60);
    expect(result.passed).toBe(true);
  });
});

describe('checkTonnageSpike', () => {
  it('passes when no baseline is available', () => {
    const result = checkTonnageSpike(normalSets, null);
    expect(result.passed).toBe(true);
  });

  it('passes for moderate increase over baseline', () => {
    // Normal tonnage: 4×5×100 + 3×8×80 + 3×8×70 = 2000 + 1920 + 1680 = 5600
    const result = checkTonnageSpike(normalSets, 4000);
    // 5600 / 4000 = 1.4 → under 2.0 threshold
    expect(result.passed).toBe(true);
  });

  it('fails for extreme spike over baseline', () => {
    const heavySets: StrengthSet[] = [
      { exercise: 'Squat', sets: 10, reps: 10, weight_kg: 150 },
    ];
    // 15000 vs baseline 3000 → ratio 5.0
    const result = checkTonnageSpike(heavySets, 3000);
    expect(result.passed).toBe(false);
    expect(result.reason_code).toBe('tonnage_spike');
  });
});

describe('validateStrengthWorkout', () => {
  it('returns all clean for a legitimate workout', () => {
    const results = validateStrengthWorkout(normalSets, 3600, 5000);
    expect(results.every((r) => r.passed)).toBe(true);
    expect(results.length).toBe(4);
  });

  it('catches multiple issues for suspicious workout', () => {
    const suspiciousSets: StrengthSet[] = [
      { exercise: 'Squat', sets: 30, reps: 10, weight_kg: 200 },
    ];
    // 60,000 kg tonnage in 15 min
    const results = validateStrengthWorkout(suspiciousSets, 900, 3000);
    const failures = results.filter((r) => !r.passed);
    expect(failures.length).toBeGreaterThanOrEqual(2);
  });
});
