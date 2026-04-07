import { Platform } from 'react-native';
import type { HealthAdapter } from './types';
import { mockHealthAdapter } from './mock-adapter';
import { createHealthKitAdapter } from './healthkit-adapter';
import { createHealthConnectAdapter } from './health-connect-adapter';

/**
 * Factory: returns the platform-specific health adapter.
 * iOS → HealthKit, Android → Health Connect, Web → mock.
 */
export function createHealthAdapter(): HealthAdapter {
  if (Platform.OS === 'ios') {
    return createHealthKitAdapter();
  }

  if (Platform.OS === 'android') {
    return createHealthConnectAdapter();
  }

  return mockHealthAdapter;
}
