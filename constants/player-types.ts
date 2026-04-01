import { Colors } from './theme';
import type { CardioSpecialization, StrengthSpecialization, PlayerCategory } from '@/types';

/** Minimum workouts before specialization is assigned */
export const PLAYER_TYPE_MIN_WORKOUTS = 15;

/** Threshold for category assignment (> this = specialist) */
export const CATEGORY_THRESHOLD = 0.7;

/** Threshold for exercise dominance within strength */
export const EXERCISE_DOMINANCE_THRESHOLD = 0.4;

/** Specialization bonus multiplier */
export const SPECIALIZATION_BONUS_CATEGORY = 1.03;  // 3% for matching category
export const SPECIALIZATION_BONUS_EXERCISE = 1.05;  // 5% for matching specific exercise
export const SPECIALIZATION_BONUS_BALANCED = 1.02;   // 2% for balanced on any workout
export const SPECIALIZATION_MIN_CONFIDENCE = 0.6;

export const CARDIO_SPECIALIZATIONS: Record<CardioSpecialization, {
  readonly label: string;
  readonly icon: string;
  readonly description: string;
  readonly maxAvgDistanceKm: number;  // below this = this spec
}> = {
  sprinter: {
    label: 'Sprinter',
    icon: '⚡',
    description: 'Short, fast bursts',
    maxAvgDistanceKm: 3,
  },
  trail_runner: {
    label: 'Trail Runner',
    icon: '🏃',
    description: 'Medium distance specialist',
    maxAvgDistanceKm: 10,
  },
  marathoner: {
    label: 'Marathoner',
    icon: '🏅',
    description: 'Ultra-endurance runner',
    maxAvgDistanceKm: Infinity,
  },
};

export const STRENGTH_SPECIALIZATIONS: Record<StrengthSpecialization, {
  readonly label: string;
  readonly icon: string;
  readonly description: string;
  readonly exercises: readonly string[];  // exercises that count toward this spec
}> = {
  bench_baron: {
    label: 'Bench Baron',
    icon: '🏋️',
    description: 'Bench press specialist',
    exercises: ['Bench Press', 'Incline Bench Press', 'Dumbbell Bench Press'],
  },
  squat_king: {
    label: 'Squat King',
    icon: '👑',
    description: 'Squat specialist',
    exercises: ['Squat', 'Front Squat', 'Goblet Squat', 'Leg Press'],
  },
  deadlift_demon: {
    label: 'Deadlift Demon',
    icon: '😈',
    description: 'Deadlift specialist',
    exercises: ['Deadlift', 'Romanian Deadlift', 'Sumo Deadlift', 'Trap Bar Deadlift'],
  },
  all_rounder: {
    label: 'All-Rounder',
    icon: '💪',
    description: 'Well-balanced lifter',
    exercises: [],
  },
};

export const CATEGORY_CONFIG: Record<PlayerCategory, {
  readonly label: string;
  readonly icon: string;
  readonly color: string;
}> = {
  cardio_specialist: { label: 'Cardio Specialist', icon: '🏃', color: Colors.info },
  strength_specialist: { label: 'Strength Specialist', icon: '🏋️', color: Colors.danger },
  balanced: { label: 'Balanced', icon: '⚡', color: Colors.brand.DEFAULT },
};
