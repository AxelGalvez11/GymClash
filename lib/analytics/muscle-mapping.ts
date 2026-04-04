/**
 * Exercise-to-muscle mapping registry for GymClash.
 *
 * Maps free-text exercise names from StrengthSet.exercise
 * to muscle groups with contribution weights.
 *
 * Designed to work with GymClash's current data model where
 * exercises are stored as plain strings in workout JSON.
 */

export type MuscleGroup =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'abs'
  | 'quads'
  | 'calves'
  | 'upper_back'
  | 'lats'
  | 'lower_back'
  | 'glutes'
  | 'hamstrings';

export const FRONT_MUSCLES: readonly MuscleGroup[] = [
  'chest', 'shoulders', 'biceps', 'abs', 'quads', 'calves',
] as const;

export const BACK_MUSCLES: readonly MuscleGroup[] = [
  'upper_back', 'lats', 'triceps', 'lower_back', 'glutes', 'hamstrings', 'calves',
] as const;

export const ALL_MUSCLES: readonly MuscleGroup[] = [
  'chest', 'shoulders', 'biceps', 'triceps', 'abs', 'quads', 'calves',
  'upper_back', 'lats', 'lower_back', 'glutes', 'hamstrings',
] as const;

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  abs: 'Core',
  quads: 'Quads',
  calves: 'Calves',
  upper_back: 'Upper Back',
  lats: 'Lats',
  lower_back: 'Lower Back',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
};

interface MuscleContribution {
  readonly muscle: MuscleGroup;
  readonly weight: number; // 0.0-1.0
}

interface ExerciseMapping {
  readonly primary: readonly MuscleContribution[];
  readonly secondary: readonly MuscleContribution[];
}

/**
 * Registry of exercise-to-muscle mappings.
 * Keys are normalized exercise names (lowercase, trimmed).
 */
