import { applyWeeklyContributionCap } from '@/lib/scoring/clan-contribution';
import { GameConfig } from '@/constants/theme';

describe('applyWeeklyContributionCap', () => {
  it('allows full contribution when weekly total is 0', () => {
    expect(applyWeeklyContributionCap(500, 0)).toBe(500);
  });

  it('allows full contribution when below weekly cap', () => {
    expect(applyWeeklyContributionCap(500, 10000)).toBe(500);
  });

  it('caps contribution when it would exceed weekly limit', () => {
    const remaining = GameConfig.WEEKLY_CONTRIBUTION_CAP - 19800; // 200 remaining
    expect(applyWeeklyContributionCap(500, 19800)).toBe(200);
  });

  it('returns 0 when weekly cap is already reached', () => {
    expect(applyWeeklyContributionCap(500, 20000)).toBe(0);
    expect(applyWeeklyContributionCap(500, 25000)).toBe(0);
  });

  it('returns exactly the remaining amount when contribution equals remaining', () => {
    expect(applyWeeklyContributionCap(200, 19800)).toBe(200);
  });

  it('uses the configured WEEKLY_CONTRIBUTION_CAP', () => {
    expect(GameConfig.WEEKLY_CONTRIBUTION_CAP).toBe(20000);
  });
});
