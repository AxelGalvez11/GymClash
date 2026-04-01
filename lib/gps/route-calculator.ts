import type { GpsRoutePoint, GpsRoute } from '@/types';

const EARTH_RADIUS_KM = 6371;

/**
 * Returns the great-circle distance between two points in km.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Sum of consecutive haversine distances between ordered points, in km.
 */
export function calculateTotalDistance(points: readonly GpsRoutePoint[]): number {
  if (points.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude,
    );
  }

  return total;
}

/**
 * Sum of positive altitude changes between consecutive points, in meters.
 * Points with null altitude are skipped.
 */
export function calculateElevationGain(points: readonly GpsRoutePoint[]): number {
  if (points.length < 2) return 0;

  let gain = 0;
  let prevAltitude: number | null = null;

  for (const point of points) {
    if (point.altitude !== null) {
      if (prevAltitude !== null && point.altitude > prevAltitude) {
        gain += point.altitude - prevAltitude;
      }
      prevAltitude = point.altitude;
    }
  }

  return gain;
}

/**
 * Average pace in min/km. Returns 0 if distance is zero.
 */
export function calculateAvgPace(distanceKm: number, durationSeconds: number): number {
  if (distanceKm <= 0) return 0;
  return (durationSeconds / 60) / distanceKm;
}

/**
 * Assembles a full GpsRoute from an ordered array of points.
 */
export function buildGpsRoute(points: readonly GpsRoutePoint[]): GpsRoute {
  const totalDistanceKm = calculateTotalDistance(points);
  const totalElevationGainM = calculateElevationGain(points);

  const startedAt = points.length > 0 ? points[0].timestamp : new Date().toISOString();
  const endedAt = points.length > 0 ? points[points.length - 1].timestamp : startedAt;

  const durationSeconds =
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000;

  const avgPace = calculateAvgPace(totalDistanceKm, durationSeconds);

  return {
    points,
    total_distance_km: totalDistanceKm,
    total_elevation_gain_m: totalElevationGainM,
    avg_pace_min_per_km: avgPace,
    started_at: startedAt,
    ended_at: endedAt,
  };
}

/**
 * Removes points whose accuracy exceeds the given threshold (in meters).
 */
export function filterNoisyPoints(
  points: readonly GpsRoutePoint[],
  maxAccuracy: number,
): readonly GpsRoutePoint[] {
  return points.filter((p) => p.accuracy <= maxAccuracy);
}
