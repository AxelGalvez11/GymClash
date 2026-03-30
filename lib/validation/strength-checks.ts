import type { StrengthSet, ValidationResult } from '@/types';

/** Maximum plausible tonnage for a single session (kg) */
const MAX_SESSION_TONNAGE = 50000;

/** Maximum sets per hour that a human can realistically complete */
const MAX_SETS_PER_HOUR = 40;

/** Minimum rest between heavy sets in seconds */
const MIN_REST_SECONDS = 15;

/**
 * Check if the total tonnage is within plausible bounds.
 */
export function checkTonnagePlausibility(
  sets: readonly StrengthSet[]
): ValidationResult {
  const totalTonnage = sets.reduce(
    (sum, s) => sum + s.sets * s.reps * s.weight_kg,
    0
  );

  const passed = totalTonnage <= MAX_SESSION_TONNAGE;

  return {
    validation_type: 'strength_tonnage_check',
    passed,
    confidence_impact: passed ? 0 : -0.7,
    reason_code: passed ? 'clean' : 'tonnage_spike',
    details: {
      total_tonnage_kg: totalTonnage,
      threshold_kg: MAX_SESSION_TONNAGE,
    },
  };
}

/**
 * Check if the workout density (sets per time) is physically possible.
 */
export function checkWorkoutDensity(
  sets: readonly StrengthSet[],
  durationSeconds: number
): ValidationResult {
  const totalSets = sets.reduce((sum, s) => sum + s.sets, 0);
  const durationHours = durationSeconds / 3600;
  const setsPerHour = durationHours > 0 ? totalSets / durationHours : 0;

  const passed = setsPerHour <= MAX_SETS_PER_HOUR;

  return {
    validation_type: 'strength_density_check',
    passed,
    confidence_impact: passed ? 0 : -0.6,
    reason_code: passed ? 'clean' : 'impossible_density',
    details: {
      total_sets: totalSets,
      duration_hours: Math.round(durationHours * 100) / 100,
      sets_per_hour: Math.round(setsPerHour * 100) / 100,
      threshold: MAX_SETS_PER_HOUR,
    },
  };
}

/**
 * Check if rest intervals are plausible given the number of sets and duration.
 */
export function checkRestIntervals(
  sets: readonly StrengthSet[],
  durationSeconds: number
): ValidationResult {
  const totalSets = sets.reduce((sum, s) => sum + s.sets, 0);

  if (totalSets <= 1) {
    return {
      validation_type: 'strength_rest_check',
      passed: true,
      confidence_impact: 0,
      reason_code: 'clean',
      details: { reason: 'single_set_no_rest_needed' },
    };
  }

  // Estimate time per set (assume ~30s per set for lifting)
  const estimatedLiftingTime = totalSets * 30;
  const availableRestTime = durationSeconds - estimatedLiftingTime;
  const avgRestPerSet =
    totalSets > 1 ? availableRestTime / (totalSets - 1) : 0;

  const passed = avgRestPerSet >= MIN_REST_SECONDS;

  return {
    validation_type: 'strength_rest_check',
    passed,
    confidence_impact: passed ? 0 : -0.5,
    reason_code: passed ? 'clean' : 'impossible_rest',
    details: {
      avg_rest_seconds: Math.round(avgRestPerSet),
      min_required: MIN_REST_SECONDS,
      total_sets: totalSets,
    },
  };
}

/**
 * Check if a workout represents a suspicious tonnage spike
 * relative to the user's recent average.
 */
export function checkTonnageSpike(
  sets: readonly StrengthSet[],
  recentAverageTonnage: number | null
): ValidationResult {
  if (recentAverageTonnage === null || recentAverageTonnage <= 0) {
    return {
      validation_type: 'strength_tonnage_spike',
      passed: true,
      confidence_impact: 0,
      reason_code: 'clean',
      details: { reason: 'no_baseline_available' },
    };
  }

  const currentTonnage = sets.reduce(
    (sum, s) => sum + s.sets * s.reps * s.weight_kg,
    0
  );

  const ratio = currentTonnage / recentAverageTonnage;
  // Flag if more than 200% of recent average
  const passed = ratio <= 2.0;

  return {
    validation_type: 'strength_tonnage_spike',
    passed,
    confidence_impact: passed ? 0 : -0.4,
    reason_code: passed ? 'clean' : 'tonnage_spike',
    details: {
      current_tonnage: currentTonnage,
      recent_average: recentAverageTonnage,
      ratio: Math.round(ratio * 100) / 100,
      threshold_ratio: 2.0,
    },
  };
}

/**
 * Run all strength validation checks.
 */
export function validateStrengthWorkout(
  sets: readonly StrengthSet[],
  durationSeconds: number,
  recentAverageTonnage: number | null
): readonly ValidationResult[] {
  return [
    checkTonnagePlausibility(sets),
    checkWorkoutDensity(sets, durationSeconds),
    checkRestIntervals(sets, durationSeconds),
    checkTonnageSpike(sets, recentAverageTonnage),
  ];
}
