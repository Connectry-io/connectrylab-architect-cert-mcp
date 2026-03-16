/**
 * Domain 4.4 — Validation / Retry Loops
 *
 * Task Statement: "Implement validation and retry loops with error feedback
 * injection and detected_pattern tracking."
 *
 * This module demonstrates:
 * - Zod safeParse for structured validation
 * - Error feedback injection (sending parse errors back to the model)
 * - detected_pattern tracking (identifying recurring error types)
 * - maxAttempts cap to prevent infinite loops
 * - Immutable attempt history for debugging
 *
 * Key insight: When the model produces invalid output, don't just retry —
 * tell it WHAT was wrong. Error feedback turns a 30% retry success rate
 * into a 90%+ success rate. Track patterns to detect systematic issues.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ValidationAttempt, ValidationResult, RetryConfig } from "../types.js";

// ---------------------------------------------------------------------------
// Schema for validation target
// ---------------------------------------------------------------------------

/**
 * Invoice extraction schema — deliberately strict to trigger retries.
 * Fields like currency enum and positive-number constraints are common
 * sources of validation failures that benefit from retry-with-feedback.
 */
const InvoiceSchema = z.object({
  invoiceNumber: z
    .string()
    .regex(/^INV-\d{4,}$/, "Must match format INV-XXXX (4+ digits)"),
  vendor: z.object({
    name: z.string().min(1, "Vendor name is required"),
    taxId: z
      .string()
      .regex(/^\d{2}-\d{7}$/, "Must match format XX-XXXXXXX")
      .nullable(),
  }),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().int().positive("Quantity must be a positive integer"),
        unitPrice: z.number().positive("Unit price must be positive"),
        currency: z.enum(["USD", "EUR", "GBP", "JPY"]),
      })
    )
    .min(1, "At least one line item is required"),
  total: z.number().positive("Total must be positive"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO date format YYYY-MM-DD"),
});

type Invoice = z.infer<typeof InvoiceSchema>;

// ---------------------------------------------------------------------------
// Pattern Detection
// ---------------------------------------------------------------------------

/**
 * Analyzes validation errors to detect recurring patterns.
 * This helps identify systematic model failures vs. one-off errors.
 */
