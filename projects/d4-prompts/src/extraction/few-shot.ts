/**
 * Domain 4.2 — Few-Shot Prompting
 *
 * Task Statement: "Use few-shot prompting with targeted examples, edge cases,
 * and format demonstrations to guide model behavior."
 *
 * This module demonstrates:
 * - Strategic example selection (happy path + boundary + trap)
 * - Edge-case targeting for difficult classifications
 * - Format demonstration through example output structure
 * - Example ordering for maximum effectiveness
 *
 * Key insight: Three well-chosen examples beat twenty random ones.
 * Target the decision boundaries where the model is most likely to err.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { FewShotExample, SentimentClassification, SentimentLabel } from "../types.js";

// ---------------------------------------------------------------------------
// Few-Shot Examples — Strategically Selected
// ---------------------------------------------------------------------------

/**
 * Example selection strategy for sentiment classification:
 *
 * 1. HAPPY PATH — Clear positive sentiment (calibrates baseline)
 * 2. BOUNDARY CASE — Neutral with emotional words (tests precision)
 * 3. SARCASM TRAP — Surface-positive, actually negative (tests depth)
 *
 * Each example includes a selectionReason explaining WHY it was chosen.
 * This is a teaching pattern — in production, the reason is for documentation.
 */
const SENTIMENT_EXAMPLES: readonly FewShotExample[] = [
  // Example 1: Happy path — clear positive
  {
    input:
      "Just upgraded to the pro plan and the new dashboard is incredible. " +
      "Everything loads instantly and the analytics are exactly what I needed.",
    output: {
      label: "positive",
      confidence: 0.95,
      reasoning:
        "Explicit praise ('incredible'), concrete positive outcomes " +
        "('loads instantly', 'exactly what I needed'), and voluntary upgrade " +
        "action all indicate genuine positive sentiment.",
    },
    selectionReason:
      "HAPPY PATH — Establishes the baseline: what unambiguous positive " +
      "sentiment looks like with high confidence.",
  },

  // Example 2: Neutral boundary — emotional words but factual intent
  {
    input:
      "The new update changed the export format from CSV to JSON. " +
      "I've updated my scripts to handle the new format.",
    output: {
      label: "neutral",
      confidence: 0.85,
      reasoning:
        "Despite 'changed' which could imply frustration, the user is simply " +
        "stating a fact and describing their adaptation. No evaluative language " +
        "is present — they neither praise nor criticize the change.",
    },
    selectionReason:
      "BOUNDARY CASE — Tests whether the model can distinguish factual " +
      "statements about changes from complaints. Words like 'changed' and " +
      "'have to update' could trick a naive classifier into 'negative'.",
  },

  // Example 3: Sarcasm trap — surface positive, actually negative
  {
    input:
      "Oh wonderful, another update that completely breaks the API without " +
      "any migration guide. Really loving the 'move fast' philosophy here.",
    output: {
      label: "sarcastic",
      confidence: 0.92,
      reasoning:
        "Surface-level positive words ('wonderful', 'really loving') are " +
        "deployed sarcastically. Key indicators: (1) 'Oh wonderful' as an " +
        "exclamation paired with a complaint, (2) 'Really loving' followed " +
        "by ironic air-quotes around 'move fast', (3) the actual content " +
        "describes a breaking change with no documentation — clearly negative.",
    },
    selectionReason:
      "SARCASM TRAP — The most important example. Without this, models " +
      "consistently misclassify sarcasm as positive based on surface words. " +
      "This teaches the model to look beyond lexical sentiment.",
  },
] as const;

// ---------------------------------------------------------------------------
// Prompt Construction
// ---------------------------------------------------------------------------

/**
 * Builds a few-shot prompt from examples.
 * The format uses explicit USER/ASSISTANT turns to leverage Claude's
 * conversation structure for maximum few-shot effectiveness.
 */
