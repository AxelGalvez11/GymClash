import type { ValidationResult, ValidationStatus, WorkoutValidation, EvidenceSource } from '@/types';

/**
 * Trust level bonus by evidence source.
 * Higher-trust sources start with a higher baseline confidence.
 */
const SOURCE_TRUST_BONUS: Record<EvidenceSource, number> = {
  wearable: 0.1,
  sensor: 0.05,
  manual: 0,
};

/**
 * Calculate the final confidence score from validation check results.
 *
 * Starts at a base confidence (1.0 for wearable, 0.95 for sensor, 0.9 for manual),
 * then applies negative impacts from failed checks.
 *
 * Floor: 0.0 (fully untrusted)
 * Ceiling: 1.0 (fully trusted)
 */
export function calculateConfidence(
  checks: readonly ValidationResult[],
  source: EvidenceSource
): number {
  const baseConfidence = 0.9 + SOURCE_TRUST_BONUS[source];

  const totalImpact = checks.reduce(
    (sum, check) => sum + (check.passed ? 0 : check.confidence_impact),
    0
  );

  return Math.max(0, Math.min(1, baseConfidence + totalImpact));
}

/**
 * Determine the validation status based on the confidence score
 * and the severity of failed checks.
 */
export function determineValidationStatus(
  confidence: number,
  checks: readonly ValidationResult[]
): ValidationStatus {
  const hasCriticalFailure = checks.some(
    (c) => !c.passed && c.confidence_impact <= -0.7
  );

  if (hasCriticalFailure || confidence < 0.2) {
    return 'rejected';
  }

  if (confidence < 0.4) {
    return 'held_for_review';
  }

  if (confidence < 0.6) {
    return 'excluded_from_clan_score';
  }

  if (confidence < 0.8) {
    return 'accepted_with_low_confidence';
  }

  return 'accepted';
}

/**
 * Produce a complete workout validation result.
 */
export function buildWorkoutValidation(
  checks: readonly ValidationResult[],
  source: EvidenceSource
): WorkoutValidation {
  const confidence = calculateConfidence(checks, source);
  const status = determineValidationStatus(confidence, checks);

  return {
    status,
    confidence_score: Math.round(confidence * 1000) / 1000,
    checks,
  };
}
