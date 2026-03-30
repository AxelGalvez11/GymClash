import type { HealthAdapter, WorkoutEvidenceData } from './types';

/**
 * Mock health adapter for MVP development.
 * Returns empty evidence — workouts rely on manual + sensor input.
 */
export const mockHealthAdapter: HealthAdapter = {
  isAvailable: async () => false,

  requestPermissions: async () => false,

  collectEvidence: async (): Promise<WorkoutEvidenceData> => ({
    heartRateSamples: [],
    locationSamples: [],
    stepCount: null,
    activeCalories: null,
    source: 'manual',
  }),
};