function detectErrorPattern(
  errors: readonly string[],
  previousAttempts: readonly ValidationAttempt[]
): string | null {
  // Collect all error messages across attempts
  const allErrors = [
    ...previousAttempts.flatMap((a) => a.errors),
    ...errors,
  ];

  // Check for recurring field errors
  const fieldCounts = new Map<string, number>();
  for (const error of allErrors) {
    // Extract field path from Zod error messages (e.g., "invoiceNumber: ...")
    const fieldMatch = error.match(/^([a-zA-Z_.[\]]+)/);
    if (fieldMatch?.[1]) {
      const field = fieldMatch[1];
      fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1);
    }
  }

  // Find fields that fail repeatedly
  for (const [field, count] of fieldCounts) {
    if (count >= 2) {
      return `recurring_field_error:${field}`;
    }
  }

  // Check for format pattern errors
  const formatErrors = allErrors.filter(
    (e) => e.includes("format") || e.includes("regex") || e.includes("Must match")
  );
  if (formatErrors.length >= 2) {
    return "recurring_format_mismatch";
  }

  // Check for type coercion issues
  const typeErrors = allErrors.filter(
    (e) => e.includes("Expected") && e.includes("received")
  );
  if (typeErrors.length >= 2) {
    return "recurring_type_coercion";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Error Feedback Construction
// ---------------------------------------------------------------------------

/**
 * Builds a feedback message that tells the model exactly what went wrong.
 * This is the critical difference between naive retry and retry-with-feedback.
 */
function buildErrorFeedback(
  attempt: ValidationAttempt,
  config: RetryConfig
): string {
  const errorList = attempt.errors.map((e) => `  - ${e}`).join("\n");

  let feedback = `Your previous response (attempt ${attempt.attemptNumber}) had validation errors:

${errorList}

Please fix these specific issues and try again.`;

  // Add pattern guidance if we've detected a recurring issue
  if (attempt.detectedPattern) {
    feedback += `\n\nDETECTED PATTERN: "${attempt.detectedPattern}"
This same type of error has occurred multiple times. Please pay special attention to:`;

    if (attempt.detectedPattern.startsWith("recurring_field_error:")) {
      const field = attempt.detectedPattern.replace("recurring_field_error:", "");
      feedback += `\n- The "${field}" field keeps failing validation. Re-read the format requirements carefully.`;
    } else if (attempt.detectedPattern === "recurring_format_mismatch") {
      feedback += `\n- Multiple format mismatches detected. Ensure you follow the EXACT formats specified (regex patterns, date formats, etc.).`;
    } else if (attempt.detectedPattern === "recurring_type_coercion") {
      feedback += `\n- Type errors detected. Ensure numbers are actual numbers (not strings), arrays are arrays, etc.`;
    }
  }

  if (config.feedbackStrategy === "escalate" && attempt.attemptNumber >= 2) {
    feedback +=
      "\n\nIMPORTANT: This is a critical retry. Focus ONLY on producing " +
      "valid output matching the exact schema requirements. Simplify your " +
      "response if needed — correctness over completeness.";
  }

  return feedback;
}

// ---------------------------------------------------------------------------
// Core Retry Loop
// ---------------------------------------------------------------------------

/**
 * Extracts structured data with a validation-retry loop.
 *
 * Flow:
 * 1. Send extraction request
 * 2. Parse response with Zod safeParse
 * 3. If valid -> return success
 * 4. If invalid -> inject error feedback, track pattern, retry
 * 5. Repeat until success or maxAttempts reached
 *
 * All attempts are recorded immutably for debugging and monitoring.
 */
async function extractWithRetry(
  client: Anthropic,
  text: string,
  config: RetryConfig = { maxAttempts: 3, feedbackStrategy: "escalate" }
): Promise<ValidationResult<Invoice>> {
  const attempts: ValidationAttempt[] = [];
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Extract invoice data from this text and return it as JSON:

${text}

Required JSON format:
- invoiceNumber: string matching "INV-XXXX" (4+ digits)
- vendor: { name: string, taxId: string|null matching "XX-XXXXXXX" }
- lineItems: array of { description: string, quantity: positive integer, unitPrice: positive number, currency: "USD"|"EUR"|"GBP"|"JPY" }
- total: positive number
- dueDate: ISO date "YYYY-MM-DD"

Return ONLY the JSON object, no other text.`,
    },
  ];

  for (let attemptNum = 1; attemptNum <= config.maxAttempts; attemptNum++) {
    // Send request
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system:
        "You are a precise data extraction assistant. Return only valid JSON " +
        "matching the requested schema. No markdown, no explanations.",
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      const attempt: ValidationAttempt = {
        attemptNumber: attemptNum,
        rawOutput: "",
        errors: ["No text content in response"],
        detectedPattern: null,
      };
      attempts.push(attempt);
      continue;
    }

    const rawOutput = textBlock.text;

    // Try to parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      const errors = [`JSON parse error: invalid JSON syntax`];
      const detectedPattern = detectErrorPattern(errors, attempts);
      const attempt: ValidationAttempt = {
        attemptNumber: attemptNum,
        rawOutput,
        errors,
        detectedPattern,
      };
      attempts.push(attempt);

      // Inject error feedback for next attempt
      if (attemptNum < config.maxAttempts) {
        messages.push(
          { role: "assistant", content: rawOutput },
          { role: "user", content: buildErrorFeedback(attempt, config) }
        );
      }
      continue;
    }

    // Validate with Zod safeParse
    const validation = InvoiceSchema.safeParse(parsed);

    if (validation.success) {
      // Record successful attempt
      const attempt: ValidationAttempt = {
        attemptNumber: attemptNum,
        rawOutput,
        errors: [],
        detectedPattern: null,
      };
      return {
        success: true,
        data: validation.data,
        attempts: [...attempts, attempt],
        totalAttempts: attemptNum,
      };
    }

    // Extract human-readable error messages from Zod
    const errors = validation.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    const detectedPattern = detectErrorPattern(errors, attempts);

    const attempt: ValidationAttempt = {
      attemptNumber: attemptNum,
      rawOutput,
      errors,
      detectedPattern,
    };
    attempts.push(attempt);

    // Inject error feedback for next attempt
    if (attemptNum < config.maxAttempts) {
      messages.push(
        { role: "assistant", content: rawOutput },
        { role: "user", content: buildErrorFeedback(attempt, config) }
      );
    }
  }

  // All attempts exhausted
  return {
    success: false,
    data: null,
    attempts,
    totalAttempts: config.maxAttempts,
  };
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const SAMPLE_INVOICE_TEXT = `
INVOICE

Invoice #: INV-20240315
Date: March 15, 2024
Due: April 14, 2024

From: CloudScale Solutions Inc.
Tax ID: 47-1234567

Bill To: Acme Corp

Items:
1. Cloud Hosting (Annual) - 12 months @ $299.99/month = $3,599.88
2. Premium Support Package - 1 unit @ $1,200.00 = $1,200.00
3. Data Migration Service - 3 sessions @ $450.00 each = $1,350.00

Subtotal: $6,149.88
Tax (0%): $0.00
Total Due: $6,149.88

Payment Terms: Net 30
Currency: USD
`;

// ---------------------------------------------------------------------------
// Main — runnable with: npx tsx src/extraction/validation-retry.ts
// ---------------------------------------------------------------------------

export async function runValidationRetryDemo(): Promise<ValidationResult<Invoice>> {
  const client = new Anthropic();

  console.log("=== Domain 4.4: Validation / Retry Loops ===\n");
  console.log("Config: maxAttempts=3, feedbackStrategy=escalate");
  console.log("Schema: InvoiceSchema with strict regex, enums, and positivity constraints\n");

  const result = await extractWithRetry(client, SAMPLE_INVOICE_TEXT);

  console.log(`Success: ${result.success}`);
  console.log(`Total attempts: ${result.totalAttempts}`);
  console.log();

  for (const attempt of result.attempts) {
    console.log(`--- Attempt ${attempt.attemptNumber} ---`);
    if (attempt.errors.length === 0) {
      console.log("  Status: VALID");
    } else {
      console.log(`  Errors: ${attempt.errors.length}`);
      attempt.errors.forEach((e) => console.log(`    - ${e}`));
      if (attempt.detectedPattern) {
        console.log(`  Detected pattern: ${attempt.detectedPattern}`);
      }
    }
  }

  if (result.success && result.data) {
    console.log("\nExtracted Invoice:");
    console.log(JSON.stringify(result.data, null, 2));
  }

  return result;
}

// Run if executed directly
const isDirectRun = process.argv[1]?.includes("validation-retry");
if (isDirectRun) {
  runValidationRetryDemo().catch(console.error);
}

export { InvoiceSchema, extractWithRetry, detectErrorPattern, buildErrorFeedback };
