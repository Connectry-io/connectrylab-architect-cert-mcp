# Domain 5: Mini Context Manager — Long-Session Reliability Patterns

**Mental Model:** "Context is finite and degrades — extract facts, trim noise, verify provenance"

## What This Project Teaches

This reference project demonstrates all Domain 5 task statements for the Connectry Architect Certification. Domain 5 covers the patterns needed to keep AI agent systems reliable across long sessions, large codebases, and multi-source information synthesis.

| Task | Topic | File |
|------|-------|------|
| 5.1 | Context preservation (progressive summarization, lost-in-middle, trimming) | `src/context/preservation.ts` |
| 5.2 | Escalation patterns (typed triggers, customer preferences, sentiment unreliability) | `src/escalation/triggers.ts`, `src/escalation/preferences.ts` |
| 5.3 | Error propagation (AgentResult envelope, access failures vs empty results, partial results) | `src/errors/propagation.ts` |
| 5.4 | Large codebase context (scratchpad files, subagent delegation, /compact survival) | `src/context/scratchpad.ts`, `src/context/subagent-delegation.ts` |
| 5.5 | Human review workflows (field-level confidence, stratified sampling, calibration) | `src/review/confidence.ts`, `src/review/calibration.ts` |
| 5.6 | Information provenance (claim-source mappings, conflict annotation, temporal handling) | `src/provenance/synthesis.ts` |

## How to Run

```bash
# Install dependencies
npm install

# Run the demo (no API key needed for most demos)
npx tsx src/index.ts

# For API-dependent features (fact extraction, subagent delegation)
export ANTHROPIC_API_KEY=sk-ant-...
npx tsx src/index.ts
```

## File-by-File Walkthrough

### `src/types.ts` — Shared Types

The type foundation for every module. All interfaces use `readonly` properties to enforce immutability. Includes Zod schemas for runtime validation at system boundaries.

Key types: `ExtractedFact`, `ProgressiveSummary`, `TrimmedOutput`, `EscalationTrigger`, `AgentResult<T>`, `SynthesizedClaim`.

### `src/context/preservation.ts` — Context Preservation (5.1)

Demonstrates three strategies for managing context window limits:

- **Fact extraction**: Transforms verbose tool output into compact, categorized facts using Claude. Raw output of 500 lines becomes 5-10 structured facts.
- **Progressive summarization**: When context usage approaches 70%, older messages are replaced with compressed summaries that preserve all extracted facts.
- **Tool output trimming**: Three strategies — `structured` (parse JSON, keep skeleton), `truncate` (keep head/tail, mark middle), `sample` (every Nth line).
- **Constraint restatement**: Combats "lost in the middle" by restating constraints at the point of use, not just at the beginning.

### `src/context/scratchpad.ts` — External Scratchpad (5.4)

The context window is RAM; disk is long-term memory. This module implements a keyed scratchpad system that persists to markdown files:

- **Write before you need it**: Record findings as you discover them, not after.
- **Survive /compact**: After compaction wipes the context window, re-read the scratchpad to recover working state.
- **Keyed entries**: Update-or-insert semantics prevent duplicate entries.
- **Re-anchoring protocol**: A prompt template that tells the agent to read the scratchpad as its first action after /compact.

### `src/context/subagent-delegation.ts` — Coordinator Pattern (5.4)

The coordinator never reads raw files. It delegates to subagents who each get a fresh context window scoped to their task:

- **Task planning**: Decomposes a goal into independent, parallelizable subtasks.
- **Scoped context**: Each subagent sees only the files relevant to its task.
- **Summary collection**: Subagents return summaries, never raw content.
- **Partial failure handling**: If 3 of 5 subagents succeed, the coordinator works with what it has.

### `src/escalation/triggers.ts` — Typed Escalation Triggers (5.2)

Escalation is a policy decision, not a vibes check. This module implements deterministic, typed triggers:

- **Category-based evaluation**: policy violations, confidence thresholds, sensitive topics, customer requests, repeated failures, financial impact.
- **No sentiment analysis**: Every trigger has a testable condition. "Confidence below 0.7" is testable; "customer seems upset" is not.
- **Priority ordering**: Critical triggers evaluated first.
- **Default trigger set**: Production-ready defaults for common support scenarios.

### `src/escalation/preferences.ts` — Customer Preferences (5.2)

Triggers decide IF to escalate; preferences decide HOW and WHERE:

- **Channel routing**: email, Slack, PagerDuty, in-app based on customer preference.
- **Topic overrides**: "Billing issues always go to finance@company.com via email."
- **Severity upgrading**: Critical events auto-upgrade to PagerDuty regardless of default channel.
- **Immutable builder pattern**: Preferences built via composable functions.

### `src/errors/propagation.ts` — AgentResult<T> Envelope (5.3)

Every agent operation returns an envelope, never throws. Three status levels:

- **success**: Operation completed with all expected data.
- **partial**: Some data available but errors occurred — often more useful than total failure.
- **failure**: No usable data. Critical distinction: `ACCESS_FAILURE` (retry may help) vs `EMPTY_RESULT` (retry won't help).

Includes combinators (`mapResult`, `flatMapResult`, `combineResults`), wrappers (`wrapAsync`, `wrapSync`), and error classification.

### `src/review/confidence.ts` — Field-Level Confidence (5.5)

Not all fields need review. Only flag what falls below the threshold:

- **Per-type thresholds**: Medical records (0.95) are stricter than invoices (0.80).
- **Critical field boost**: Fields like "dosage" and "amount" get a higher threshold.
- **Review priority tiers**: skip, spot_check, full_review, expert_review.
- **Stratified sampling**: Ensures each document type is represented proportionally to its risk.

### `src/review/calibration.ts` — Calibration Analysis (5.5)

Trust but verify, then adjust:

- **Bucket analysis**: Groups predictions by confidence range and compares predicted vs actual accuracy.
- **Brier score**: Overall calibration quality metric (lower = better).
- **Threshold adjustment**: Uses human corrections to automatically tune review thresholds.
- **Correction recording**: Bridges the gap between model predictions and human ground truth.

### `src/provenance/synthesis.ts` — Information Provenance (5.6)

Every claim has a receipt:

- **Source bindings**: Every piece of data traces back to its origin with reliability scores.
- **Default reliability by type**: database (0.95) > api_response (0.85) > document (0.80) > user_input (0.70) > cached_result (0.60) > model_generation (0.50).
- **Temporal decay**: Exponential penalty for stale data, configurable half-life.
- **Conflict detection**: When sources disagree, annotate the conflict with a resolution strategy.
- **Citation formatting**: Both detailed provenance and inline citation formats.

### `src/index.ts` — Example Runner

Runs all patterns in sequence with realistic scenarios. No API key needed for most demos (escalation, errors, review, provenance). API-dependent features (fact extraction, subagent delegation) require `ANTHROPIC_API_KEY`.

## Key Certification Concepts

1. **Context is finite**: Extract structured facts, discard raw output, restate constraints at point of use.
2. **Sentiment is unreliable**: Use typed, policy-based escalation triggers with testable conditions.
3. **Access failure is not empty result**: These are fundamentally different — one suggests retry, the other doesn't.
4. **Disk survives /compact**: Write findings to scratchpad files before you need them, re-read after compaction.
5. **Review what matters**: Field-level confidence focuses human attention where the model is least certain.
6. **Show your sources**: Every claim needs provenance — source bindings, conflict annotations, temporal penalties.
