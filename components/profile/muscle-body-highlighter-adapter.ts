import type { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';

import { getMuscleColor, type HeatmapData } from '@/lib/analytics/muscle-heatmap';
import type { MuscleGroup } from '@/lib/analytics/muscle-mapping';

export type MuscleHeatmapView = 'front' | 'back';
export type BodyHighlighterGender = 'male' | 'female';

interface BodyHighlighterRegion {
  readonly slug: Slug;
  readonly muscle: MuscleGroup;
  readonly view: MuscleHeatmapView;
}

const BODY_HIGHLIGHTER_REGIONS: readonly BodyHighlighterRegion[] = [
  { slug: 'chest', muscle: 'chest', view: 'front' },
  { slug: 'deltoids', muscle: 'shoulders', view: 'front' },
  { slug: 'biceps', muscle: 'biceps', view: 'front' },
  { slug: 'abs', muscle: 'abs', view: 'front' },
  { slug: 'obliques', muscle: 'abs', view: 'front' },
  { slug: 'quadriceps', muscle: 'quads', view: 'front' },
  { slug: 'calves', muscle: 'calves', view: 'front' },
  { slug: 'trapezius', muscle: 'upper_back', view: 'back' },
  { slug: 'upper-back', muscle: 'lats', view: 'back' },
  { slug: 'triceps', muscle: 'triceps', view: 'back' },
  { slug: 'lower-back', muscle: 'lower_back', view: 'back' },
  { slug: 'gluteal', muscle: 'glutes', view: 'back' },
  { slug: 'hamstring', muscle: 'hamstrings', view: 'back' },
  { slug: 'calves', muscle: 'calves', view: 'back' },
] as const;

const DEFAULT_REGION_STROKE = 'rgba(206,150,255,0.18)';
const SELECTED_REGION_STROKE = '#f5d0fe';

const SLUG_TO_MUSCLE_BY_VIEW: Readonly<Record<string, MuscleGroup>> = BODY_HIGHLIGHTER_REGIONS.reduce<Record<string, MuscleGroup>>(
  (map, region) => {
    map[`${region.view}:${region.slug}`] = region.muscle;
    return map;
  },
  {},
);

export const BODY_HIGHLIGHTER_HIDDEN_PARTS: readonly Slug[] = ['hair'] as const;

interface BuildBodyHighlighterDataInput {
  readonly heatmapData: HeatmapData;
  readonly selectedMuscle: MuscleGroup | null;
  readonly view: MuscleHeatmapView;
}

export function buildBodyHighlighterData({
  heatmapData,
  selectedMuscle,
  view,
}: BuildBodyHighlighterDataInput): ExtendedBodyPart[] {
  return BODY_HIGHLIGHTER_REGIONS
    .filter((region) => region.view === view)
    .map((region) => {
      const isSelected = selectedMuscle === region.muscle;

      return {
        slug: region.slug,
        color: getMuscleColor(heatmapData, region.muscle),
        styles: {
          stroke: isSelected ? SELECTED_REGION_STROKE : DEFAULT_REGION_STROKE,
          strokeWidth: isSelected ? 2 : 0.9,
        },
      };
    });
}

export function resolveMuscleGroupFromBodyPart(
  slug: Slug | undefined,
  view: MuscleHeatmapView,
): MuscleGroup | null {
  if (!slug) return null;
  return SLUG_TO_MUSCLE_BY_VIEW[`${view}:${slug}`] ?? null;
}

export function resolveBodyHighlighterGender(
  biologicalSex: string | null | undefined,
): BodyHighlighterGender | undefined {
  const normalized = biologicalSex?.trim().toLowerCase();

  if (normalized === 'female' || normalized === 'f') {
    return 'female';
  }

  if (normalized === 'male' || normalized === 'm') {
    return 'male';
  }

  return undefined;
}
