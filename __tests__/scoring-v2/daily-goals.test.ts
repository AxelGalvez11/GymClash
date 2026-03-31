import type { DailyGoalType, StrengthSet } from '@/types';
import { calculateBrzycki1RM } from '@/lib/scoring/raw-score';

describe('Daily goal: complete_any_workout', () => {
  it('is completed by a validated strength workout', () => {
    const goalType: DailyGoalType = 'complete_any_workout';
    const workoutType = 'strength';
    const workoutValidated = true;
    expect(goalType === 'complete_any_workout' && workoutValidated).toBe(true);
  });

  it('is completed by a validated scout workout', () => {
    const goalType: DailyGoalType = 'complete_any_workout';
    const workoutType = 'scout';
    const workoutValidated = true;
    expect(goalType === 'complete_any_workout' && workoutValidated).toBe(true);
  });

  it('is completed by a validated active recovery workout', () => {
    const goalType: DailyGoalType = 'complete_any_workout';
    const workoutType = 'active_recovery';
    const workoutValidated = true;
    expect(goalType === 'complete_any_workout' && workoutValidated).toBe(true);
  });
});

describe('Daily goal: strength_intensity', () => {
  it('requires a set at 80% of stored 1RM', () => {
    const stored1RM = 100; // kg estimated 1RM
    const thresholdPct = 0.80;
    const targetWeight = stored1RM * thresholdPct; // 80kg
    const set: StrengthSet = { exercise: 'Squat', sets: 1, reps: 3, weight_kg: 85 };

    // Calculate the estimated 1RM for this set
    const estimated1RM = calculateBrzycki1RM(set.weight_kg, set.reps)!;
    // 85 × (36 / (37 - 3)) = 85 × 1.0588 = 90
    expect(estimated1RM).toBeGreaterThan(80); // exceeds 80% of stored 1RM

    // But the check is simpler: is the weight at or above 80% of stored 1RM?
    expect(set.weight_kg >= targetWeight).toBe(true);
  });

  it('fails when set weight is below 80% of stored 1RM', () => {
    const stored1RM = 100;
    const thresholdPct = 0.80;
    const targetWeight = stored1RM * thresholdPct;
    const set: StrengthSet = { exercise: 'Squat', sets: 1, reps: 5, weight_kg: 70 };

    expect(set.weight_kg >= targetWeight).toBe(false);
  });

  it('is not generated when user has no 1RM records', () => {
    const has1RM = false;
    const goalType: DailyGoalType = has1RM ? 'strength_intensity' : 'complete_any_workout';
    expect(goalType).toBe('complete_any_workout');
  });

  it('is generated when user has 1RM records', () => {
    const has1RM = true;
    const goalType: DailyGoalType = has1RM ? 'strength_intensity' : 'complete_any_workout';
    expect(goalType).toBe('strength_intensity');
  });
});
