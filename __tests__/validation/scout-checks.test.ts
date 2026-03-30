import {
  checkImpossibleSpeed,
  checkPaceSanity,
  checkRouteSanity,
  validateScoutWorkout,
} from '@/lib/validation/scout-checks';
import type { RouteData } from '@/types';

describe('checkImpossibleSpeed', () => {
  it('passes for normal running speed', () => {
    const route: RouteData = {
      distance_km: 10,
      avg_pace_min_per_km: 5.5,
      elevation_gain_m: 100,
    };
    const result = checkImpossibleSpeed(route, 3300); // 55 min
    expect(result.passed).toBe(true);
    expect(result.reason_code).toBe('clean');
  });

  it('fails for impossibly fast speed (driving)', () => {
    const route: RouteData = {
      distance_km: 50,
      avg_pace_min_per_km: 2.0,
      elevation_gain_m: 0,
    };
    // 50km in 30 min = 100 km/h
    const result = checkImpossibleSpeed(route, 1800);
    expect(result.passed).toBe(false);
    expect(result.reason_code).toBe('impossible_speed');
    expect(result.confidence_impact).toBeLessThan(0);
  });

  it('passes at the boundary of elite sprinting', () => {
    const route: RouteData = {
      distance_km: 5,
      avg_pace_min_per_km: 3.0,
      elevation_gain_m: 0,
    };
    // 5km in 15 min = 20 km/h (fast but possible)
    const result = checkImpossibleSpeed(route, 900);
    expect(result.passed).toBe(true);
  });
});

describe('checkPaceSanity', () => {
  it('passes for normal pace', () => {
    const result = checkPaceSanity({
      distance_km: 5,
      avg_pace_min_per_km: 5.5,
      elevation_gain_m: 0,
    });
    expect(result.passed).toBe(true);
  });

  it('fails for impossibly fast pace', () => {
    const result = checkPaceSanity({
      distance_km: 5,
      avg_pace_min_per_km: 1.5,
      elevation_gain_m: 0,
    });
    expect(result.passed).toBe(false);
    expect(result.reason_code).toBe('route_sanity_fail');
  });

  it('fails for extremely slow pace (not really running)', () => {
    const result = checkPaceSanity({
      distance_km: 1,
      avg_pace_min_per_km: 25,
      elevation_gain_m: 0,
    });
    expect(result.passed).toBe(false);
  });
});

describe('checkRouteSanity', () => {
  it('passes when implied pace matches reported pace', () => {
    const result = checkRouteSanity(
      { distance_km: 5, avg_pace_min_per_km: 6.0, elevation_gain_m: 0 },
      1800 // 30 min → 6:00/km
    );
    expect(result.passed).toBe(true);
  });

  it('fails when duration and distance mismatch', () => {
    const result = checkRouteSanity(
      { distance_km: 10, avg_pace_min_per_km: 5.0, elevation_gain_m: 0 },
      600 // 10 min for 10km → 1:00/km implied, but reports 5:00/km
    );
    expect(result.passed).toBe(false);
  });

  it('fails for zero duration', () => {
    const result = checkRouteSanity(
      { distance_km: 5, avg_pace_min_per_km: 6.0, elevation_gain_m: 0 },
      0
    );
    expect(result.passed).toBe(false);
  });
});

describe('validateScoutWorkout', () => {
  it('returns all clean for a legitimate workout', () => {
    const results = validateScoutWorkout(
      { distance_km: 5, avg_pace_min_per_km: 5.5, elevation_gain_m: 50 },
      1650 // 27.5 min
    );
    expect(results.every((r) => r.passed)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it('catches multiple issues for a clearly fake workout', () => {
    const results = validateScoutWorkout(
      { distance_km: 100, avg_pace_min_per_km: 1.0, elevation_gain_m: 0 },
      600 // 10 min for 100km
    );
    const failures = results.filter((r) => !r.passed);
    expect(failures.length).toBeGreaterThanOrEqual(2);
  });
});
