/**
 * Domain 4.1 — Explicit Criteria Prompts
 *
 * Task Statement: "Design prompts with explicit evaluation criteria to improve
 * precision and manage false positives."
 *
 * This module demonstrates:
 * - Typed CRITERIA arrays with definitions and negative examples
 * - Structured ReviewResult output
 * - False positive management through negative example anchoring
 * - Precision improvement via weighted, evidence-based scoring
 *
 * Key insight: Vague instructions like "review this document" produce
 * inconsistent results. Explicit criteria with definitions, weights, and
 * negative examples dramatically improve precision.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { CriterionDefinition, ReviewResult, CriterionScore } from "../types.js";

// ---------------------------------------------------------------------------
// Criteria Definition — The heart of 4.1
// ---------------------------------------------------------------------------

/**
 * Each criterion includes negative examples to reduce false positives.
 * Without negative examples, the model over-flags benign content.
 */
const COMPLIANCE_CRITERIA: readonly CriterionDefinition[] = [
  {
    name: "pii_exposure",
    description:
      "Document contains personally identifiable information (SSN, full DOB, " +
      "financial account numbers) that is not properly redacted or protected.",
    weight: 0.3,
    negativeExamples: [
      "First name only without surname is NOT PII exposure",
      "Masked account numbers (****1234) are NOT PII exposure",
      "General age ranges ('in their 30s') are NOT PII exposure",
      "Business email addresses are NOT PII exposure",
    ],
  },
  {
    name: "unauthorized_commitment",
    description:
      "Document contains language that commits the organization to financial " +
      "obligations, timelines, or deliverables without proper authorization markers.",
    weight: 0.25,
    negativeExamples: [
      "Aspirational language ('we hope to') is NOT a commitment",
      "Conditional statements ('if approved, we could') are NOT commitments",
      "Internal planning estimates are NOT external commitments",
      "Past tense descriptions of completed work are NOT new commitments",
    ],
  },
  {
    name: "regulatory_violation",
    description:
      "Document contains claims, promises, or disclosures that violate " +
      "industry regulations (financial, healthcare, data protection).",
    weight: 0.3,
    negativeExamples: [
      "General industry commentary is NOT a regulatory violation",
      "Properly disclaimed forward-looking statements are NOT violations",
      "Internal discussion of regulations is NOT a violation",
      "Quoting regulations for reference is NOT a violation",
    ],
  },
  {
    name: "tone_professionalism",
    description:
      "Document uses language that is unprofessional, aggressive, or " +
      "inappropriate for external-facing business communication.",
    weight: 0.15,
    negativeExamples: [
      "Casual but polite language is NOT unprofessional",
      "Technical jargon appropriate to the audience is NOT unprofessional",
      "Direct feedback with constructive framing is NOT aggressive",
      "Humor in appropriate context is NOT unprofessional",
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Prompt Construction
// ---------------------------------------------------------------------------

/**
 * Builds the system prompt with explicit criteria definitions.
 * The structure ensures the model evaluates each criterion independently
 * and provides evidence-based scores.
 */
function buildCriteriaSystemPrompt(
  criteria: readonly CriterionDefinition[]
): string {
  const criteriaSection = criteria
    .map(
      (c) =>
        `## Criterion: ${c.name} (weight: ${c.weight})\n` +
        `Definition: ${c.description}\n\n` +
        `FALSE POSITIVE GUIDANCE — Do NOT flag these:\n` +
        c.negativeExamples.map((ex) => `- ${ex}`).join("\n")
    )
    .join("\n\n");

  return `You are a compliance document reviewer. Evaluate the provided document
against EACH criterion below independently.

For each criterion:
1. Search for specific evidence in the document
2. Check against the false positive guidance before flagging
3. Assign a score from 0.0 (no issues) to 1.0 (severe issues)
4. Provide your confidence level (0.0-1.0) in the assessment
5. Quote the specific text that constitutes evidence
6. Explain your reasoning, especially if you considered flagging but decided
   it was a false positive

EVALUATION CRITERIA:

${criteriaSection}

IMPORTANT: Precision matters more than recall. Only flag genuine issues.
If in doubt, check the false positive guidance. A missed flag is better than
a false positive that wastes reviewer time.

Respond as valid JSON matching the ReviewResult schema.`;
}

/**
 * Builds the user message with the document to review.
 */
function buildReviewRequest(documentId: string, content: string): string {
  return `Review the following document (ID: ${documentId}):

---
${content}
---

Evaluate against ALL criteria. Return your assessment as JSON with this structure:
{
  "documentId": "${documentId}",
  "criteria": [
    {
      "criterion": "<criterion name>",
      "score": <0.0-1.0>,
      "confidence": <0.0-1.0>,
      "evidence": "<quoted text or 'none found'>",
      "reasoning": "<explanation>"
    }
  ],
  "overallScore": <weighted average>,
  "summary": "<2-3 sentence summary>",
  "falsePositiveFlags": ["<items you considered but ruled out as false positives>"]
}`;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * Runs a criteria-based review of a document.
 * Returns a typed ReviewResult with per-criterion scores and false positive flags.
 */
async function reviewWithCriteria(
  client: Anthropic,
  documentId: string,
  content: string,
  criteria: readonly CriterionDefinition[] = COMPLIANCE_CRITERIA
): Promise<ReviewResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: buildCriteriaSystemPrompt(criteria),
    messages: [
      {
        role: "user",
        content: buildReviewRequest(documentId, content),
      },
    ],
  });

  // Extract text content from response
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response received from model");
  }

  // Parse the JSON response — in production, use validation-retry (4.4)
  const parsed: ReviewResult = JSON.parse(textBlock.text);
  return parsed;
}

