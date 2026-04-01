import { useCallback, useEffect, useRef, useState } from 'react';
import { useGpsStore } from '@/stores/gps-store';
import { createMockLocationAdapter } from '@/lib/gps/mock-location-adapter';
import { calculateTotalDistance, calculateAvgPace, buildGpsRoute } from '@/lib/gps/route-calculator';
import { GPS_CONFIG } from '@/constants/gps';
import type { GpsRoute, GpsTrackingStatus } from '@/types';
import type { LocationAdapter } from '@/lib/gps/types';

interface UseGpsTrackingReturn {
  readonly status: GpsTrackingStatus;
  readonly distance: number;
  readonly pace: number;
  readonly elapsed: number;
  readonly points: readonly import('@/types').GpsRoutePoint[];
  readonly startTracking: () => Promise<void>;
  readonly stopTracking: () => Promise<GpsRoute | null>;
  readonly error: string | null;
}

export function useGpsTracking(): UseGpsTrackingReturn {
  const adapterRef = useRef<LocationAdapter>(createMockLocationAdapter());
  const unsubRef = useRef<(() => void) | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const status = useGpsStore((s) => s.status);
  const points = useGpsStore((s) => s.points);
  const error = useGpsStore((s) => s.error);
  const setStatus = useGpsStore((s) => s.setStatus);
  const addPoint = useGpsStore((s) => s.addPoint);
  const setRoute = useGpsStore((s) => s.setRoute);
  const setError = useGpsStore((s) => s.setError);
  const reset = useGpsStore((s) => s.reset);

  const distance = points.length >= 2 ? calculateTotalDistance(points) : 0;

  // Keep elapsed fresh with a 1-second timer while tracking
  const [elapsedTick, setElapsedTick] = useState(0);
  useEffect(() => {
    if (status !== 'tracking') return;
    const interval = setInterval(() => setElapsedTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const elapsed = startTimeRef.current !== null
    ? (Date.now() - startTimeRef.current) / 1000
    : 0;
  // elapsedTick ensures re-render; suppress unused warning
  void elapsedTick;

  const pace = calculateAvgPace(distance, elapsed);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (adapterRef.current.isTracking()) {
        void adapterRef.current.stopTracking();
      }
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, []);

  const startTracking = useCallback(async () => {
    try {
      reset();
      setStatus('requesting_permission');

      const permission = await adapterRef.current.requestPermission();

      if (permission !== 'granted') {
        setError('Location permission denied');
        return;
      }

      // Subscribe to location updates before starting
      unsubRef.current = adapterRef.current.onLocationUpdate((point) => {
        addPoint(point);
      });

      await adapterRef.current.startTracking({
        accuracy: GPS_CONFIG.ACCURACY,
        distanceFilter: GPS_CONFIG.DISTANCE_FILTER,
        intervalMs: GPS_CONFIG.UPDATE_INTERVAL,
        foregroundOnly: true,
      });

      startTimeRef.current = Date.now();
      setStatus('tracking');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start GPS tracking');
    }
  }, [reset, setStatus, setError, addPoint]);

  const stopTracking = useCallback(async (): Promise<GpsRoute | null> => {
    try {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }

      const route = await adapterRef.current.stopTracking();

      startTimeRef.current = null;

      if (route) {
        setRoute(route);
      }

      setStatus('stopped');
      return route;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop GPS tracking');
      return null;
    }
  }, [setRoute, setStatus, setError]);

  return {
    status,
    distance,
    pace,
    elapsed,
    points,
    startTracking,
    stopTracking,
    error,
  };
}
