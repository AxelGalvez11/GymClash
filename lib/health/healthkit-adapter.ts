import { Platform } from 'react-native';
import type { HealthAdapter, WorkoutEvidenceData, HeartRateSample } from './types';

/**
 * iOS HealthKit adapter.
 * Uses react-native-health to query heart rate, steps, and calories
 * from HealthKit within a workout timeframe.
 *
 * Note: Apple Watch writes HR → HealthKit automatically.
 * This adapter reads from HealthKit, not the watch directly.
 */

let AppleHealthKit: any = null;

function getHealthKit() {
  if (AppleHealthKit) return AppleHealthKit;
  try {
    // Dynamic import to avoid crash on Android
    AppleHealthKit = require('react-native-health').default;
  } catch {
    AppleHealthKit = null;
  }
  return AppleHealthKit;
}

const HEALTHKIT_PERMISSIONS = {
  permissions: {
    read: [
      'HeartRate',
      'StepCount',
      'ActiveEnergyBurned',
      'DistanceWalkingRunning',
    ],
    write: [] as string[],
  },
};

export function createHealthKitAdapter(): HealthAdapter {
  const isAvailable: HealthAdapter['isAvailable'] = async () => {
    if (Platform.OS !== 'ios') return false;
    const hk = getHealthKit();
    if (!hk) return false;

    return new Promise<boolean>((resolve) => {
      hk.isAvailable((err: any, available: boolean) => {
        resolve(!err && available);
      });
    });
  };

  const requestPermissions: HealthAdapter['requestPermissions'] = async () => {
    const hk = getHealthKit();
    if (!hk) return false;

    return new Promise<boolean>((resolve) => {
      hk.initHealthKit(HEALTHKIT_PERMISSIONS, (err: any) => {
        resolve(!err);
      });
    });
  };

  const collectEvidence: HealthAdapter['collectEvidence'] = async (
    startTime: string,
    endTime: string
  ): Promise<WorkoutEvidenceData> => {
    const hk = getHealthKit();
    if (!hk) {
      return {
        heartRateSamples: [],
        locationSamples: [],
        stepCount: null,
        activeCalories: null,
        source: 'healthkit',
      };
    }

    const options = {
      startDate: startTime,
      endDate: endTime,
      ascending: true,
    };

    const [heartRateSamples, stepCount, activeCalories] = await Promise.all([
      queryHeartRate(hk, options),
      queryStepCount(hk, options),
      queryActiveCalories(hk, options),
    ]);

    return {
      heartRateSamples,
      locationSamples: [], // Location comes from GPS adapter, not health
      stepCount,
      activeCalories,
      source: 'healthkit',
    };
  };

  return { isAvailable, requestPermissions, collectEvidence };
}

function queryHeartRate(
  hk: any,
  options: { startDate: string; endDate: string; ascending: boolean }
): Promise<readonly HeartRateSample[]> {
  return new Promise((resolve) => {
    hk.getHeartRateSamples(options, (err: any, results: any[]) => {
      if (err || !results) {
        resolve([]);
        return;
      }
      resolve(
        results.map((r) => ({
          bpm: r.value,
          timestamp: r.startDate,
        }))
      );
    });
  });
}

function queryStepCount(
  hk: any,
  options: { startDate: string; endDate: string }
): Promise<number | null> {
  return new Promise((resolve) => {
    hk.getStepCount(options, (err: any, results: any) => {
      if (err || !results) {
        resolve(null);
        return;
      }
      resolve(results.value ?? null);
    });
  });
}

function queryActiveCalories(
  hk: any,
  options: { startDate: string; endDate: string }
): Promise<number | null> {
  return new Promise((resolve) => {
    hk.getActiveEnergyBurned(options, (err: any, results: any[]) => {
      if (err || !results || results.length === 0) {
        resolve(null);
        return;
      }
      const total = results.reduce((sum, r) => sum + (r.value ?? 0), 0);
      resolve(Math.round(total));
    });
  });
}
