import type { GymLocationResult } from '@/types';
import type { GymProximityAdapter } from './types';

interface MockGymAdapterOptions {
  readonly simulateNearGym?: boolean;
  readonly gymName?: string;
  readonly distanceMeters?: number;
}

const DEFAULT_NOT_NEAR_GYM: GymLocationResult = {
  is_near_gym: false,
  nearest_gym_name: null,
  distance_meters: null,
  confidence: 0,
};

const DEFAULT_NEAR_GYM: GymLocationResult = {
  is_near_gym: true,
  nearest_gym_name: 'Mock Gym',
  distance_meters: 50,
  confidence: 0.9,
};

/**
 * Factory that creates a mock GymProximityAdapter.
 *
 * By default returns a result indicating the user is NOT near a gym.
 * Pass `simulateNearGym: true` to simulate being near a gym (useful for testing).
 */
export function createMockGymAdapter(
  options?: MockGymAdapterOptions,
): GymProximityAdapter {
  const simulateNear = options?.simulateNearGym ?? false;

  const result: GymLocationResult = simulateNear
    ? {
        ...DEFAULT_NEAR_GYM,
        nearest_gym_name: options?.gymName ?? DEFAULT_NEAR_GYM.nearest_gym_name,
        distance_meters: options?.distanceMeters ?? DEFAULT_NEAR_GYM.distance_meters,
      }
    : DEFAULT_NOT_NEAR_GYM;

  return {
    checkProximity: async (
      _latitude: number,
      _longitude: number,
    ): Promise<GymLocationResult> => result,
  };
}
