import type { PlayerType, WorkoutType, SpecializationBonus } from '@/types';
import {
  SPECIALIZATION_MIN_CONFIDENCE,
  SPECIALIZATION_BONUS_BALANCED,
  SPECIALIZATION_BONUS_CATEGORY,
  SPECIALIZATION_BONUS_EXERCISE,
  STRENGTH_SPECIALIZATIONS,
} from '@/constants/player-types';

/**
 * Calculate whether a specialization bonus applies to a given workout.
 * Pure function — no side effects.
 */
export function calculateSpecializationBonus(
  playerType: PlayerType,
  workoutType: WorkoutType,
  exerciseName: string | null,
): SpecializationBonus {
  if (playerType.confidence < SPECIALIZATION_MIN_CONFIDENCE) {
    return { applies: false, multiplier: 1.0, reason: 'Insufficient data' };
  }

  if (playerType.category === 'balanced') {
    return {
      applies: true,
      multiplier: SPECIALIZATION_BONUS_BALANCED,
      reason: 'Balanced training bonus',
    };
  }

  const categoryMatchesWorkout =
    (playerType.category === 'strength_specialist' && workoutType === 'strength') ||
    (playerType.category === 'cardio_specialist' && workoutType === 'scout');

  if (!categoryMatchesWorkout) {
    return { applies: false, multiplier: 1.0, reason: 'Outside specialization' };
  }

  // Check exercise-level match for strength specialists
  if (
    playerType.category === 'strength_specialist' &&
    exerciseName != null &&
    playerType.specialization !== 'hybrid'
  ) {
    const specConfig =
      STRENGTH_SPECIALIZATIONS[
        playerType.specialization as keyof typeof STRENGTH_SPECIALIZATIONS
      ];

    if (specConfig?.exercises.includes(exerciseName)) {
      return {
        applies: true,
        multiplier: SPECIALIZATION_BONUS_EXERCISE,
        reason: `${playerType.display_name} bonus: ${exerciseName}`,
      };
    }
  }

  return {
    applies: true,
    multiplier: SPECIALIZATION_BONUS_CATEGORY,
    reason: `${playerType.display_name} category bonus`,
  };
}
