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
  it('returns sweat_zone for 0-99 trophies', () => {
    expect(getArenaTier(0)).toBe('sweat_zone');
    expect(getArenaTier(50)).toBe('sweat_zone');
    expect(getArenaTier(99)).toBe('sweat_zone');
  });

  it('returns pump_room for 100-199 trophies', () => {
    expect(getArenaTier(100)).toBe('pump_room');
    expect(getArenaTier(199)).toBe('pump_room');
  });

  it('returns grindhouse for 200-349 trophies', () => {
    expect(getArenaTier(200)).toBe('grindhouse');
    expect(getArenaTier(349)).toBe('grindhouse');
  });

  it('returns rack_arena for 350-499 trophies', () => {
    expect(getArenaTier(350)).toBe('rack_arena');
    expect(getArenaTier(499)).toBe('rack_arena');
  });

  it('returns the_iron_yard for 500-649 trophies', () => {
    expect(getArenaTier(500)).toBe('the_iron_yard');
    expect(getArenaTier(649)).toBe('the_iron_yard');
  });

  it('returns barbell_pit for 650-799 trophies', () => {
    expect(getArenaTier(650)).toBe('barbell_pit');
    expect(getArenaTier(799)).toBe('barbell_pit');
  });

  it('returns plate_factory for 800-999 trophies', () => {
    expect(getArenaTier(800)).toBe('plate_factory');
    expect(getArenaTier(999)).toBe('plate_factory');
  });

  it('returns pr_chamber for 1000-1199 trophies', () => {
    expect(getArenaTier(1000)).toBe('pr_chamber');
    expect(getArenaTier(1199)).toBe('pr_chamber');
  });

  it('returns strength_circuit for 1200-1399 trophies', () => {
    expect(getArenaTier(1200)).toBe('strength_circuit');
    expect(getArenaTier(1399)).toBe('strength_circuit');
  });

  it('returns deadlift_den for 1400-1599 trophies', () => {
    expect(getArenaTier(1400)).toBe('deadlift_den');
    expect(getArenaTier(1599)).toBe('deadlift_den');
  });

  it('returns titan_training_grounds for 1600-1849 trophies', () => {
    expect(getArenaTier(1600)).toBe('titan_training_grounds');
    expect(getArenaTier(1849)).toBe('titan_training_grounds');
  });

  it('returns forge_of_strength for 1850-2099 trophies', () => {
    expect(getArenaTier(1850)).toBe('forge_of_strength');
    expect(getArenaTier(2099)).toBe('forge_of_strength');
  });

  it('returns arena_of_reps for 2100-2399 trophies', () => {
    expect(getArenaTier(2100)).toBe('arena_of_reps');
    expect(getArenaTier(2399)).toBe('arena_of_reps');
  });

  it('returns champions_floor for 2400-2699 trophies', () => {
    expect(getArenaTier(2400)).toBe('champions_floor');
    expect(getArenaTier(2699)).toBe('champions_floor');
  });

  it('returns iron_pantheon for 2700-2999 trophies', () => {
    expect(getArenaTier(2700)).toBe('iron_pantheon');
    expect(getArenaTier(2999)).toBe('iron_pantheon');
  });

  it('returns valhalla_barbell for 3000-3399 trophies', () => {
    expect(getArenaTier(3000)).toBe('valhalla_barbell');
    expect(getArenaTier(3399)).toBe('valhalla_barbell');
  });

  it('returns hall_of_ascension for 3400-3799 trophies', () => {
    expect(getArenaTier(3400)).toBe('hall_of_ascension');
    expect(getArenaTier(3799)).toBe('hall_of_ascension');
  });

  it('returns mount_olympus for 3800-4199 trophies', () => {
    expect(getArenaTier(3800)).toBe('mount_olympus');
    expect(getArenaTier(4199)).toBe('mount_olympus');
  });

  it('returns the_colosseum for 4200+ trophies', () => {
    expect(getArenaTier(4200)).toBe('the_colosseum');
    expect(getArenaTier(9999)).toBe('the_colosseum');
  });
});
