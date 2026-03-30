import {
  applyContributionCap,
  calculateClanWarScore,
} from '@/lib/scoring/clan-contribution';
import { GameConfig } from '@/constants/theme';

describe('applyContributionCap', () => {
  it('passes through scores below cap', () => {
    expect(applyContributionCap(300)).toBe(300);
  });

  it('returns exact cap value at the cap', () => {
    expect(applyContributionCap(GameConfig.DAILY_CONTRIBUTION_CAP)).toBe(
      GameConfig.DAILY_CONTRIBUTION_CAP
    );
  });

  it('applies diminishing returns above cap', () => {
    const cap = GameConfig.DAILY_CONTRIBUTION_CAP;
    const score = cap + 400;
    // cap + 400 × 0.25 = 500 + 100 = 600
    expect(applyContributionCap(score)).toBe(
      cap + 400 * GameConfig.DIMINISHING_RETURNS_FACTOR
    );
  });

  it('prevents single user from dominating clan score', () => {
    const whaleScore = 5000;
    const cappedWhale = applyContributionCap(whaleScore);
    const casualScoreSum = applyContributionCap(200) * 10; // 10 casual members

    // 10 casual members contributing 200 each = 2000
    // One whale at 5000 = cap + (5000-cap)*0.25
    expect(casualScoreSum).toBeGreaterThan(cappedWhale);
  });
});

describe('calculateClanWarScore', () => {
  it('returns perfect score for ideal clan', () => {
    const result = calculateClanWarScore({
      totalOutput: 10000,
      activeMemberCount: 30,
      totalMemberCount: 30,
      avgDaysActivePerMember: 7,
      hasStrengthContributions: true,
      hasScoutContributions: true,
      maxTotalOutput: 10000,
    });

    // All components = 1.0 → weighted sum = 1.0
    expect(result.final_score).toBe(1);
    expect(result.participation_rate).toBe(1);
    expect(result.consistency_score).toBe(1);
    expect(result.diversity_score).toBe(1);
  });

  it('penalizes low participation', () => {
    const fullParticipation = calculateClanWarScore({
      totalOutput: 5000,
      activeMemberCount: 30,
      totalMemberCount: 30,
      avgDaysActivePerMember: 3,
      hasStrengthContributions: true,
      hasScoutContributions: true,
      maxTotalOutput: 10000,
    });

    const lowParticipation = calculateClanWarScore({
      totalOutput: 5000,
      activeMemberCount: 5,
      totalMemberCount: 30,
      avgDaysActivePerMember: 3,
      hasStrengthContributions: true,
      hasScoutContributions: true,
      maxTotalOutput: 10000,
    });

    expect(fullParticipation.final_score).toBeGreaterThan(
      lowParticipation.final_score
    );
  });

  it('rewards diversity — both workout types', () => {
    const diverse = calculateClanWarScore({
      totalOutput: 5000,
      activeMemberCount: 15,
      totalMemberCount: 30,
      avgDaysActivePerMember: 3,
      hasStrengthContributions: true,
      hasScoutContributions: true,
      maxTotalOutput: 10000,
    });

    const liftOnly = calculateClanWarScore({
      totalOutput: 5000,
      activeMemberCount: 15,
      totalMemberCount: 30,
      avgDaysActivePerMember: 3,
      hasStrengthContributions: true,
      hasScoutContributions: false,
      maxTotalOutput: 10000,
    });

    expect(diverse.final_score).toBeGreaterThan(liftOnly.final_score);
    expect(diverse.diversity_score).toBe(1);
    expect(liftOnly.diversity_score).toBe(0.5);
  });

  it('handles zero member count gracefully', () => {
    const result = calculateClanWarScore({
      totalOutput: 0,
      activeMemberCount: 0,
      totalMemberCount: 0,
      avgDaysActivePerMember: 0,
      hasStrengthContributions: false,
      hasScoutContributions: false,
      maxTotalOutput: 0,
    });

    expect(result.final_score).toBe(0);
  });
});
