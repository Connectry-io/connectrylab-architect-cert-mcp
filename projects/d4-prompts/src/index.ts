/**
 * Domain 4 — Mini Data Extraction: Prompt Engineering & Structured Output
 *
 * This is the main entry point that ties all Domain 4 patterns together.
 * Run individual demos or all at once.
 *
 * Mental model: "Specificity beats vagueness. Examples beat instructions.
 * Schemas beat parsing."
 *
 * Task Statement Coverage:
 * - 4.1: Explicit criteria prompts (criteria-prompt.ts)
 * - 4.2: Few-shot prompting (few-shot.ts)
 * - 4.3: Structured output via tool_use (structured-output.ts)
 * - 4.4: Validation/retry loops (validation-retry.ts)
 * - 4.5: Batch processing (batch-processor.ts)
 * - 4.6: Multi-pass review (multi-pass.ts)
 *
 * Usage:
 *   npx tsx src/index.ts              # Run all demos (except batch)
 *   npx tsx src/index.ts criteria     # Run only 4.1
 *   npx tsx src/index.ts fewshot      # Run only 4.2
 *   npx tsx src/index.ts structured   # Run only 4.3
 *   npx tsx src/index.ts validate     # Run only 4.4
 *   npx tsx src/index.ts batch        # Run only 4.5 (long-running)
 *   npx tsx src/index.ts review       # Run only 4.6
 */

import { runCriteriaDemo } from "./extraction/criteria-prompt.js";
import { runFewShotDemo } from "./extraction/few-shot.js";
import { runStructuredOutputDemo } from "./extraction/structured-output.js";
import { runValidationRetryDemo } from "./extraction/validation-retry.js";
import { runBatchDemo } from "./batch/batch-processor.js";
import { runMultiPassDemo } from "./review/multi-pass.js";

// ---------------------------------------------------------------------------
// Demo Registry
// ---------------------------------------------------------------------------

interface DemoEntry {
  readonly name: string;
  readonly taskStatement: string;
  readonly run: () => Promise<unknown>;
  /** Batch is excluded from "all" because it's long-running */
  readonly excludeFromAll: boolean;
}

const DEMOS: readonly DemoEntry[] = [
  {
    name: "criteria",
    taskStatement: "4.1: Explicit criteria prompts",
    run: runCriteriaDemo,
    excludeFromAll: false,
  },
  {
    name: "fewshot",
    taskStatement: "4.2: Few-shot prompting",
    run: runFewShotDemo,
    excludeFromAll: false,
  },
  {
    name: "structured",
    taskStatement: "4.3: Structured output via tool_use",
    run: runStructuredOutputDemo,
    excludeFromAll: false,
  },
  {
    name: "validate",
    taskStatement: "4.4: Validation/retry loops",
    run: runValidationRetryDemo,
    excludeFromAll: false,
  },
  {
    name: "batch",
    taskStatement: "4.5: Batch processing (Message Batches API)",
    run: runBatchDemo,
    excludeFromAll: true, // Long-running, run explicitly
  },
  {
    name: "review",
    taskStatement: "4.6: Multi-pass review",
    run: runMultiPassDemo,
    excludeFromAll: false,
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const selectedDemo = process.argv[2];

  // Validate ANTHROPIC_API_KEY
  if (!process.env["ANTHROPIC_API_KEY"]) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required.");
    console.error("Set it with: export ANTHROPIC_API_KEY=your-key-here");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  Domain 4: Prompt Engineering & Structured Output   ║");
  console.log("║  Mini Data Extraction Reference Project             ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  if (selectedDemo) {
    // Run specific demo
    const demo = DEMOS.find((d) => d.name === selectedDemo);
    if (!demo) {
      console.error(`Unknown demo: "${selectedDemo}"`);
      console.error(`Available: ${DEMOS.map((d) => d.name).join(", ")}`);
      process.exit(1);
    }

    console.log(`Running: ${demo.taskStatement}\n`);
    await demo.run();
  } else {
    // Run all non-excluded demos sequentially
    const demosToRun = DEMOS.filter((d) => !d.excludeFromAll);

    console.log("Running all demos (except batch — run with: npx tsx src/index.ts batch)\n");
    console.log("Demos:");
    demosToRun.forEach((d) => console.log(`  - ${d.taskStatement}`));
    console.log();

    for (const demo of demosToRun) {
      console.log(`\n${"=".repeat(60)}\n`);
      try {
        await demo.run();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`Demo "${demo.name}" failed: ${message}`);
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("\nAll demos complete.");
    console.log(
      'To run the batch demo: npx tsx src/index.ts batch'
    );
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
