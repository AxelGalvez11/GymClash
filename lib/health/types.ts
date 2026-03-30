/**
 * Health/sensor adapter interfaces.
 * MVP uses mock implementations. Real HealthKit/Health Connect adapters
 * will implement these interfaces in future phases.
 */

export interface HeartRateSample {
  readonly bpm: number;
  readonly timestamp: string;
}

export interface LocationSample {
  readonly latitude: number;
  readonly longitude: number;
  readonly altitude: number | null;
  readonly timestamp: string;
  readonly accuracy: number;
}

export interface WorkoutEvidenceData {
  readonly heartRateSamples: readonly HeartRateSample[];
  readonly locationSamples: readonly LocationSample[];
  readonly stepCount: number | null;
  readonly activeCalories: number | null;
  readonly source: 'healthkit' | 'health_connect' | 'manual';
}

export interface HealthAdapter {
  /** Check if health data access is available on this device */
  readonly isAvailable: () => Promise<boolean>;

  /** Request necessary permissions */
  readonly requestPermissions: () => Promise<boolean>;

  /** Collect evidence for a workout time range */
  readonly collectEvidence: (
    startTime: string,
    endTime: string
  ) => Promise<WorkoutEvidenceData>;
}
