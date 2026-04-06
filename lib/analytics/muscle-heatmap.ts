/**
 * Muscle heatmap calculation engine for GymClash.
 *
 * Processes actual workout data from Supabase (StrengthSet[])
 * to compute per-muscle load intensity for visualization.
 *
 * Data flow:
 * 1. useMyWorkouts(100) returns workout history with sets[]
 * 2. Filter by timeframe (7/14/30 days)
 * 3. For each set: volume = sets x reps x weight_kg
 * 4. Map exercise -> muscles via muscle-mapping registry
 * 5. Distribute volume across muscles with contribution weights
 * 6. Normalize per-user (relative to their own max muscle load)
 * 7. Convert to heat levels for SVG fill colors
 */

import type { StrengthSet } from '@/types';
import {
  type MuscleGroup,
  ALL_MUSCLES,
  getMuscleContributions,
  normalizeExerciseName,
} from './muscle-mapping';

export type HeatLevel = 'cold' | 'warm' | 'hot' | 'maxed';
export type TimeWindow = '1D' | '7D' | '14D' | '30D';

export interface MuscleLoadResult {
  readonly muscle: MuscleGroup;
  readonly rawLoad: number;        // Total volume x weight contribution
  readonly normalizedIntensity: number; // 0.0-1.0 (relative to user's max)
  readonly heatLevel: HeatLevel;
  readonly setCount: number;       // Total sets targeting this muscle
}

export interface HeatmapData {
  readonly muscles: ReadonlyMap<MuscleGroup, MuscleLoadResult>;
  readonly timeWindow: TimeWindow;
  readonly totalVolume: number;
  readonly workoutCount: number;
  readonly unmappedExercises: readonly string[];
}

// --- Heat Colors (Victory Peak palette) ---

export const HEAT_COLORS: Record<HeatLevel, string> = {
  cold: '#23233f',                // Surface dark -- no heat
  warm: 'rgba(206,150,255,0.35)', // Light purple glow
  hot: 'rgba(206,150,255,0.65)',  // Medium purple glow
  maxed: '#ce96ff',               // Full bright purple (100% glow)
};

export const HEAT_GLOW: Record<HeatLevel, number> = {
  cold: 0,
  warm: 0.3,
  hot: 0.55,
  maxed: 0.85,
};

// --- Time filtering ---

const TIMEFRAME_MS: Record<TimeWindow, number> = {
  '1D': 1 * 24 * 60 * 60 * 1000,
  '7D': 7 * 24 * 60 * 60 * 1000,
  '14D': 14 * 24 * 60 * 60 * 1000,
  '30D': 30 * 24 * 60 * 60 * 1000,
};

function isWithinTimeframe(
  workoutDate: string,
  timeWindow: TimeWindow,
): boolean {
  const cutoff = Date.now() - TIMEFRAME_MS[timeWindow];
  return new Date(workoutDate).getTime() >= cutoff;
}

// --- Heat level from intensity ---

function intensityToHeatLevel(intensity: number): HeatLevel {
  if (intensity >= 0.75) return 'maxed';
  if (intensity >= 0.45) return 'hot';
  if (intensity >= 0.15) return 'warm';
  return 'cold';
}

// --- Bodyweight handling ---

const BODYWEIGHT_EXERCISES = new Set([
  'push-ups', 'pull-ups', 'dips', 'sit-ups', 'plank',
  'burpees', 'lunges', 'mountain climbers', 'chin-ups',
  'muscle-ups', 'pistol squats', 'handstand push-ups',
  'body rows', 'crunches', 'leg raises',
]);

function effectiveWeight(
  exerciseName: string,
  loggedWeight: number,
  bodyWeightKg: number | null,
): number {
  if (loggedWeight > 0) return loggedWeight;

  const normalized = normalizeExerciseName(exerciseName);
  if (BODYWEIGHT_EXERCISES.has(normalized) && bodyWeightKg && bodyWeightKg > 0) {
    // Use body weight as estimated load (partial for some exercises)
    return bodyWeightKg * 0.65; // ~65% of BW is a reasonable average
  }

  // Fallback for unknown bodyweight exercises
  return 30; // Conservative default
}

// --- Main calculation ---

export interface CalculateHeatmapInput {
  readonly workouts: readonly {
    readonly type: string;
    readonly started_at: string;
    readonly sets: readonly StrengthSet[] | null;
  }[];
  readonly timeWindow: TimeWindow;
  readonly bodyWeightKg: number | null;
}

export function calculateMuscleHeatmap(input: CalculateHeatmapInput): HeatmapData {
  const { workouts, timeWindow, bodyWeightKg } = input;

  // Initialize loads
  const loads = Object.fromEntries(
    ALL_MUSCLES.map((muscle) => [muscle, { rawLoad: 0, setCount: 0 }]),
  ) as Record<MuscleGroup, { rawLoad: number; setCount: number }>;

  let totalVolume = 0;
  let workoutCount = 0;
  const unmapped = new Set<string>();

  for (const workout of workouts) {
    // Only process strength workouts within timeframe
    if (workout.type !== 'strength') continue;
    if (!isWithinTimeframe(workout.started_at, timeWindow)) continue;
    if (!workout.sets) continue;

    workoutCount++;

    for (const set of workout.sets) {
      const weight = effectiveWeight(set.exercise, set.weight_kg, bodyWeightKg);
      const volume = set.sets * set.reps * weight;
      totalVolume += volume;

      const contributions = getMuscleContributions(set.exercise);

      if (contributions.length === 0) {
        unmapped.add(set.exercise);
        continue;
      }

      for (const { muscle, weight: muscleWeight } of contributions) {
        loads[muscle].rawLoad += volume * muscleWeight;
        loads[muscle].setCount += set.sets;
      }
    }
  }

  // Normalize: relative to user's own max muscle load
  const maxLoad = Math.max(...Object.values(loads).map((l) => l.rawLoad), 1);

  const muscles = new Map<MuscleGroup, MuscleLoadResult>();
  for (const muscle of ALL_MUSCLES) {
    const { rawLoad, setCount } = loads[muscle];
    const normalizedIntensity = rawLoad / maxLoad;
    muscles.set(muscle, {
      muscle,
      rawLoad: Math.round(rawLoad),
      normalizedIntensity: Math.round(normalizedIntensity * 100) / 100,
      heatLevel: intensityToHeatLevel(normalizedIntensity),
      setCount,
    });
  }

  return {
    muscles,
    timeWindow,
    totalVolume: Math.round(totalVolume),
    workoutCount,
    unmappedExercises: Array.from(unmapped),
  };
}

/**
 * Get the fill color for a specific muscle.
 */
export function getMuscleColor(data: HeatmapData, muscle: MuscleGroup): string {
  const result = data.muscles.get(muscle);
  if (!result) return HEAT_COLORS.cold;
  return HEAT_COLORS[result.heatLevel];
}

/**
 * Get the glow opacity for a muscle (for SVG effects).
 */
export function getMuscleGlow(data: HeatmapData, muscle: MuscleGroup): number {
  const result = data.muscles.get(muscle);
  if (!result) return 0;
  return HEAT_GLOW[result.heatLevel];
}
