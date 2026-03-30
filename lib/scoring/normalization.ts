/**
 * Baseline normalization.
 *
 * Normalizes a raw score relative to the user's historical baseline,
 * so that beginners and advanced athletes contribute on a comparable scale.
 *
 * A user who improves 10% from their baseline contributes similarly
 * to another user who also improves 10%, regardless of absolute numbers.
 *
 * The normalized score blends absolute output with relative improvement
 * to ensure both effort and growth are rewarded.
 */

interface NormalizationInput {
  readonly rawScore: number;
  /** User's rolling average raw score (last 30 days). Null for first workout. */
  readonly baseline: number | null;
  /** Population median for this workout type. Used as fallback baseline. */
  readonly populationMedian: number;
}

/**
 * Normalize a raw score against the user's baseline.
 *
 * Formula:
 *   relative_component = raw / effective_baseline (clamped 0.5–2.0)
 *   normalized = raw × 0.6 + (relative_component × population_median) × 0.4
 *
 * The 60/40 blend ensures:
 * - 60% of score comes from actual output (rewards strong performers)
 * - 40% comes from relative effort (rewards beginners who push hard)
 */
export function normalizeScore(input: NormalizationInput): number {
  const effectiveBaseline = input.baseline ?? input.populationMedian;

  if (effectiveBaseline <= 0) {
    return input.rawScore;
  }

  const relativeComponent = Math.max(
    0.5,
    Math.min(2.0, input.rawScore / effectiveBaseline)
  );

  const absolutePart = input.rawScore * 0.6;
  const relativePart = relativeComponent * input.populationMedian * 0.4;

  return Math.round((absolutePart + relativePart) * 100) / 100;
}
