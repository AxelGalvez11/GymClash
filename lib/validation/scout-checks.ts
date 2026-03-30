import type { RouteData } from '@/types';
import type { ValidationResult } from '@/types';

/** Maximum sustained speed in km/h that a human can run */
const MAX_HUMAN_SPEED_KMH = 25;

/** Minimum plausible pace (min/km) — ~2:24/km = world record marathon pace */
const MIN_PLAUSIBLE_PACE = 2.4;

/** Maximum plausible pace (min/km) — beyond this is barely walking */
const MAX_PLAUSIBLE_PACE = 20;

/**
 * Check if the average speed is physically possible.
 */
export function checkImpossibleSpeed(
  routeData: RouteData,
  durationSeconds: number
): ValidationResult {
  const durationHours = durationSeconds / 3600;
  const speedKmh = durationHours > 0 ? routeData.distance_km / durationHours : 0;

  const passed = speedKmh <= MAX_HUMAN_SPEED_KMH;

  return {
    validation_type: 'scout_speed_check',
    passed,
    confidence_impact: passed ? 0 : -0.8,
    reason_code: passed ? 'clean' : 'impossible_speed',
    details: {
      calculated_speed_kmh: Math.round(speedKmh * 100) / 100,
      threshold_kmh: MAX_HUMAN_SPEED_KMH,
    },
  };
}

/**
 * Check if the reported pace is within plausible bounds.
 */
export function checkPaceSanity(routeData: RouteData): ValidationResult {
  const pace = routeData.avg_pace_min_per_km;
  const passed = pace >= MIN_PLAUSIBLE_PACE && pace <= MAX_PLAUSIBLE_PACE;

  return {
    validation_type: 'scout_pace_sanity',
    passed,
    confidence_impact: passed ? 0 : -0.5,
    reason_code: passed ? 'clean' : 'route_sanity_fail',
    details: {
      reported_pace: pace,
      min_plausible: MIN_PLAUSIBLE_PACE,
      max_plausible: MAX_PLAUSIBLE_PACE,
    },
  };
}

/**
 * Check route distance vs duration consistency.
 * If distance / duration implies impossibly fast or slow movement, flag it.
 */
export function checkRouteSanity(
  routeData: RouteData,
  durationSeconds: number
): ValidationResult {
  if (durationSeconds <= 0 || routeData.distance_km <= 0) {
    return {
      validation_type: 'scout_route_sanity',
      passed: false,
      confidence_impact: -0.6,
      reason_code: 'route_sanity_fail',
      details: { reason: 'zero_or_negative_values' },
    };
  }

  const impliedPace = (durationSeconds / 60) / routeData.distance_km;
  const paceMatchesReported =
    Math.abs(impliedPace - routeData.avg_pace_min_per_km) < 1.0;

  return {
    validation_type: 'scout_route_sanity',
    passed: paceMatchesReported,
    confidence_impact: paceMatchesReported ? 0 : -0.3,
    reason_code: paceMatchesReported ? 'clean' : 'route_sanity_fail',
    details: {
      implied_pace: Math.round(impliedPace * 100) / 100,
      reported_pace: routeData.avg_pace_min_per_km,
      difference: Math.round(Math.abs(impliedPace - routeData.avg_pace_min_per_km) * 100) / 100,
    },
  };
}

/**
 * Run all scout validation checks.
 */
export function validateScoutWorkout(
  routeData: RouteData,
  durationSeconds: number
): readonly ValidationResult[] {
  return [
    checkImpossibleSpeed(routeData, durationSeconds),
    checkPaceSanity(routeData),
    checkRouteSanity(routeData, durationSeconds),
  ];
}
