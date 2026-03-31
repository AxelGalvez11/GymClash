import { TrophyRewards, getArenaTier } from '@/constants/theme';

describe('TrophyRewards', () => {
  it('awards 12 trophies for accepted workout', () => {
    expect(TrophyRewards.ACCEPTED_WORKOUT).toBe(12);
  });

  it('awards 8 trophies for low confidence workout', () => {
    expect(TrophyRewards.LOW_CONFIDENCE_WORKOUT).toBe(8);
  });

  it('awards 6 trophies for daily goal completion', () => {
    expect(TrophyRewards.DAILY_GOAL_COMPLETE).toBe(6);
  });

  it('awards 4 trophies for active recovery', () => {
    expect(TrophyRewards.ACTIVE_RECOVERY).toBe(4);
  });

  it('awards 30 trophies for clan war win', () => {
    expect(TrophyRewards.CLAN_WAR_WIN).toBe(30);
  });

  it('deducts 15 trophies for clan war loss', () => {
    expect(TrophyRewards.CLAN_WAR_LOSS).toBe(-15);
  });

  it('deducts 5 trophies for missed day', () => {
    expect(TrophyRewards.MISSED_DAY_DECAY).toBe(-5);
  });
});

describe('getArenaTier', () => {
  it('returns rustyard for 0-299 trophies', () => {
    expect(getArenaTier(0)).toBe('rustyard');
    expect(getArenaTier(150)).toBe('rustyard');
    expect(getArenaTier(299)).toBe('rustyard');
  });

  it('returns iron_forge for 300-699 trophies', () => {
    expect(getArenaTier(300)).toBe('iron_forge');
    expect(getArenaTier(500)).toBe('iron_forge');
    expect(getArenaTier(699)).toBe('iron_forge');
  });

  it('returns titan_vault for 700-1199 trophies', () => {
    expect(getArenaTier(700)).toBe('titan_vault');
    expect(getArenaTier(999)).toBe('titan_vault');
    expect(getArenaTier(1199)).toBe('titan_vault');
  });

  it('returns apex_colosseum for 1200+ trophies', () => {
    expect(getArenaTier(1200)).toBe('apex_colosseum');
    expect(getArenaTier(5000)).toBe('apex_colosseum');
  });
});
