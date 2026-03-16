/**
 * Domain 4.5 — Batch Processing (Message Batches API)
 *
 * Task Statement: "Use the Message Batches API with custom_id, poll for
 * completion, and handle failures gracefully."
 *
 * This module demonstrates:
 * - Creating a batch with custom_ids for result correlation
 * - Polling for batch completion with backoff
 * - Processing results: separating succeeded vs. errored items
 * - Graceful failure handling (partial success is still useful)
 *
 * Key insight: Batch API is 50% cheaper and ideal for non-real-time
 * workloads. custom_id is your correlation key — design it to carry
 * enough context to process results without re-reading inputs.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  BatchItem,
  BatchRequestParams,
  BatchResultItem,
  BatchProcessingResult,
} from "../types.js";

// ---------------------------------------------------------------------------
// Batch Creation
// ---------------------------------------------------------------------------

/**
 * Builds batch request bodies from items.
 * Each request gets a custom_id that encodes enough context for
 * downstream processing without needing to look up the original input.
 *
 * custom_id design pattern: "{type}-{source}-{index}"
 * - type: what kind of processing (e.g., "sentiment", "extract")
 * - source: where the data came from (e.g., "survey-q3")
 * - index: sequential identifier for ordering
 */
function buildBatchRequests(
  items: readonly BatchItem[],
  params: BatchRequestParams
): readonly Anthropic.MessageBatchIndividualRequestParam[] {
  return items.map((item) => ({
    custom_id: item.customId,
    params: {
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.systemPrompt,
      messages: [
        {
          role: "user" as const,
          content: item.content,
        },
      ],
    },
  }));
}

// ---------------------------------------------------------------------------
// Batch Polling
// ---------------------------------------------------------------------------

/**
 * Poll interval configuration with exponential backoff.
 * Batch API jobs can take minutes to hours — be patient and efficient.
 */
interface PollConfig {
  readonly initialIntervalMs: number;
  readonly maxIntervalMs: number;
  readonly backoffMultiplier: number;
  readonly maxWaitMs: number;
}

const DEFAULT_POLL_CONFIG: PollConfig = {
  initialIntervalMs: 5_000,
  maxIntervalMs: 60_000,
  backoffMultiplier: 1.5,
  maxWaitMs: 600_000, // 10 minutes max
};

/**
 * Polls a batch until completion or timeout.
 * Uses exponential backoff to be respectful of the API.
 */
async function pollBatchCompletion(
  client: Anthropic,
  batchId: string,
  config: PollConfig = DEFAULT_POLL_CONFIG
): Promise<Anthropic.Messages.MessageBatch> {
  let intervalMs = config.initialIntervalMs;
  let totalWaitMs = 0;

  while (totalWaitMs < config.maxWaitMs) {
    const batch = await client.messages.batches.retrieve(batchId);

    console.log(
      `  Batch ${batchId}: status=${batch.processing_status}, ` +
        `succeeded=${batch.request_counts.succeeded}, ` +
        `errored=${batch.request_counts.errored}, ` +
        `processing=${batch.request_counts.processing}`
    );

    if (batch.processing_status === "ended") {
      return batch;
    }

    // Wait with backoff
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    totalWaitMs += intervalMs;
    intervalMs = Math.min(
      intervalMs * config.backoffMultiplier,
      config.maxIntervalMs
    );
  }

  throw new Error(
    `Batch ${batchId} did not complete within ${config.maxWaitMs}ms`
  );
}

// ---------------------------------------------------------------------------
// Result Processing
// ---------------------------------------------------------------------------

/**
 * Processes batch results, separating succeeded from errored items.
 * This is where custom_id pays off — we can correlate results back
 * to inputs without maintaining a separate lookup table.
 */
async function processBatchResults(
  client: Anthropic,
  batch: Anthropic.Messages.MessageBatch
): Promise<BatchProcessingResult> {
  const succeeded: BatchResultItem[] = [];
  const errored: BatchResultItem[] = [];

  // Stream results from the batch
  for await (const result of client.messages.batches.results(batch.id)) {
    if (result.result.type === "succeeded") {
      const message = result.result.message;
      const textBlock = message.content.find((b) => b.type === "text");

      succeeded.push({
        customId: result.custom_id,
        status: "succeeded",
        result: textBlock?.type === "text" ? textBlock.text : null,
        error: null,
      });
    } else if (result.result.type === "errored") {
      errored.push({
        customId: result.custom_id,
        status: "errored",
        result: null,
        error: result.result.error?.message ?? "Unknown error",
      });
    } else if (result.result.type === "expired") {
      errored.push({
        customId: result.custom_id,
        status: "expired",
        result: null,
        error: "Request expired before processing",
      });
    }
  }

  const totalItems = succeeded.length + errored.length;
  return {
    batchId: batch.id,
    succeeded,
    errored,
    totalItems,
    successRate: totalItems > 0 ? succeeded.length / totalItems : 0,
  };
}