function buildFewShotMessages(
  examples: readonly FewShotExample[],
  inputText: string
): Anthropic.MessageParam[] {
  // Convert examples into alternating user/assistant message pairs
  const exampleMessages: Anthropic.MessageParam[] = examples.flatMap(
    (example) => [
      {
        role: "user" as const,
        content: `Classify the sentiment of this text:\n\n"${example.input}"`,
      },
      {
        role: "assistant" as const,
        content: JSON.stringify(example.output, null, 2),
      },
    ]
  );

  // Append the actual classification request
  const classificationRequest: Anthropic.MessageParam = {
    role: "user",
    content: `Classify the sentiment of this text:\n\n"${inputText}"`,
  };

  return [...exampleMessages, classificationRequest];
}

/**
 * System prompt that establishes the task and output format.
 * Deliberately concise — the examples do the heavy lifting.
 */
const SENTIMENT_SYSTEM_PROMPT = `You are a sentiment classifier for product feedback.

Classify each input into exactly one of: positive, negative, neutral, sarcastic.

Rules:
- "sarcastic" means the surface sentiment contradicts the actual intent
- "neutral" means factual/informational with no evaluative judgment
- Confidence should reflect how clear-cut the classification is
- Always explain your reasoning, especially for edge cases

Respond as JSON matching this format:
{
  "label": "positive" | "negative" | "neutral" | "sarcastic",
  "confidence": 0.0-1.0,
  "reasoning": "explanation"
}`;

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * Classifies sentiment using few-shot prompting.
 * The examples guide the model on format, edge cases, and reasoning depth.
 */
async function classifySentiment(
  client: Anthropic,
  text: string,
  examples: readonly FewShotExample[] = SENTIMENT_EXAMPLES
): Promise<SentimentClassification> {
  const messages = buildFewShotMessages(examples, text);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: SENTIMENT_SYSTEM_PROMPT,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response received from model");
  }

  return JSON.parse(textBlock.text) as SentimentClassification;
}

// ---------------------------------------------------------------------------
// Test Cases — Designed to exercise the few-shot examples
// ---------------------------------------------------------------------------

const TEST_INPUTS: readonly { readonly text: string; readonly expectedLabel: SentimentLabel }[] = [
  {
    text:
      "This is hands down the best CI/CD tool I've ever used. " +
      "Deploys went from 45 minutes to under 3.",
    expectedLabel: "positive",
  },
  {
    text: "Version 3.2.1 adds support for ARM64 architecture. " +
      "The minimum Node version is now 18.",
    expectedLabel: "neutral",
  },
  {
    text:
      "Sure, let's just deprecate the most-used endpoint with 24 hours notice. " +
      "What could possibly go wrong? Stellar developer experience as always.",
    expectedLabel: "sarcastic",
  },
  {
    text:
      "Third outage this month. I'm moving our production workloads to a " +
      "competitor by end of quarter.",
    expectedLabel: "negative",
  },
];

// ---------------------------------------------------------------------------
// Main — runnable with: npx tsx src/extraction/few-shot.ts
// ---------------------------------------------------------------------------

export async function runFewShotDemo(): Promise<readonly SentimentClassification[]> {
  const client = new Anthropic();

  console.log("=== Domain 4.2: Few-Shot Prompting ===\n");
  console.log("Example selection strategy:");
  SENTIMENT_EXAMPLES.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.selectionReason.split(" — ")[0]}: ${ex.selectionReason.split(" — ")[1]}`);
  });
  console.log();

  const results: SentimentClassification[] = [];

  for (const testCase of TEST_INPUTS) {
    console.log(`Input: "${testCase.text.slice(0, 60)}..."`);
    console.log(`Expected: ${testCase.expectedLabel}`);

    const result = await classifySentiment(client, testCase.text);
    results.push(result);

    const match = result.label === testCase.expectedLabel ? "PASS" : "MISS";
    console.log(`Result: ${result.label} (${result.confidence}) [${match}]`);
    console.log(`Reasoning: ${result.reasoning}\n`);
  }

  return results;
}

// Run if executed directly
const isDirectRun = process.argv[1]?.includes("few-shot");
if (isDirectRun) {
  runFewShotDemo().catch(console.error);
}

export { SENTIMENT_EXAMPLES, classifySentiment, buildFewShotMessages };
