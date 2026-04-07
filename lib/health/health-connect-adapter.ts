import { Platform } from 'react-native';
import type { HealthAdapter, WorkoutEvidenceData, HeartRateSample } from './types';

/**
 * Android Health Connect adapter.
 * Uses react-native-health-connect to query heart rate, steps, and calories.
 * Requires Android 14+ (API 34) or Health Connect app installed.
 */

let HealthConnect: any = null;

function getHealthConnect() {
  if (HealthConnect) return HealthConnect;
  try {
    HealthConnect = require('react-native-health-connect');
  } catch {
    HealthConnect = null;
  }
  return HealthConnect;
}

export function createHealthConnectAdapter(): HealthAdapter {
  const isAvailable: HealthAdapter['isAvailable'] = async () => {
    if (Platform.OS !== 'android') return false;
    const hc = getHealthConnect();
    if (!hc) return false;

    try {
      const result = await hc.getSdkStatus();
      return result === hc.SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  };

  const requestPermissions: HealthAdapter['requestPermissions'] = async () => {
    const hc = getHealthConnect();
    if (!hc) return false;

    try {
      await hc.initialize();
      const granted = await hc.requestPermission([
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      ]);
      return granted.length > 0;
    } catch {
      return false;
    }
  };

  const collectEvidence: HealthAdapter['collectEvidence'] = async (
    startTime: string,
    endTime: string
  ): Promise<WorkoutEvidenceData> => {
    const hc = getHealthConnect();
    if (!hc) {
      return {
        heartRateSamples: [],
        locationSamples: [],
        stepCount: null,
        activeCalories: null,
        source: 'health_connect',
      };
    }

    const timeFilter = {
      operator: 'between' as const,
      startTime,
      endTime,
    };

    const [heartRateSamples, stepCount, activeCalories] = await Promise.all([
      queryHeartRate(hc, timeFilter),
      querySteps(hc, timeFilter),
      queryCalories(hc, timeFilter),
    ]);

    return {
      heartRateSamples,
      locationSamples: [],
      stepCount,
      activeCalories,
      source: 'health_connect',
    };
  };

  return { isAvailable, requestPermissions, collectEvidence };
}

async function queryHeartRate(
  hc: any,
  timeRangeFilter: any
): Promise<readonly HeartRateSample[]> {
  try {
    const result = await hc.readRecords('HeartRate', { timeRangeFilter });
    const samples: HeartRateSample[] = [];
    for (const record of result.records ?? []) {
      for (const sample of record.samples ?? []) {
        samples.push({
          bpm: sample.beatsPerMinute,
          timestamp: sample.time,
        });
      }
    }
    return samples;
  } catch {
    return [];
  }
}

async function querySteps(
  hc: any,
  timeRangeFilter: any
): Promise<number | null> {
  try {
    const result = await hc.readRecords('Steps', { timeRangeFilter });
    const total = (result.records ?? []).reduce(
      (sum: number, r: any) => sum + (r.count ?? 0),
      0
    );
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

async function queryCalories(
  hc: any,
  timeRangeFilter: any
): Promise<number | null> {
  try {
    const result = await hc.readRecords('ActiveCaloriesBurned', {
      timeRangeFilter,
    });
    const total = (result.records ?? []).reduce(
      (sum: number, r: any) => sum + (r.energy?.inKilocalories ?? 0),
      0
    );
    return total > 0 ? Math.round(total) : null;
  } catch {
    return null;
  }
}