// ---------------------------------------------------------------------------
// Demo: Sample document with tricky false-positive bait
// ---------------------------------------------------------------------------

const SAMPLE_DOCUMENT = `
Subject: Q3 Partnership Update — Acme Corp

Hi team,

Following up on our call with Sarah from Acme Corp (sarah@acme.com).
She mentioned her team is "in their 30s on average" and very tech-forward.

Key takeaways:
- We discussed a potential $500K engagement if their board approves Q4 budget
- Sarah hopes we can kick off by January, but nothing is confirmed yet
- Their masked account reference is ****7891 for our records

I think we should definitely commit to having a proposal ready by November.
That said, per GDPR Article 17, we need to ensure our data retention
policies align before we proceed with any data sharing.

The internal estimate is 6 months for full rollout, but we should NOT share
that externally until we have sign-off from legal.

Best,
Alex
`;

// ---------------------------------------------------------------------------
// Main — runnable with: npx tsx src/extraction/criteria-prompt.ts
// ---------------------------------------------------------------------------

export async function runCriteriaDemo(): Promise<ReviewResult> {
  const client = new Anthropic();

  console.log("=== Domain 4.1: Explicit Criteria Prompts ===\n");
  console.log("Reviewing document with", COMPLIANCE_CRITERIA.length, "criteria...");
  console.log(
    "Each criterion has",
    COMPLIANCE_CRITERIA[0]?.negativeExamples.length ?? 0,
    "negative examples for false positive management.\n"
  );

  const result = await reviewWithCriteria(client, "DOC-2024-Q3-001", SAMPLE_DOCUMENT);

  console.log("Review Result:");
  console.log(JSON.stringify(result, null, 2));
  console.log(
    "\nFalse positives avoided:",
    result.falsePositiveFlags.length,
    "items correctly not flagged"
  );

  return result;
}

// Run if executed directly
const isDirectRun = process.argv[1]?.includes("criteria-prompt");
if (isDirectRun) {
  runCriteriaDemo().catch(console.error);
}

export { COMPLIANCE_CRITERIA, buildCriteriaSystemPrompt, reviewWithCriteria };
