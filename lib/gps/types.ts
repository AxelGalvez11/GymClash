import type { GpsRoutePoint, GpsRoute, GymLocationResult } from '@/types';

export interface LocationTrackingOptions {
  readonly accuracy: 'high' | 'balanced' | 'low';
  readonly distanceFilter: number;
  readonly intervalMs: number;
  readonly foregroundOnly: boolean;  // v1: always true
}

export interface LocationAdapter {
  readonly requestPermission: () => Promise<'granted' | 'denied' | 'undetermined'>;
  readonly startTracking: (options: LocationTrackingOptions) => Promise<void>;
  readonly stopTracking: () => Promise<GpsRoute | null>;
  readonly pauseTracking: () => void;
  readonly resumeTracking: () => void;
  readonly getCurrentPosition: () => Promise<GpsRoutePoint | null>;
  readonly onLocationUpdate: (callback: (point: GpsRoutePoint) => void) => () => void;
  readonly isTracking: () => boolean;
}

export interface GymProximityAdapter {
  readonly checkProximity: (latitude: number, longitude: number) => Promise<GymLocationResult>;
}