const EXERCISE_REGISTRY: Record<string, ExerciseMapping> = {
  // --- Chest ---
  'bench press': {
    primary: [{ muscle: 'chest', weight: 1.0 }],
    secondary: [{ muscle: 'triceps', weight: 0.4 }, { muscle: 'shoulders', weight: 0.3 }],
  },
  'incline bench': {
    primary: [{ muscle: 'chest', weight: 0.8 }, { muscle: 'shoulders', weight: 0.5 }],
    secondary: [{ muscle: 'triceps', weight: 0.3 }],
  },
  'push-ups': {
    primary: [{ muscle: 'chest', weight: 0.8 }],
    secondary: [{ muscle: 'triceps', weight: 0.4 }, { muscle: 'shoulders', weight: 0.3 }, { muscle: 'abs', weight: 0.2 }],
  },
  'dips': {
    primary: [{ muscle: 'chest', weight: 0.6 }, { muscle: 'triceps', weight: 0.6 }],
    secondary: [{ muscle: 'shoulders', weight: 0.3 }],
  },
  'chest fly': {
    primary: [{ muscle: 'chest', weight: 1.0 }],
    secondary: [{ muscle: 'shoulders', weight: 0.2 }],
  },

  // --- Shoulders ---
  'overhead press': {
    primary: [{ muscle: 'shoulders', weight: 1.0 }],
    secondary: [{ muscle: 'triceps', weight: 0.4 }, { muscle: 'upper_back', weight: 0.2 }],
  },
  'lateral raise': {
    primary: [{ muscle: 'shoulders', weight: 1.0 }],
    secondary: [],
  },
  'face pull': {
    primary: [{ muscle: 'shoulders', weight: 0.6 }, { muscle: 'upper_back', weight: 0.5 }],
    secondary: [],
  },

  // --- Back ---
  'pull-ups': {
    primary: [{ muscle: 'lats', weight: 1.0 }, { muscle: 'upper_back', weight: 0.5 }],
    secondary: [{ muscle: 'biceps', weight: 0.5 }],
  },
  'lat pulldown': {
    primary: [{ muscle: 'lats', weight: 1.0 }],
    secondary: [{ muscle: 'biceps', weight: 0.4 }, { muscle: 'upper_back', weight: 0.3 }],
  },
  'barbell row': {
    primary: [{ muscle: 'lats', weight: 0.7 }, { muscle: 'upper_back', weight: 0.7 }],
    secondary: [{ muscle: 'biceps', weight: 0.4 }, { muscle: 'lower_back', weight: 0.3 }],
  },
  'dumbbell row': {
    primary: [{ muscle: 'lats', weight: 0.8 }, { muscle: 'upper_back', weight: 0.5 }],
    secondary: [{ muscle: 'biceps', weight: 0.4 }],
  },

  // --- Arms ---
  'bicep curl': {
    primary: [{ muscle: 'biceps', weight: 1.0 }],
    secondary: [],
  },
  'hammer curl': {
    primary: [{ muscle: 'biceps', weight: 0.9 }],
    secondary: [],
  },
  'triceps pushdown': {
    primary: [{ muscle: 'triceps', weight: 1.0 }],
    secondary: [],
  },
  'skull crusher': {
    primary: [{ muscle: 'triceps', weight: 1.0 }],
    secondary: [],
  },

  // --- Legs ---
  'squat': {
    primary: [{ muscle: 'quads', weight: 1.0 }, { muscle: 'glutes', weight: 0.7 }],
    secondary: [{ muscle: 'hamstrings', weight: 0.3 }, { muscle: 'lower_back', weight: 0.3 }, { muscle: 'abs', weight: 0.2 }],
  },
  'front squat': {
    primary: [{ muscle: 'quads', weight: 1.0 }],
    secondary: [{ muscle: 'glutes', weight: 0.5 }, { muscle: 'abs', weight: 0.4 }],
  },
  'leg press': {
    primary: [{ muscle: 'quads', weight: 1.0 }, { muscle: 'glutes', weight: 0.5 }],
    secondary: [{ muscle: 'hamstrings', weight: 0.3 }],
  },
  'lunges': {
    primary: [{ muscle: 'quads', weight: 0.8 }, { muscle: 'glutes', weight: 0.7 }],
    secondary: [{ muscle: 'hamstrings', weight: 0.3 }, { muscle: 'calves', weight: 0.2 }],
  },
  'romanian deadlift': {
    primary: [{ muscle: 'hamstrings', weight: 1.0 }, { muscle: 'glutes', weight: 0.7 }],
    secondary: [{ muscle: 'lower_back', weight: 0.5 }],
  },
  'deadlift': {
    primary: [{ muscle: 'hamstrings', weight: 0.7 }, { muscle: 'glutes', weight: 0.7 }, { muscle: 'lower_back', weight: 0.6 }],
    secondary: [{ muscle: 'quads', weight: 0.4 }, { muscle: 'upper_back', weight: 0.4 }, { muscle: 'lats', weight: 0.3 }],
  },
  'hip thrust': {
    primary: [{ muscle: 'glutes', weight: 1.0 }],
    secondary: [{ muscle: 'hamstrings', weight: 0.4 }],
  },
  'calf raise': {
    primary: [{ muscle: 'calves', weight: 1.0 }],
    secondary: [],
  },
  'leg curl': {
    primary: [{ muscle: 'hamstrings', weight: 1.0 }],
    secondary: [],
  },
  'leg extension': {
    primary: [{ muscle: 'quads', weight: 1.0 }],
    secondary: [],
  },

  // --- Core ---
  'crunch': {
    primary: [{ muscle: 'abs', weight: 1.0 }],
    secondary: [],
  },
  'plank': {
    primary: [{ muscle: 'abs', weight: 1.0 }],
    secondary: [{ muscle: 'shoulders', weight: 0.2 }],
  },
  'sit-ups': {
    primary: [{ muscle: 'abs', weight: 1.0 }],
    secondary: [],
  },
  'leg raises': {
    primary: [{ muscle: 'abs', weight: 0.8 }],
    secondary: [{ muscle: 'quads', weight: 0.2 }],
  },
  'burpees': {
    primary: [{ muscle: 'abs', weight: 0.4 }, { muscle: 'quads', weight: 0.4 }, { muscle: 'chest', weight: 0.3 }],
    secondary: [{ muscle: 'shoulders', weight: 0.3 }, { muscle: 'triceps', weight: 0.2 }],
  },
  'mountain climbers': {
    primary: [{ muscle: 'abs', weight: 0.7 }],
    secondary: [{ muscle: 'shoulders', weight: 0.3 }, { muscle: 'quads', weight: 0.3 }],
  },
};

