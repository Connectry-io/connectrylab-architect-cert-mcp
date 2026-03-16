# Domain 4: Mini Data Extraction — Prompt Engineering & Structured Output

> **Mental Model:** "Specificity beats vagueness. Examples beat instructions. Schemas beat parsing."

This reference project demonstrates all six Domain 4 task statements through a cohesive data extraction scenario. Each module is independently runnable and maps directly to a certification task statement.

## Prerequisites

- Node.js 18+
- `ANTHROPIC_API_KEY` environment variable set

## Setup

```bash
npm install
```

## Running

```bash
# Run all demos (except batch, which is long-running)
npx tsx src/index.ts

# Run individual demos
npx tsx src/index.ts criteria     # 4.1 — Explicit criteria prompts
npx tsx src/index.ts fewshot      # 4.2 — Few-shot prompting
npx tsx src/index.ts structured   # 4.3 — Structured output via tool_use
npx tsx src/index.ts validate     # 4.4 — Validation/retry loops
npx tsx src/index.ts batch        # 4.5 — Batch processing (long-running)
npx tsx src/index.ts review       # 4.6 — Multi-pass review

# Or run modules directly
npx tsx src/extraction/criteria-prompt.ts
npx tsx src/extraction/few-shot.ts
npx tsx src/extraction/structured-output.ts
npx tsx src/extraction/validation-retry.ts
npx tsx src/batch/batch-processor.ts
npx tsx src/review/multi-pass.ts
```

## File-by-File Walkthrough

### `src/types.ts` — Shared Types

All types used across the project. Every interface and property is `readonly` to enforce immutability. Includes Zod schemas for runtime validation (used by 4.3 and 4.4).

### `src/extraction/criteria-prompt.ts` — Task 4.1

**Explicit Criteria Prompts:** Precision improvement and false positive management.

- Defines a typed `CRITERIA` array where each criterion has a name, description, weight, and negative examples
- Negative examples are the key to false positive reduction — they tell the model what NOT to flag
- Builds a structured system prompt from the criteria definitions
- Returns a `ReviewResult` with per-criterion scores, evidence, and a false positive log
- Demo reviews a document containing deliberate false-positive bait (masked account numbers, conditional language, casual tone)

### `src/extraction/few-shot.ts` — Task 4.2

**Few-Shot Prompting:** Targeted examples, edge cases, and format demonstration.

- Three strategically selected examples, each with a `selectionReason` explaining WHY it was chosen:
  1. **Happy path** — Calibrates what clear positive sentiment looks like
  2. **Boundary case** — Neutral text with emotional words (tests precision at the decision boundary)
  3. **Sarcasm trap** — Surface-positive words with negative intent (the most important example)
- Uses user/assistant turn pairs for maximum few-shot effectiveness
- Tests against four cases designed to exercise the example coverage

### `src/extraction/structured-output.ts` — Task 4.3

**Structured Output via tool_use:** Zod schemas, tool_choice, nullable fields, enums.

- Converts a Zod schema to JSON Schema using `zod-to-json-schema`
- Defines a tool (`save_extracted_contacts`) as a "capture contract" — it is never executed
- Uses `tool_choice: { type: "tool", name: "save_extracted_contacts" }` to force structured output
- Schema includes nullable fields (email, phone, company), enums (role classification), and typed arrays
- Extracts contacts from emails and meeting notes with guaranteed schema compliance

### `src/extraction/validation-retry.ts` — Task 4.4

**Validation/Retry Loops:** safeParse, error feedback, detected_pattern tracking.

- Defines a strict `InvoiceSchema` with regex patterns, enums, and positivity constraints
- Core loop: extract -> safeParse -> if invalid, inject errors back into conversation -> retry
- `buildErrorFeedback()` constructs targeted feedback messages from Zod validation errors
- `detectErrorPattern()` tracks recurring error types across attempts (field errors, format mismatches, type coercion)
- Pattern detection triggers escalated guidance on subsequent retries
- All attempts recorded immutably in `ValidationResult.attempts`

### `src/batch/batch-processor.ts` — Task 4.5

**Batch Processing:** Message Batches API, custom_id, polling, failure handling.

- Builds batch requests with custom_ids following the pattern `{type}-{source}-{index}`
- Submits batch via `client.messages.batches.create()`
- Polls with exponential backoff via `client.messages.batches.retrieve()`
- Streams results via `client.messages.batches.results()` and separates succeeded/errored/expired
- Computes success rate and provides structured error reporting
- Note: This demo is long-running (minutes) due to batch API processing time

### `src/review/multi-pass.ts` — Task 4.6

**Multi-Pass Review:** Independent instances, per-file + cross-file passes, synthesis.

- **Pass 1 (Per-File):** Each file is reviewed by three independent Claude instances, each with a role-specific system prompt (security, performance, correctness). Roles are run in parallel via `Promise.all`.
- **Pass 2 (Cross-File):** A separate instance reviews all files together to find patterns that span files (inconsistent validation, N+1 queries across modules, etc.)
- **Pass 3 (Synthesis):** Pure function that aggregates all findings, counts severities, and generates a summary
- Demo code contains deliberate bugs (SQL injection, logging tokens, N+1 queries) to generate findings

### `src/index.ts` — Example Runner

Ties all patterns together with a CLI interface. Validates API key, runs selected or all demos, handles errors per-demo so one failure doesn't stop the suite.

## Architecture

```
src/
├── types.ts                        # Shared types (all readonly)
├── index.ts                        # CLI runner
├── extraction/
│   ├── criteria-prompt.ts          # 4.1 — Explicit criteria
│   ├── few-shot.ts                 # 4.2 — Few-shot examples
│   ├── structured-output.ts        # 4.3 — tool_use schemas
│   └── validation-retry.ts         # 4.4 — Retry loops
├── batch/
│   └── batch-processor.ts          # 4.5 — Batch API
└── review/
    └── multi-pass.ts               # 4.6 — Multi-pass review
```

## Key Patterns to Study

| Pattern | Where | Why It Matters |
|---------|-------|----------------|
| Negative examples in criteria | 4.1 | Reduces false positives by 40-60% |
| Strategic example selection | 4.2 | 3 targeted examples > 20 random ones |
| tool_use as capture contract | 4.3 | Guarantees schema compliance |
| Error feedback injection | 4.4 | Turns 30% retry success into 90%+ |
| custom_id correlation | 4.5 | Enables stateless result processing |
| Split role independence | 4.6 | Prevents anchoring bias between reviewers |
