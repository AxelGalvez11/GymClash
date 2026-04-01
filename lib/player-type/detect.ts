import type {
  PlayerType,
  PlayerTypeDetectionInput,
  StrengthSpecialization,
  CardioSpecialization,
} from '@/types';
import {
  PLAYER_TYPE_MIN_WORKOUTS,
  CATEGORY_THRESHOLD,
  EXERCISE_DOMINANCE_THRESHOLD,
  STRENGTH_SPECIALIZATIONS,
  CARDIO_SPECIALIZATIONS,
  CATEGORY_CONFIG,
} from '@/constants/player-types';

const DEFAULT_PLAYER_TYPE: PlayerType = {
  category: 'balanced',
  specialization: 'hybrid',
  display_name: 'Recruit',
  confidence: 0,
  dominant_exercises: [],
  strength_pct: 0,
  scout_pct: 0,
};

/**
 * Detect a player's type based on workout history.
 * Pure function — no side effects.
 */
export function detectPlayerType(input: PlayerTypeDetectionInput): PlayerType {
  const { workouts } = input;
  const workoutCount = workouts.length;

  if (workoutCount < PLAYER_TYPE_MIN_WORKOUTS) {
    return DEFAULT_PLAYER_TYPE;
  }

  const strengthWorkouts = workouts.filter((w) => w.type === 'strength');
  const scoutWorkouts = workouts.filter((w) => w.type === 'scout');
  const relevantCount = strengthWorkouts.length + scoutWorkouts.length;

  // Avoid division by zero when all workouts are active_recovery/hiit
  if (relevantCount === 0) {
    return {
      ...DEFAULT_PLAYER_TYPE,
      confidence: Math.min(1.0, workoutCount / 30),
    };
  }

  const strength_pct = strengthWorkouts.length / relevantCount;
  const scout_pct = scoutWorkouts.length / relevantCount;
  const confidence = Math.min(1.0, workoutCount / 30);
  const dominant_exercises = getDominantExercises(strengthWorkouts);

  if (strength_pct > CATEGORY_THRESHOLD) {
    const specialization = detectStrengthSpecialization(strengthWorkouts);
    return {
      category: 'strength_specialist',
      specialization,
      display_name: getDisplayName('strength_specialist', specialization),
      confidence,
      dominant_exercises,
      strength_pct,
      scout_pct,
    };
  }

  if (scout_pct > CATEGORY_THRESHOLD) {
    const specialization = detectCardioSpecialization(scoutWorkouts);
    return {
      category: 'cardio_specialist',
      specialization,
      display_name: getDisplayName('cardio_specialist', specialization),
      confidence,
      dominant_exercises,
      strength_pct,
      scout_pct,
    };
  }

  return {
    category: 'balanced',
    specialization: 'hybrid',
    display_name: CATEGORY_CONFIG.balanced.label,
    confidence,
    dominant_exercises,
    strength_pct,
    scout_pct,
  };
}

function detectStrengthSpecialization(
  strengthWorkouts: PlayerTypeDetectionInput['workouts'],
): StrengthSpecialization {
  const setCounts: Record<string, number> = {};
  let totalSets = 0;

  for (const workout of strengthWorkouts) {
    if (workout.sets == null) continue;
    for (const set of workout.sets) {
      const name = set.exercise;
      setCounts[name] = (setCounts[name] ?? 0) + set.sets;
      totalSets += set.sets;
    }
  }

  if (totalSets === 0) return 'all_rounder';

  // Check each specialization's exercises for dominance
  const specEntries = Object.entries(STRENGTH_SPECIALIZATIONS) as ReadonlyArray<
    [StrengthSpecialization, (typeof STRENGTH_SPECIALIZATIONS)[StrengthSpecialization]]
  >;

  for (const [specKey, specConfig] of specEntries) {
    if (specConfig.exercises.length === 0) continue;

    const specSets = specConfig.exercises.reduce(
      (sum, exercise) => sum + (setCounts[exercise] ?? 0),
      0,
    );

    if (specSets / totalSets > EXERCISE_DOMINANCE_THRESHOLD) {
      return specKey;
    }
  }

  return 'all_rounder';
}

function detectCardioSpecialization(
  scoutWorkouts: PlayerTypeDetectionInput['workouts'],
): CardioSpecialization {
  const distances = scoutWorkouts
    .map((w) => w.route_data?.distance_km)
    .filter((d): d is number => d != null);

  if (distances.length === 0) return 'trail_runner';

  const avgDistance =
    distances.reduce((sum, d) => sum + d, 0) / distances.length;

  if (avgDistance < CARDIO_SPECIALIZATIONS.sprinter.maxAvgDistanceKm) {
    return 'sprinter';
  }
  if (avgDistance < CARDIO_SPECIALIZATIONS.trail_runner.maxAvgDistanceKm) {
    return 'trail_runner';
  }
  return 'marathoner';
}

function getDominantExercises(
  strengthWorkouts: PlayerTypeDetectionInput['workouts'],
): readonly string[] {
  const freq: Record<string, number> = {};

  for (const workout of strengthWorkouts) {
    if (workout.sets == null) continue;
    for (const set of workout.sets) {
      freq[set.exercise] = (freq[set.exercise] ?? 0) + set.sets;
    }
  }

  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name]) => name);
}

function getDisplayName(
  category: 'strength_specialist' | 'cardio_specialist',
  specialization: StrengthSpecialization | CardioSpecialization,
): string {
  if (category === 'strength_specialist') {
    return STRENGTH_SPECIALIZATIONS[specialization as StrengthSpecialization].label;
  }
  return CARDIO_SPECIALIZATIONS[specialization as CardioSpecialization].label;
}