// ---------------------------------------------------------------------------
// Full Batch Workflow
// ---------------------------------------------------------------------------

/**
 * End-to-end batch processing workflow:
 * 1. Build batch requests with custom_ids
 * 2. Submit batch to the API
 * 3. Poll for completion
 * 4. Process and return results
 */
async function runBatchWorkflow(
  client: Anthropic,
  items: readonly BatchItem[],
  params: BatchRequestParams,
  pollConfig: PollConfig = DEFAULT_POLL_CONFIG
): Promise<BatchProcessingResult> {
  // Step 1: Build requests
  const requests = buildBatchRequests(items, params);
  console.log(`Building batch with ${requests.length} requests...`);

  // Step 2: Create the batch
  const batch = await client.messages.batches.create({
    requests: [...requests],
  });
  console.log(`Batch created: ${batch.id}`);

  // Step 3: Poll for completion
  console.log("Polling for completion...");
  const completedBatch = await pollBatchCompletion(
    client,
    batch.id,
    pollConfig
  );

  // Step 4: Process results
  console.log("Processing results...");
  return processBatchResults(client, completedBatch);
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const SURVEY_RESPONSES: readonly BatchItem[] = [
  {
    customId: "sentiment-survey-q3-001",
    content:
      "Customer feedback: 'The new onboarding flow is much smoother. " +
      "I was able to set up my account in under 5 minutes.'",
  },
  {
    customId: "sentiment-survey-q3-002",
    content:
      "Customer feedback: 'I've been waiting 3 weeks for a response " +
      "from support. This is completely unacceptable for a paid plan.'",
  },
  {
    customId: "sentiment-survey-q3-003",
    content:
      "Customer feedback: 'The product works as described in the docs. " +
      "No issues to report at this time.'",
  },
  {
    customId: "sentiment-survey-q3-004",
    content:
      "Customer feedback: 'Oh sure, the app crashes every time I try " +
      "to export. But hey, at least the loading spinner looks pretty!'",
  },
  {
    customId: "sentiment-survey-q3-005",
    content:
      "Customer feedback: 'Switched from competitor X and the difference " +
      "is night and day. Your API documentation is genuinely excellent.'",
  },
];

const BATCH_PARAMS: BatchRequestParams = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 256,
  systemPrompt:
    "Classify the sentiment of the customer feedback as one of: " +
    "positive, negative, neutral, sarcastic. " +
    'Respond with JSON: {"label": "...", "confidence": 0.0-1.0, "summary": "..."}',
};

// ---------------------------------------------------------------------------
// Main — runnable with: npx tsx src/batch/batch-processor.ts
// ---------------------------------------------------------------------------

export async function runBatchDemo(): Promise<BatchProcessingResult> {
  const client = new Anthropic();

  console.log("=== Domain 4.5: Batch Processing (Message Batches API) ===\n");
  console.log(`Items to process: ${SURVEY_RESPONSES.length}`);
  console.log("custom_id pattern: sentiment-survey-q3-{index}");
  console.log(`Model: ${BATCH_PARAMS.model}\n`);

  const result = await runBatchWorkflow(client, SURVEY_RESPONSES, BATCH_PARAMS);

  console.log("\n--- Batch Results ---");
  console.log(`Batch ID: ${result.batchId}`);
  console.log(`Total: ${result.totalItems}`);
  console.log(`Succeeded: ${result.succeeded.length}`);
  console.log(`Errored: ${result.errored.length}`);
  console.log(
    `Success rate: ${(result.successRate * 100).toFixed(1)}%\n`
  );

  // Display succeeded results
  for (const item of result.succeeded) {
    console.log(`[${item.customId}] ${item.result}`);
  }

  // Display errors for debugging
  if (result.errored.length > 0) {
    console.log("\n--- Errors ---");
    for (const item of result.errored) {
      console.log(`[${item.customId}] ERROR: ${item.error}`);
    }
  }

  return result;
}

// Run if executed directly
const isDirectRun = process.argv[1]?.includes("batch-processor");
if (isDirectRun) {
  runBatchDemo().catch(console.error);
}

export {
  buildBatchRequests,
  pollBatchCompletion,
  processBatchResults,
  runBatchWorkflow,
};
