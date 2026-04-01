import { useMemo } from 'react';

import { StreakTiers, getStreakTier } from '@/constants/theme';
import type { StreakTierConfig } from '@/types';

const MILESTONE_DAYS = [7, 14, 30, 60, 100] as const;

interface StreakMilestoneResult {
  readonly isMilestone: boolean;
  readonly tier: StreakTierConfig;
  readonly previousTier: StreakTierConfig | null;
}

export function useStreakMilestone(streakCount: number): StreakMilestoneResult {
  return useMemo(() => {
    const tier = getStreakTier(streakCount);
    const isMilestone = MILESTONE_DAYS.includes(streakCount as typeof MILESTONE_DAYS[number]);

    // Find previous tier: the tier just below the current one in the StreakTiers array
    const currentIndex = StreakTiers.findIndex((t) => t.tier === tier.tier);
    const previousTier = currentIndex > 0 ? StreakTiers[currentIndex - 1] : null;

    return { isMilestone, tier, previousTier };
  }, [streakCount]);
}
