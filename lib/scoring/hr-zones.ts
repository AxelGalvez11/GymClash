/**
 * Heart Rate Zone scoring engine.
 *
 * 5-zone model based on % of max HR:
 *   Zone 1: 68–73% (recovery)      → 0.5 pts/min
 *   Zone 2: 73–80% (endurance)     → 1.0 pts/min (base rate)
 *   Zone 3: 80–87% (tempo)         → 1.4 pts/min
 *   Zone 4: 87–93% (threshold)     → 1.8 pts/min
 *   Zone 5: 93–100% (max effort)   → 2.0 pts/min
 *
 * Session score = Σ (minutes in each zone × zone coefficient)
 */

export type HRZone = 1 | 2 | 3 | 4 | 5;

export interface HRZoneDefinition {
  readonly zone: HRZone;
  readonly name: string;
  readonly minPercent: number;
  readonly maxPercent: number;
  readonly pointsPerMinute: number;
  readonly color: string;
}

export const HR_ZONE_DEFINITIONS: readonly HRZoneDefinition[] = [
  { zone: 1, name: 'Recovery',  minPercent: 0.68, maxPercent: 0.73, pointsPerMinute: 0.5, color: '#94a3b8' },
  { zone: 2, name: 'Endurance', minPercent: 0.73, maxPercent: 0.80, pointsPerMinute: 1.0, color: '#22c55e' },
  { zone: 3, name: 'Tempo',     minPercent: 0.80, maxPercent: 0.87, pointsPerMinute: 1.4, color: '#eab308' },
  { zone: 4, name: 'Threshold', minPercent: 0.87, maxPercent: 0.93, pointsPerMinute: 1.8, color: '#f97316' },
  { zone: 5, name: 'Max',       minPercent: 0.93, maxPercent: 1.00, pointsPerMinute: 2.0, color: '#ef4444' },
];

/**
 * Determine which HR zone a given heart rate falls into.
 * Below Zone 1 returns null (not counted). Above maxHR caps at Zone 5.
 */
export function getHRZone(heartRate: number, maxHR: number): HRZone | null {
  if (maxHR <= 0) return null;
  const percent = heartRate / maxHR;
  if (percent < 0.68) return null; // Below Zone 1 threshold
  if (percent >= 0.93) return 5;
  if (percent >= 0.87) return 4;
  if (percent >= 0.80) return 3;
  if (percent >= 0.73) return 2;
  return 1;
}

/**
 * Time-in-zone breakdown from a HR data series.
 * Each entry is a HR sample at a regular interval (intervalSeconds).
 */
export interface HRTimeSeries {
  readonly samples: readonly number[]; // HR values (bpm)
  readonly intervalSeconds: number;     // time between samples
  readonly maxHR: number;              // user's max heart rate
}

export interface ZoneTimeBreakdown {
  readonly zone: HRZone;
  readonly minutes: number;
  readonly points: number;
}

/**
 * Calculate time-in-zone breakdown and zone-based score.
 * Returns per-zone breakdown and total score.
 */
export function calculateZoneScore(series: HRTimeSeries): {
  readonly breakdown: readonly ZoneTimeBreakdown[];
  readonly totalScore: number;
  readonly totalMinutes: number;
} {
  const zoneTimes: Record<HRZone, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const hr of series.samples) {
    const zone = getHRZone(hr, series.maxHR);
    if (zone !== null) {
      zoneTimes[zone] += series.intervalSeconds / 60; // convert to minutes
    }
  }

  const breakdown: ZoneTimeBreakdown[] = HR_ZONE_DEFINITIONS.map((def) => {
    const minutes = Math.round(zoneTimes[def.zone] * 100) / 100;
    const points = Math.round(minutes * def.pointsPerMinute * 100) / 100;
    return { zone: def.zone, minutes, points };
  });

  const totalScore = breakdown.reduce((sum, z) => sum + z.points, 0);
  const totalMinutes = breakdown.reduce((sum, z) => sum + z.minutes, 0);

  return {
    breakdown,
    totalScore: Math.round(totalScore * 100) / 100,
    totalMinutes: Math.round(totalMinutes * 100) / 100,
  };
}

/**
 * Calculate combined cardio score using both distance/pace AND HR zones.
 *
 * If HR data is available:
 *   score = (distance_score × 0.4) + (zone_score × 0.6)
 * If no HR data:
 *   score = distance_score (fallback to pace-only)
 *
 * This ensures HR-connected users get fairer scoring while
 * non-connected users can still participate with reduced accuracy.
 */
export function calculateCombinedCardioScore(
  distanceScore: number,
  zoneScore: number | null
): number {
  if (!isFinite(distanceScore) || distanceScore < 0) return 0;
  if (zoneScore === null || zoneScore <= 0) {
    return distanceScore;
  }
  return Math.round((distanceScore * 0.4 + zoneScore * 0.6) * 100) / 100;
}

/**
 * Karvonen formula for personalized HR zone thresholds.
 * Uses heart rate reserve (HRR) for more accurate zones
 * once we have the user's resting HR.
 *
 * target_hr = ((maxHR - restingHR) × intensity) + restingHR
 */
export function karvonen(
  maxHR: number,
  restingHR: number,
  intensityPercent: number
): number {
  return Math.round((maxHR - restingHR) * intensityPercent + restingHR);
}

/**
 * Generate personalized zone boundaries using Karvonen formula.
 * Falls back to fixed-percentage zones if resting HR is unavailable.
 */
export function getPersonalizedZoneBoundaries(
  maxHR: number,
  restingHR: number | null
): readonly { readonly zone: HRZone; readonly minBPM: number; readonly maxBPM: number }[] {
  if (restingHR === null || restingHR <= 0 || restingHR >= maxHR) {
    // Fixed percentage fallback
    return HR_ZONE_DEFINITIONS.map((def) => ({
      zone: def.zone,
      minBPM: Math.round(maxHR * def.minPercent),
      maxBPM: Math.round(maxHR * def.maxPercent),
    }));
  }

  // Karvonen-based boundaries
  return HR_ZONE_DEFINITIONS.map((def) => ({
    zone: def.zone,
    minBPM: karvonen(maxHR, restingHR, def.minPercent),
    maxBPM: karvonen(maxHR, restingHR, def.maxPercent),
  }));
}
