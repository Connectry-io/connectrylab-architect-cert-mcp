/**
 * Calibration Bucket Analysis — Domain 5.5
 *
 * Task Statements Covered:
 *   5.5: Human review workflows — calibration bucket analysis, threshold
 *        adjustment based on human corrections
 *
 * Key Insights:
 *   - A well-calibrated model's confidence matches its accuracy. If it says
 *     "90% confident" it should be correct ~90% of the time.
 *   - Most models are poorly calibrated out of the box. Calibration analysis
 *     reveals the gap between stated confidence and actual accuracy.
 *   - Use human corrections as ground truth to recalibrate. Over time, the
 *     system learns which confidence levels to trust and which to flag.
 *   - Brier score measures overall calibration quality (lower = better).
 *
 * Mental Model: "Trust but verify — then adjust the trust thresholds"
 */

import type {
  CalibrationBucket,
  CalibrationReport,
  FieldConfidence,
} from "../types.js";

// ---------------------------------------------------------------------------
// Calibration Data Collection
// ---------------------------------------------------------------------------

/**
 * A human correction records what the model predicted vs what a human
 * reviewer determined was correct. These corrections are the training
 * data for calibration.
 */
export interface HumanCorrection {
  readonly fieldName: string;
  readonly predictedValue: unknown;
  readonly predictedConfidence: number;
  readonly humanVerifiedValue: unknown;
  readonly wasCorrect: boolean;
  readonly documentType: string;
  readonly correctedAt: string;
}

/**
 * Accumulated calibration data. Immutable — adding a correction returns
 * a new CalibrationData instance.
 */
export interface CalibrationData {
  readonly corrections: readonly HumanCorrection[];
}

/**
 * Creates empty calibration data.
 */
export function createCalibrationData(): CalibrationData {
  return { corrections: [] };
}

/**
 * Records a human correction. Returns new CalibrationData.
 */
export function recordCorrection(
  data: CalibrationData,
  correction: HumanCorrection
): CalibrationData {
  return {
    corrections: [...data.corrections, correction],
  };
}

/**
 * Records multiple corrections from a batch review session.
 * Returns new CalibrationData.
 */
export function recordBatchCorrections(
  data: CalibrationData,
  corrections: readonly HumanCorrection[]
): CalibrationData {
  return {
    corrections: [...data.corrections, ...corrections],
  };
}

// ---------------------------------------------------------------------------
// Bucket Analysis
// ---------------------------------------------------------------------------

/**
 * Builds calibration buckets from human correction data. Each bucket
 * covers a confidence range (e.g., 0.8-0.9) and compares the model's
 * predicted confidence against actual accuracy.
 *
 * @param bucketCount Number of equal-width buckets (default: 10)
 */
export function buildCalibrationBuckets(
  data: CalibrationData,
  bucketCount = 10
): readonly CalibrationBucket[] {
  const bucketWidth = 1.0 / bucketCount;

  return Array.from({ length: bucketCount }, (_, i) => {
    const rangeMin = i * bucketWidth;
    const rangeMax = (i + 1) * bucketWidth;

    // Find corrections in this confidence range
    const inBucket = data.corrections.filter(
      (c) =>
        c.predictedConfidence >= rangeMin &&
        c.predictedConfidence < rangeMax
    );

    const sampleCount = inBucket.length;
    const correctCount = inBucket.filter((c) => c.wasCorrect).length;

    const predictedConfidence =
      sampleCount > 0
        ? inBucket.reduce((sum, c) => sum + c.predictedConfidence, 0) /
          sampleCount
        : (rangeMin + rangeMax) / 2;

    const actualAccuracy =
      sampleCount > 0 ? correctCount / sampleCount : 0;

    // A bucket is calibrated if predicted and actual are within 5%
    const isCalibrated =
      sampleCount >= 10 &&
      Math.abs(predictedConfidence - actualAccuracy) < 0.05;

    return {
      rangeMin,
      rangeMax,
      predictedConfidence,
      actualAccuracy,
      sampleCount,
      isCalibrated,
    };
  });
}

// ---------------------------------------------------------------------------
// Calibration Report
// ---------------------------------------------------------------------------

/**
 * Generates a full calibration report with Brier score and threshold
 * adjustment recommendations.
 *
 * Brier Score: Mean squared error between predicted confidence and
 * actual outcome (0 or 1). Lower is better. Perfect = 0.0.
 */