// Aliases: map variant names to canonical names
const EXERCISE_ALIASES: Record<string, string> = {
  'bench': 'bench press',
  'flat bench': 'bench press',
  'flat bench press': 'bench press',
  'incline bench press': 'incline bench',
  'incline press': 'incline bench',
  'push ups': 'push-ups',
  'pushups': 'push-ups',
  'push up': 'push-ups',
  'pushup': 'push-ups',
  'ohp': 'overhead press',
  'military press': 'overhead press',
  'shoulder press': 'overhead press',
  'pull ups': 'pull-ups',
  'pullups': 'pull-ups',
  'pull up': 'pull-ups',
  'pullup': 'pull-ups',
  'chin-ups': 'pull-ups',
  'chinups': 'pull-ups',
  'chin ups': 'pull-ups',
  'bent over row': 'barbell row',
  'pendlay row': 'barbell row',
  'db row': 'dumbbell row',
  'one arm row': 'dumbbell row',
  'curls': 'bicep curl',
  'biceps curl': 'bicep curl',
  'bicep curls': 'bicep curl',
  'dumbbell curl': 'bicep curl',
  'barbell curl': 'bicep curl',
  'tricep pushdown': 'triceps pushdown',
  'cable pushdown': 'triceps pushdown',
  'tricep extension': 'skull crusher',
  'triceps extension': 'skull crusher',
  'back squat': 'squat',
  'goblet squat': 'squat',
  'lunge': 'lunges',
  'walking lunges': 'lunges',
  'walking lunge': 'lunges',
  'rdl': 'romanian deadlift',
  'stiff leg deadlift': 'romanian deadlift',
  'calf raises': 'calf raise',
  'standing calf raise': 'calf raise',
  'seated calf raise': 'calf raise',
  'crunches': 'crunch',
  'ab crunch': 'crunch',
  'hanging leg raise': 'leg raises',
  'hanging leg raises': 'leg raises',
  'situps': 'sit-ups',
  'sit ups': 'sit-ups',
  'pistol squats': 'squat',
  'body rows': 'barbell row',
  'muscle-ups': 'pull-ups',
  'handstand push-ups': 'overhead press',
};

/**
 * Normalize an exercise name for lookup.
 */
export function normalizeExerciseName(name: string): string {
  const normalized = name.toLowerCase().trim();
  return EXERCISE_ALIASES[normalized] ?? normalized;
}

/**
 * Get the muscle mapping for an exercise.
 * Returns null if the exercise is not recognized.
 */
export function getExerciseMapping(exerciseName: string): ExerciseMapping | null {
  const normalized = normalizeExerciseName(exerciseName);
  return EXERCISE_REGISTRY[normalized] ?? null;
}

/**
 * Get all muscle contributions for an exercise.
 * Returns flat array of { muscle, weight } combining primary + secondary.
 */
export function getMuscleContributions(exerciseName: string): readonly MuscleContribution[] {
  const mapping = getExerciseMapping(exerciseName);
  if (!mapping) return [];
  return [...mapping.primary, ...mapping.secondary];
}
