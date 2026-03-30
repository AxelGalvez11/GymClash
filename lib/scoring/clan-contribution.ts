import { GameConfig } from '@/constants/theme';
import type { ClanWarScore } from '@/types';

/**
 * Apply per-user daily contribution cap with diminishing returns.
 *
 * Scores up to the cap contribute 1:1.
 * Scores above the cap contribute at DIMINISHING_RETURNS_FACTOR rate.
 *
 * This prevents a single powerlifter or ultra-runner from carrying the clan.
 * Broad participation always beats one whale.
 */
export function applyContributionCap(score: number): number {
  const cap = GameConfig.DAILY_CONTRIBUTION_CAP;

  if (score <= cap) {
    return score;
  }

  const overflow = score - cap;
  return cap + overflow * GameConfig.DIMINISHING_RETURNS_FACTOR;
}

/**
 * Calculate a clan's weekly war score.
 *
 * Weighted blend of:
 * - total_output (30%): Sum of all members' capped contributions
 * - participation_rate (30%): Fraction of members who contributed at least once
 * - consistency_score (20%): Average days active per member / 7
 * - diversity_score (20%): Were both strength and scout workouts contributed?
 *
 * This ensures clans can't win by raw volume alone.
 * Full participation of casual members beats a few elite grinders.
 */
export function calculateClanWarScore(input: {
  readonly totalOutput: number;
  readonly activeMemberCount: number;
  readonly totalMemberCount: number;
  readonly avgDaysActivePerMember: number;
  readonly hasStrengthContributions: boolean;
  readonly hasScoutContributions: boolean;
  /** Normalization factor — highest total output across all active wars this week */
  readonly maxTotalOutput: number;
}): ClanWarScore {
  const normalizedOutput =
    input.maxTotalOutput > 0 ? input.totalOutput / input.maxTotalOutput : 0;

  const participationRate =
    input.totalMemberCount > 0
      ? input.activeMemberCount / input.totalMemberCount
      : 0;

  const consistencyScore = Math.min(
    1,
    input.avgDaysActivePerMember / 7
  );

  const diversityScore =
    (input.hasStrengthContributions ? 0.5 : 0) +
    (input.hasScoutContributions ? 0.5 : 0);

  const finalScore =
    normalizedOutput * GameConfig.WAR_WEIGHT_OUTPUT +
    participationRate * GameConfig.WAR_WEIGHT_PARTICIPATION +
    consistencyScore * GameConfig.WAR_WEIGHT_CONSISTENCY +
    diversityScore * GameConfig.WAR_WEIGHT_DIVERSITY;

  return {
    total_output: Math.round(normalizedOutput * 10000) / 10000,
    participation_rate: Math.round(participationRate * 10000) / 10000,
    consistency_score: Math.round(consistencyScore * 10000) / 10000,
    diversity_score: Math.round(diversityScore * 10000) / 10000,
    final_score: Math.round(finalScore * 10000) / 10000,
  };
}
