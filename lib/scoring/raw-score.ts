import type { StrengthSet, RouteData } from '@/types';

/**
 * Calculate raw strength score from sets.
 * Formula: sum of (sets × reps × weight_kg) per exercise.
 * This is volume-based tonnage — a standard strength training metric.
 */
export function calculateStrengthRawScore(
  sets: readonly StrengthSet[]
): number {
  return sets.reduce(
    (total, s) => total + s.sets * s.reps * s.weight_kg,
    0
  );
}

/**
 * Pace multiplier rewards faster paces with diminishing returns.
 * Base pace: 6:00/km = multiplier 1.0
 * Faster → higher multiplier (capped at 1.5 for ~3:30/km elite pace)
 * Slower → lower multiplier (floor at 0.5 for 12:00+/km walking pace)
 *
 * This prevents raw speed from dominating — a slow 10km still scores well.
 */
export function calculatePaceMultiplier(avgPaceMinPerKm: number): number {
  const BASE_PACE = 6.0;
  const ratio = BASE_PACE / Math.max(avgPaceMinPerKm, 3.0);
  return Math.max(0.5, Math.min(1.5, ratio));
}

/**
 * Calculate raw scout (running) score.
 * Formula: distance_km × pace_multiplier
 * Distance is the primary driver; pace provides a moderate bonus/penalty.
 */
export function calculateScoutRawScore(routeData: RouteData): number {
  const paceMultiplier = calculatePaceMultiplier(routeData.avg_pace_min_per_km);
  return routeData.distance_km * paceMultiplier * 100; // ×100 to bring into a comparable range with strength
}
