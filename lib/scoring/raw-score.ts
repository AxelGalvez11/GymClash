import type { StrengthSet, RouteData, SpecializationBonus } from '@/types';

/**
 * Diminishing volume multiplier per set index within an exercise.
 * Sets 1–5: 1.0x (full credit)
 * Sets 6–10: 0.5x (half credit)
 * Sets 11+: 0.1x (minimal credit — discourages junk volume)
 */
export function getSetMultiplier(setIndex: number): number {
  if (setIndex < 5) return 1.0;
  if (setIndex < 10) return 0.5;
  return 0.1;
}

/**
 * Calculate raw strength score with diminishing volume.
 *
 * Each StrengthSet entry represents a batch: {exercise, sets, reps, weight_kg}.
 * We expand each batch into individual sets and apply the per-exercise
 * diminishing multiplier in order.
 *
 * Example: [{exercise:'Squat', sets:7, reps:5, weight_kg:100}]
 * → sets 1-5 at 1.0x: 5 × (5 × 100) = 2500
 * → sets 6-7 at 0.5x: 2 × (5 × 100) × 0.5 = 500
 * → total = 3000 (vs 3500 without diminishing)
 */
export function calculateStrengthRawScore(
  sets: readonly StrengthSet[]
): number {
  // Track per-exercise set count for diminishing returns
  const exerciseSetCounts: Record<string, number> = {};

  let total = 0;

  for (const entry of sets) {
    const exercise = entry.exercise;
    const currentCount = exerciseSetCounts[exercise] ?? 0;
    const perSetValue = entry.reps * entry.weight_kg;

    for (let i = 0; i < entry.sets; i++) {
      const globalSetIndex = currentCount + i;
      const multiplier = getSetMultiplier(globalSetIndex);
      total += perSetValue * multiplier;
    }

    exerciseSetCounts[exercise] = currentCount + entry.sets;
  }

  return Math.round(total * 100) / 100;
}

/**
 * Legacy strength raw score (no diminishing volume).
 * Kept for backward compatibility in tests and provisional client display.
 */
export function calculateStrengthRawScoreLegacy(
  sets: readonly StrengthSet[]
): number {
  return sets.reduce(
    (total, s) => total + s.sets * s.reps * s.weight_kg,
    0
  );
}

/**
 * Brzycki formula for estimated 1RM.
 * Only valid for 1–10 reps. Returns null for reps outside this range.
 *
 * Formula: estimated_1rm = weight × (36 / (37 - reps))
 */
export function calculateBrzycki1RM(
  weight_kg: number,
  reps: number
): number | null {
  if (reps < 1 || reps > 10 || weight_kg <= 0) return null;
  if (reps === 1) return weight_kg; // 1RM is the weight itself
  return Math.round((weight_kg * (36 / (37 - reps))) * 100) / 100;
}

/**
 * Wilks coefficient for body-weight-normalized strength scoring.
 * Uses the standard Wilks formula with sex-specific coefficients.
 *
 * Returns the multiplier to apply to raw tonnage.
 * If biological_sex or body_weight is missing/invalid, returns 1.0 (no adjustment).
 */
export function calculateWilksCoefficient(
  bodyWeightKg: number | null | undefined,
  biologicalSex: string | null | undefined
): number {
  if (!bodyWeightKg || bodyWeightKg <= 0 || !biologicalSex) return 1.0;

  const bw = bodyWeightKg;

  // Wilks formula coefficients
  // Source: International Powerlifting Federation
  let a: number, b: number, c: number, d: number, e: number, f: number;

  if (biologicalSex === 'male') {
    a = -216.0475144;
    b = 16.2606339;
    c = -0.002388645;
    d = -0.00113732;
    e = 7.01863e-6;
    f = -1.291e-8;
  } else if (biologicalSex === 'female') {
    a = 594.31747775582;
    b = -27.23842536447;
    c = 0.82112226871;
    d = -0.00930733913;
    e = 4.731582e-5;
    f = -9.054e-8;
  } else {
    return 1.0;
  }

  const denominator =
    a +
    b * bw +
    c * bw ** 2 +
    d * bw ** 3 +
    e * bw ** 4 +
    f * bw ** 5;

  if (denominator <= 0) return 1.0;

  const coefficient = 500 / denominator;

  // Normalize so a ~80kg male gets approximately 1.0x
  // Wilks for 80kg male ≈ 0.736, so we divide by that baseline
  // This keeps scores in a familiar range while still adjusting for body weight
  const BASELINE_WILKS = biologicalSex === 'male' ? 0.736 : 0.882;

  return Math.max(0.5, Math.min(2.0, coefficient / BASELINE_WILKS));
}

/**
 * Pace multiplier rewards faster paces with diminishing returns.
 * Base pace: 6:00/km = multiplier 1.0
 * Faster → higher multiplier (capped at 1.5 for ~3:30/km elite pace)
 * Slower → lower multiplier (floor at 0.5 for 12:00+/km walking pace)
 */
export function calculatePaceMultiplier(avgPaceMinPerKm: number): number {
  const BASE_PACE = 6.0;
  const ratio = BASE_PACE / Math.max(avgPaceMinPerKm, 3.0);
  return Math.max(0.5, Math.min(1.5, ratio));
}

/**
 * Calculate raw scout (running) score.
 * Distance is the primary driver; pace provides a moderate bonus/penalty.
 */
export function calculateScoutRawScore(routeData: RouteData): number {
  const paceMultiplier = calculatePaceMultiplier(routeData.avg_pace_min_per_km);
  return routeData.distance_km * paceMultiplier * 100;
}

/**
 * Apply a specialization bonus to a raw score.
 *
 * CLIENT-SIDE PROVISIONAL ONLY — the server is authoritative for final scores.
 * This is used to show the player a preview of their specialization bonus
 * in the UI before the server confirms the final score.
 */
export function applySpecializationBonus(
  rawScore: number,
  bonus: SpecializationBonus
): number {
  if (bonus.applies) {
    return Math.round(rawScore * bonus.multiplier * 100) / 100;
  }
  return rawScore;
}
