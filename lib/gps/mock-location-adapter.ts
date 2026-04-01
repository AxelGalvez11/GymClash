import type { GpsRoutePoint, GpsRoute } from '@/types';
import type { LocationAdapter, LocationTrackingOptions } from './types';
import { GPS_CONFIG } from '@/constants/gps';
import { buildGpsRoute, filterNoisyPoints } from './route-calculator';

/**
 * Mock LocationAdapter for development.
 * Simulates a run along a straight northward path at ~5 min/km pace.
 */
export function createMockLocationAdapter(): LocationAdapter {
  let tracking = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let points: GpsRoutePoint[] = [];
  let callback: ((point: GpsRoutePoint) => void) | null = null;
  let unsubscribed = false;

  // Starting point: arbitrary location (San Francisco area)
  const startLat = 37.7749;
  const startLng = -122.4194;
  const startAltitude = 10;

  // ~5 min/km pace ≈ 3.33 m/s. Per 3s interval ≈ 10m displacement.
  // 10m of latitude ≈ 0.00009 degrees
  const latIncrementPerTick = 0.00009;
  // Small eastward drift for realism
  const lngIncrementPerTick = 0.00001;
  // Slight altitude variation
  const altitudeVariation = 0.5;

  let tickCount = 0;

  const generatePoint = (): GpsRoutePoint => {
    tickCount += 1;
    const altitudeOffset = Math.sin(tickCount * 0.3) * altitudeVariation;

    return {
      latitude: startLat + latIncrementPerTick * tickCount,
      longitude: startLng + lngIncrementPerTick * tickCount,
      altitude: startAltitude + altitudeOffset,
      timestamp: new Date().toISOString(),
      accuracy: 5 + Math.random() * 5, // 5–10m accuracy
      speed: 3.2 + Math.random() * 0.3, // ~3.2–3.5 m/s
    };
  };

  const requestPermission: LocationAdapter['requestPermission'] = async () => 'granted';

  const startTracking: LocationAdapter['startTracking'] = async (options: LocationTrackingOptions) => {
    if (tracking) return;

    tracking = true;
    unsubscribed = false;
    points = [];
    tickCount = 0;

    const intervalMs = options.intervalMs || GPS_CONFIG.UPDATE_INTERVAL;

    intervalId = setInterval(() => {
      if (!tracking) return;

      const point = generatePoint();
      points = [...points, point];

      if (callback && !unsubscribed) {
        callback(point);
      }
    }, intervalMs);
  };

  const stopTracking: LocationAdapter['stopTracking'] = async () => {
    if (!tracking) return null;

    tracking = false;

    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }

    if (points.length === 0) return null;

    const filtered = filterNoisyPoints(points, GPS_CONFIG.MAX_ACCURACY_METERS);
    return buildGpsRoute(filtered);
  };

  const pauseTracking: LocationAdapter['pauseTracking'] = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const resumeTracking: LocationAdapter['resumeTracking'] = () => {
    if (!tracking || intervalId !== null) return;

    intervalId = setInterval(() => {
      if (!tracking) return;

      const point = generatePoint();
      points = [...points, point];

      if (callback && !unsubscribed) {
        callback(point);
      }
    }, GPS_CONFIG.UPDATE_INTERVAL);
  };

  const getCurrentPosition: LocationAdapter['getCurrentPosition'] = async () => {
    return generatePoint();
  };

  const onLocationUpdate: LocationAdapter['onLocationUpdate'] = (cb) => {
    callback = cb;
    unsubscribed = false;

    return () => {
      unsubscribed = true;
      callback = null;
    };
  };

  const isTracking: LocationAdapter['isTracking'] = () => tracking;

  return {
    requestPermission,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    getCurrentPosition,
    onLocationUpdate,
    isTracking,
  };
}
