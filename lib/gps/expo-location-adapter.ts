import * as Location from 'expo-location';
import type { GpsRoutePoint, GpsRoute } from '@/types';
import type { LocationAdapter, LocationTrackingOptions } from './types';
import { GPS_CONFIG } from '@/constants/gps';
import { buildGpsRoute, filterNoisyPoints } from './route-calculator';

/**
 * Real LocationAdapter implementation using expo-location.
 * Wraps the expo-location API to match the LocationAdapter interface.
 */
export function createExpoLocationAdapter(): LocationAdapter {
  let tracking = false;
  let paused = false;
  let subscription: Location.LocationSubscription | null = null;
  let points: GpsRoutePoint[] = [];
  let callback: ((point: GpsRoutePoint) => void) | null = null;
  let unsubscribed = false;

  const toRoutePoint = (location: Location.LocationObject): GpsRoutePoint => ({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    altitude: location.coords.altitude ?? 0,
    timestamp: new Date(location.timestamp).toISOString(),
    accuracy: location.coords.accuracy ?? 999,
    speed: location.coords.speed ?? 0,
  });

  const mapAccuracy = (
    accuracy: 'high' | 'balanced' | 'low'
  ): Location.LocationAccuracy => {
    switch (accuracy) {
      case 'high':
        return Location.Accuracy.BestForNavigation;
      case 'balanced':
        return Location.Accuracy.Balanced;
      case 'low':
        return Location.Accuracy.Low;
    }
  };

  const requestPermission: LocationAdapter['requestPermission'] = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    switch (status) {
      case Location.PermissionStatus.GRANTED:
        return 'granted';
      case Location.PermissionStatus.DENIED:
        return 'denied';
      default:
        return 'undetermined';
    }
  };

  const startTracking: LocationAdapter['startTracking'] = async (
    options: LocationTrackingOptions
  ) => {
    if (tracking) return;

    tracking = true;
    paused = false;
    points = [];
    unsubscribed = false;

    subscription = await Location.watchPositionAsync(
      {
        accuracy: mapAccuracy(options.accuracy),
        distanceInterval: options.distanceFilter,
        timeInterval: options.intervalMs,
      },
      (location) => {
        if (!tracking || paused) return;

        const point = toRoutePoint(location);
        points = [...points, point];

        if (callback && !unsubscribed) {
          callback(point);
        }
      }
    );
  };

  const stopTracking: LocationAdapter['stopTracking'] = async () => {
    if (!tracking) return null;

    tracking = false;
    paused = false;

    if (subscription) {
      subscription.remove();
      subscription = null;
    }

    if (points.length === 0) return null;

    const filtered = filterNoisyPoints(points, GPS_CONFIG.MAX_ACCURACY_METERS);
    return buildGpsRoute(filtered);
  };

  const pauseTracking: LocationAdapter['pauseTracking'] = () => {
    paused = true;
  };

  const resumeTracking: LocationAdapter['resumeTracking'] = () => {
    paused = false;
  };

  const getCurrentPosition: LocationAdapter['getCurrentPosition'] =
    async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        return toRoutePoint(location);
      } catch {
        return null;
      }
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