export function generateCalibrationReport(
  data: CalibrationData,
  bucketCount = 10
): CalibrationReport {
  const buckets = buildCalibrationBuckets(data, bucketCount);
  const brierScore = calculateBrierScore(data.corrections);
  const recommendedAdjustment = calculateThresholdAdjustment(buckets);

  return {
    buckets,
    overallBrierScore: brierScore,
    recommendedThresholdAdjustment: recommendedAdjustment,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Calculates the Brier score across all corrections.
 * Brier = (1/N) * SUM( (predicted - actual)^2 )
 * where actual is 1 (correct) or 0 (incorrect)
 */
function calculateBrierScore(
  corrections: readonly HumanCorrection[]
): number {
  if (corrections.length === 0) return 0;

  const sumSquaredError = corrections.reduce((sum, c) => {
    const actual = c.wasCorrect ? 1 : 0;
    const error = c.predictedConfidence - actual;
    return sum + error * error;
  }, 0);

  return sumSquaredError / corrections.length;
}

/**
 * Calculates the recommended threshold adjustment based on calibration
 * analysis. If the model is overconfident (predicts higher confidence
 * than actual accuracy), the threshold should increase. If underconfident,
 * the threshold should decrease.
 *
 * Returns a signed adjustment: positive means "raise thresholds",
 * negative means "lower thresholds".
 */
function calculateThresholdAdjustment(
  buckets: readonly CalibrationBucket[]
): number {
  // Only consider buckets with enough samples
  const significantBuckets = buckets.filter((b) => b.sampleCount >= 5);

  if (significantBuckets.length === 0) return 0;

  // Weighted average of (predicted - actual), weighted by sample count
  const totalSamples = significantBuckets.reduce(
    (sum, b) => sum + b.sampleCount,
    0
  );

  const weightedGap = significantBuckets.reduce(
    (sum, b) =>
      sum +
      (b.predictedConfidence - b.actualAccuracy) * b.sampleCount,
    0
  );

  // If predicted > actual on average, model is overconfident → raise threshold
  return totalSamples > 0
    ? Math.round((weightedGap / totalSamples) * 1000) / 1000
    : 0;
}

// ---------------------------------------------------------------------------
// Threshold Adjustment Application
// ---------------------------------------------------------------------------

/**
 * Applies a calibration adjustment to confidence thresholds. This is
 * the feedback loop: human corrections improve future auto-review accuracy.
 *
 * @param currentThreshold The current confidence threshold for flagging
 * @param report The calibration report
 * @param maxAdjustment Maximum single-step adjustment (prevents wild swings)
 */
export function adjustThreshold(
  currentThreshold: number,
  report: CalibrationReport,
  maxAdjustment = 0.05
): number {
  const rawAdjustment = report.recommendedThresholdAdjustment;
  const clampedAdjustment = Math.max(
    -maxAdjustment,
    Math.min(maxAdjustment, rawAdjustment)
  );

  const newThreshold = currentThreshold + clampedAdjustment;

  // Clamp to valid range [0.5, 0.99]
  return Math.max(0.5, Math.min(0.99, newThreshold));
}

// ---------------------------------------------------------------------------
// Report Formatting
// ---------------------------------------------------------------------------

/**
 * Formats a calibration report as a human-readable string. Useful for
 * logging and display in review dashboards.
 */
export function formatCalibrationReport(report: CalibrationReport): string {
  const lines: string[] = [
    "=== Calibration Report ===",
    `Generated: ${report.generatedAt}`,
    `Brier Score: ${report.overallBrierScore.toFixed(4)} (lower is better; 0.0 = perfect)`,
    `Recommended Threshold Adjustment: ${report.recommendedThresholdAdjustment > 0 ? "+" : ""}${report.recommendedThresholdAdjustment.toFixed(3)}`,
    "",
    "Bucket Analysis:",
    "  Range       | Predicted | Actual | Samples | Calibrated",
    "  ------------|-----------|--------|---------|----------",
  ];

  for (const bucket of report.buckets) {
    const range = `${bucket.rangeMin.toFixed(1)}-${bucket.rangeMax.toFixed(1)}`;
    const predicted = bucket.predictedConfidence.toFixed(3);
    const actual = bucket.actualAccuracy.toFixed(3);
    const samples = String(bucket.sampleCount).padStart(7);
    const calibrated = bucket.isCalibrated ? "  YES" : "  NO";
    lines.push(
      `  ${range.padEnd(12)} | ${predicted.padEnd(9)} | ${actual.padEnd(6)} | ${samples} | ${calibrated}`
    );
  }

  const calibratedCount = report.buckets.filter((b) => b.isCalibrated).length;
  lines.push(
    "",
    `Calibrated buckets: ${calibratedCount}/${report.buckets.length}`
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Convenience: Create Corrections from Review
// ---------------------------------------------------------------------------

/**
 * Creates a HumanCorrection from a reviewed field. This bridges
 * the review/confidence module with the calibration module.
 */
export function createCorrectionFromReview(
  field: FieldConfidence,
  humanValue: unknown,
  documentType: string
): HumanCorrection {
  const wasCorrect = deepEqual(field.value, humanValue);

  return {
    fieldName: field.fieldName,
    predictedValue: field.value,
    predictedConfidence: field.confidence,
    humanVerifiedValue: humanValue,
    wasCorrect,
    documentType,
    correctedAt: new Date().toISOString(),
  };
}

/**
 * Simple deep equality check for correction comparison.
 * Handles primitives, arrays, and plain objects.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (typeof a === "object" && typeof b === "object") {
    const aStr = JSON.stringify(a);
    const bStr = JSON.stringify(b);
    return aStr === bStr;
  }

  return false;
}
