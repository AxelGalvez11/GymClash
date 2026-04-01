import type { GpsRoute, GpsRoutePoint, GymLocationResult, ValidationResult } from '@/types';
import { haversineDistance } from '@/lib/gps/route-calculator';

/** Maximum position jump in meters within 1 second (teleportation threshold) */
const MAX_JUMP_METERS = 100;

/** Maximum time gap in seconds for a jump to be considered teleportation */
const TELEPORT_TIME_THRESHOLD_S = 1;

/** Maximum allowed discrepancy between GPS distance and reported distance */
const MAX_DISTANCE_DISCREPANCY_PCT = 0.15;

/** Speed standard-deviation threshold for "suspiciously uniform" movement */
const MIN_SPEED_STDDEV_MS = 0.05;

/** Minimum points needed to evaluate speed uniformity */
const MIN_POINTS_FOR_UNIFORMITY = 5;

// ─── Helpers ──────────────────────────────────────────────

function timeDiffSeconds(a: GpsRoutePoint, b: GpsRoutePoint): number {
  return (
    (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) / 1000
  );
}

function segmentSpeedsMs(points: readonly GpsRoutePoint[]): readonly number[] {
  const speeds: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const dt = timeDiffSeconds(points[i - 1], points[i]);
    if (dt <= 0) continue;

    const distKm = haversineDistance(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude,
    );
    speeds.push((distKm * 1000) / dt); // m/s
  }
  return speeds;
}

function stddev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ─── Checks ───────────────────────────────────────────────

/**
 * Detect GPS spoofing: teleportation (>100 m jump in <1 s) and
 * suspiciously uniform speed across segments.
 *
 * Impact: -0.8
 */
export function checkGpsSpoofing(route: GpsRoute): ValidationResult {
  const { points } = route;

  // Teleportation detection
  for (let i = 1; i < points.length; i++) {
    const dt = timeDiffSeconds(points[i - 1], points[i]);
    if (dt > TELEPORT_TIME_THRESHOLD_S) continue;

    const distKm = haversineDistance(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude,
    );
    const distMeters = distKm * 1000;

    if (distMeters > MAX_JUMP_METERS) {
      return {
        validation_type: 'gps_spoofing_check',
        passed: false,
        confidence_impact: -0.8,
        reason_code: 'spoof_detected',
        details: {
          trigger: 'teleportation',
          jump_meters: Math.round(distMeters),
          time_gap_seconds: Math.round(dt * 100) / 100,
          point_index: i,
        },
      };
    }
  }

  // Suspiciously uniform speed
  const speeds = segmentSpeedsMs(points);
  if (speeds.length >= MIN_POINTS_FOR_UNIFORMITY) {
    const sd = stddev(speeds);
    if (sd < MIN_SPEED_STDDEV_MS) {
      return {
        validation_type: 'gps_spoofing_check',
        passed: false,
        confidence_impact: -0.8,
        reason_code: 'spoof_detected',
        details: {
          trigger: 'uniform_speed',
          speed_stddev_ms: Math.round(sd * 1000) / 1000,
          threshold: MIN_SPEED_STDDEV_MS,
          segment_count: speeds.length,
        },
      };
    }
  }

  return {
    validation_type: 'gps_spoofing_check',
    passed: true,
    confidence_impact: 0,
    reason_code: 'clean',
    details: {},
  };
}

/**
 * Compare GPS-measured distance with the reported distance.
 * Flag if discrepancy exceeds 15%.
 *
 * Impact: -0.3
 */
export function checkRouteConsistency(
  route: GpsRoute,
  reportedDistance: number,
): ValidationResult {
  const gpsDistance = route.total_distance_km;

  if (reportedDistance <= 0 || gpsDistance <= 0) {
    return {
      validation_type: 'gps_route_consistency',
      passed: true,
      confidence_impact: 0,
      reason_code: 'clean',
      details: { reason: 'insufficient_distance_data' },
    };
  }

  const discrepancy = Math.abs(gpsDistance - reportedDistance) / reportedDistance;
  const passed = discrepancy <= MAX_DISTANCE_DISCREPANCY_PCT;

  return {
    validation_type: 'gps_route_consistency',
    passed,
    confidence_impact: passed ? 0 : -0.3,
    reason_code: passed ? 'clean' : 'route_sanity_fail',
    details: {
      gps_distance_km: Math.round(gpsDistance * 1000) / 1000,
      reported_distance_km: Math.round(reportedDistance * 1000) / 1000,
      discrepancy_pct: Math.round(discrepancy * 1000) / 10,
      threshold_pct: MAX_DISTANCE_DISCREPANCY_PCT * 100,
    },
  };
}

/**
 * Gym proximity is a POSITIVE signal only.
 * +0.05 confidence if the user is confirmed near a gym, 0 impact otherwise.
 * NEVER negative.
 */
export function checkGymProximity(
  gymResult: GymLocationResult | null,
): ValidationResult {
  const isNearGym = gymResult?.is_near_gym === true;

  return {
    validation_type: 'gps_gym_proximity',
    passed: true, // always passes — soft signal only
    confidence_impact: isNearGym ? 0.05 : 0,
    reason_code: 'clean',
    details: {
      is_near_gym: isNearGym,
      nearest_gym_name: gymResult?.nearest_gym_name ?? null,
      distance_meters: gymResult?.distance_meters ?? null,
      gym_confidence: gymResult?.confidence ?? 0,
    },
  };
}

/**
 * Run all GPS evidence validation checks and return the results array.
 *
 * Gracefully handles null route / gymResult — checks that require
 * a route are skipped when the route is absent.
 */
export function validateGpsEvidence(
  route: GpsRoute | null,
  gymResult: GymLocationResult | null,
  reportedDistance: number,
): readonly ValidationResult[] {
  const results: ValidationResult[] = [];

  if (route !== null) {
    results.push(checkGpsSpoofing(route));
    results.push(checkRouteConsistency(route, reportedDistance));
  }

  results.push(checkGymProximity(gymResult));

  return results;
}
