import {
  calculateConfidence,
  determineValidationStatus,
  buildWorkoutValidation,
} from '@/lib/validation/confidence';
import type { ValidationResult } from '@/types';

const cleanCheck: ValidationResult = {
  validation_type: 'test_check',
  passed: true,
  confidence_impact: 0,
  reason_code: 'clean',
  details: {},
};

const warningCheck: ValidationResult = {
  validation_type: 'test_warning',
  passed: false,
  confidence_impact: -0.3,
  reason_code: 'pace_cadence_mismatch',
  details: {},
};

const criticalCheck: ValidationResult = {
  validation_type: 'test_critical',
  passed: false,
  confidence_impact: -0.8,
  reason_code: 'impossible_speed',
  details: {},
};

describe('calculateConfidence', () => {
  it('returns high confidence for all clean checks from wearable', () => {
    const confidence = calculateConfidence([cleanCheck, cleanCheck], 'wearable');
    expect(confidence).toBe(1.0); // 0.9 + 0.1 = 1.0
  });

  it('returns base confidence for clean manual entry', () => {
    const confidence = calculateConfidence([cleanCheck], 'manual');
    expect(confidence).toBe(0.9);
  });

  it('reduces confidence for failed checks', () => {
    const confidence = calculateConfidence([cleanCheck, warningCheck], 'sensor');
    // 0.95 + (-0.3) = 0.65
    expect(confidence).toBeCloseTo(0.65);
  });

  it('floors at 0 for multiple critical failures', () => {
    const confidence = calculateConfidence(
      [criticalCheck, criticalCheck],
      'manual'
    );
    // 0.9 + (-0.8) + (-0.8) = -0.7 → clamped to 0
    expect(confidence).toBe(0);
  });

  it('wearable source gets higher baseline than manual', () => {
    const wearable = calculateConfidence([warningCheck], 'wearable');
    const manual = calculateConfidence([warningCheck], 'manual');
    expect(wearable).toBeGreaterThan(manual);
  });
});

describe('determineValidationStatus', () => {
  it('accepts high confidence workouts', () => {
    expect(determineValidationStatus(0.9, [cleanCheck])).toBe('accepted');
  });

  it('accepts with low confidence at medium scores', () => {
    expect(determineValidationStatus(0.7, [warningCheck])).toBe(
      'accepted_with_low_confidence'
    );
  });

  it('excludes from clan at lower confidence', () => {
    expect(determineValidationStatus(0.5, [warningCheck])).toBe(
      'excluded_from_clan_score'
    );
  });

  it('holds for review at very low confidence', () => {
    expect(determineValidationStatus(0.3, [warningCheck])).toBe(
      'held_for_review'
    );
  });

  it('rejects on critical failure regardless of score', () => {
    expect(determineValidationStatus(0.5, [criticalCheck])).toBe('rejected');
  });

  it('rejects at near-zero confidence', () => {
    expect(determineValidationStatus(0.1, [warningCheck])).toBe('rejected');
  });
});

describe('buildWorkoutValidation', () => {
  it('produces a complete validation for clean workout', () => {
    const validation = buildWorkoutValidation(
      [cleanCheck, cleanCheck],
      'sensor'
    );
    expect(validation.status).toBe('accepted');
    expect(validation.confidence_score).toBeGreaterThan(0.8);
    expect(validation.checks).toHaveLength(2);
  });

  it('produces held_for_review for suspicious workout', () => {
    const validation = buildWorkoutValidation(
      [warningCheck, warningCheck],
      'manual'
    );
    // 0.9 - 0.3 - 0.3 = 0.3
    expect(validation.status).toBe('held_for_review');
    expect(validation.confidence_score).toBeCloseTo(0.3);
  });

  it('rejects clearly fraudulent workout', () => {
    const validation = buildWorkoutValidation(
      [criticalCheck],
      'manual'
    );
    expect(validation.status).toBe('rejected');
    expect(validation.confidence_score).toBeLessThan(0.2);
  });
});
