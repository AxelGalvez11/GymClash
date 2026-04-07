import { Platform } from 'react-native';
import type { LocationAdapter } from './types';
import { createMockLocationAdapter } from './mock-location-adapter';
import { createExpoLocationAdapter } from './expo-location-adapter';

/**
 * Factory: returns the real expo-location adapter on native platforms,
 * falls back to the mock adapter on web or when __DEV__ + web.
 */
export function createLocationAdapter(): LocationAdapter {
  if (Platform.OS === 'web') {
    return createMockLocationAdapter();
  }

  return createExpoLocationAdapter();
}
