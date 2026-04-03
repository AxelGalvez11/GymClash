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
 * Check if any set exceeds 125% of the user's logged one-rep max for that exercise.
 */
export function check1RMPlausibility(
  sets: readonly StrengthSet[],
  oneRepMaxRecords: Record<string, number> | null
): ValidationResult {
  if (!oneRepMaxRecords || Object.keys(oneRepMaxRecords).length === 0) {
    return {
      validation_type: 'strength_1rm_check',
      passed: true,
      confidence_impact: 0,
      reason_code: 'clean',
      details: { reason: 'no_1rm_data' },
    };
  }

  const violations: string[] = [];
  for (const s of sets) {
    const max = oneRepMaxRecords[s.exercise];
    if (max && s.weight_kg > max * 1.25) {
      violations.push(
        `${s.exercise}: ${s.weight_kg}kg exceeds 125% of 1RM (${max}kg)`
      );
    }
  }

  const passed = violations.length === 0;

  return {
    validation_type: 'strength_1rm_check',
    passed,
    confidence_impact: passed ? 0 : -0.5,
    reason_code: passed ? 'clean' : '1rm_exceeded',
    details: { violations, threshold_percent: 125 },
  };
}

/**
 * Validate that reps are physiologically plausible given the weight-to-1RM ratio.
 * At 90%+ 1RM more than 5 reps is implausible; at 80%+ more than 12 reps is implausible.
 */
export function checkRepPlausibility(
  sets: readonly StrengthSet[],
  oneRepMaxRecords: Record<string, number> | null
): ValidationResult {
  if (!oneRepMaxRecords || Object.keys(oneRepMaxRecords).length === 0) {
    return {
      validation_type: 'strength_rep_plausibility',
      passed: true,
      confidence_impact: 0,
      reason_code: 'clean',
      details: { reason: 'no_1rm_data' },
    };
  }

  const violations: string[] = [];
  for (const s of sets) {
    const max = oneRepMaxRecords[s.exercise];
    if (!max || max <= 0) continue;
    const percentOf1RM = s.weight_kg / max;
    // At 90%+ 1RM, more than 5 reps is physiologically implausible
    // At 80%+ 1RM, more than 12 reps is implausible
    if (percentOf1RM >= 0.9 && s.reps > 5) {
      violations.push(
        `${s.exercise}: ${s.reps} reps at ${Math.round(percentOf1RM * 100)}% 1RM`
      );
    } else if (percentOf1RM >= 0.8 && s.reps > 12) {
      violations.push(
        `${s.exercise}: ${s.reps} reps at ${Math.round(percentOf1RM * 100)}% 1RM`
      );
    }
  }

  const passed = violations.length === 0;

  return {
    validation_type: 'strength_rep_plausibility',
    passed,
    confidence_impact: passed ? 0 : -0.4,
    reason_code: passed ? 'clean' : 'implausible_reps',
    details: { violations },
  };
}

/**
 * Flag exercises where the current weight exceeds last week's max by more than 10%.
 */
export function checkWeekOverWeekProgression(
  sets: readonly StrengthSet[],
  previousWeekMaxes: Record<string, number> | null
): ValidationResult {
  if (!previousWeekMaxes || Object.keys(previousWeekMaxes).length === 0) {
    return {
      validation_type: 'strength_progression_check',
      passed: true,
      confidence_impact: 0,
      reason_code: 'clean',
      details: { reason: 'no_previous_data' },
    };
  }

  const violations: string[] = [];
  for (const s of sets) {
    const prevMax = previousWeekMaxes[s.exercise];
    if (!prevMax || prevMax <= 0) continue;
    const increase = (s.weight_kg - prevMax) / prevMax;
    if (increase > 0.1) {
      violations.push(
        `${s.exercise}: ${s.weight_kg}kg is ${Math.round(increase * 100)}% above last week's max (${prevMax}kg)`
      );
    }
  }

  const passed = violations.length === 0;

  return {
    validation_type: 'strength_progression_check',
    passed,
    confidence_impact: passed ? 0 : -0.3,
    reason_code: passed ? 'clean' : 'rapid_progression',
    details: { violations, threshold_percent: 10 },
  };
}

/**
 * Run all strength validation checks.
 */
export function validateStrengthWorkout(
  sets: readonly StrengthSet[],
  durationSeconds: number,
  recentAverageTonnage: number | null,
  oneRepMaxRecords?: Record<string, number> | null,
  previousWeekMaxes?: Record<string, number> | null
): readonly ValidationResult[] {
  return [
    checkTonnagePlausibility(sets),
    checkWorkoutDensity(sets, durationSeconds),
    checkRestIntervals(sets, durationSeconds),
    checkTonnageSpike(sets, recentAverageTonnage),
    check1RMPlausibility(sets, oneRepMaxRecords ?? null),
    checkRepPlausibility(sets, oneRepMaxRecords ?? null),
    checkWeekOverWeekProgression(sets, previousWeekMaxes ?? null),
  ];
}
