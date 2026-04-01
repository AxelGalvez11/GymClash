import type { PlayerType } from '@/types';
import {
  CARDIO_SPECIALIZATIONS,
  STRENGTH_SPECIALIZATIONS,
  CATEGORY_CONFIG,
} from '@/constants/player-types';
import type { CardioSpecialization, StrengthSpecialization } from '@/types';

/** Returns the emoji icon for a player type. */
export function getPlayerTypeIcon(type: PlayerType): string {
  if (type.category === 'cardio_specialist' && type.specialization !== 'hybrid') {
    return CARDIO_SPECIALIZATIONS[type.specialization as CardioSpecialization].icon;
  }
  if (type.category === 'strength_specialist' && type.specialization !== 'hybrid') {
    return STRENGTH_SPECIALIZATIONS[type.specialization as StrengthSpecialization].icon;
  }
  return CATEGORY_CONFIG[type.category].icon;
}

/** Returns the accent color for a player type. */
export function getPlayerTypeColor(type: PlayerType): string {
  return CATEGORY_CONFIG[type.category].color;
}

/** Returns the human-readable description for a player type. */
export function getPlayerTypeDescription(type: PlayerType): string {
  if (type.category === 'cardio_specialist' && type.specialization !== 'hybrid') {
    return CARDIO_SPECIALIZATIONS[type.specialization as CardioSpecialization].description;
  }
  if (type.category === 'strength_specialist' && type.specialization !== 'hybrid') {
    return STRENGTH_SPECIALIZATIONS[type.specialization as StrengthSpecialization].description;
  }
  return 'Versatile athlete with balanced training';
}
