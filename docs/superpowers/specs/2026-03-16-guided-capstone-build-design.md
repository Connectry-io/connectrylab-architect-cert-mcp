# Guided Capstone Build Mode — Design Specification

## Overview

A progressive, hands-on learning mode where users build their own capstone project while learning certification concepts. Instead of passively reading explanations, users shape a project around their own idea, then build it file-by-file with Claude generating code and explaining how each section maps to exam task statements.

## Constraints

- **Single active build per user**: Only one build can be in `shaping` or `building` status at a time. Starting a new build while one is active requires abandoning the existing one.
- **Fixed 18 build steps**: The step structure is always the same 18 file-grouped steps (see Build Step Structure). Only the generated code content is themed to the user's project.
- **Sequential progression**: Steps must be completed in order. Within each step: quiz first, then build, then next.
- **UUID generation**: All primary keys use `crypto.randomUUID()`.

## Core Flow

The mode has three phases:

### Phase 1: Project Shaping

1. User calls `start_capstone_build` without `theme` to see the 30 criteria
2. User calls `start_capstone_build` with `theme` describing their project idea
3. Tool creates a build record (status: `shaping`), stores the theme, and returns the 30 criteria alongside the user's theme — prompting the LLM to validate coverage
4. **LLM-based validation**: Claude (the hosting LLM) analyzes the description against all 30 criteria, identifies gaps, suggests modifications
5. User refines their idea in conversation with Claude
6. User calls `start_capstone_build` with the refined `theme` to update the build (replaces theme, re-prompts validation)
7. When satisfied, user calls `capstone_build_step` with `action: "confirm"` to transition from `shaping` to `building` and lock in the theme
8. Tool creates the 18 build step records and returns the first step preview

### Phase 2: Interleaved Build

For each of the 18 build steps:

1. **Quiz segment**: User calls `capstone_build_step` with `action: "quiz"` — tool selects 2-3 questions from the question bank filtered by the step's task statements, persists the selected question IDs, and returns them
2. **Answer quiz**: User submits answers via the existing `submit_answer` tool (reuses SM-2, mastery tracking, follow-ups). The capstone tool tracks completion by checking answer records for the selected question IDs.
3. **Build segment**: User calls `capstone_build_step` with `action: "build"` — tool returns the step's task statements, file targets, and code generation hints. The LLM generates themed code + walkthrough.
4. **Advance**: User calls `capstone_build_step` with `action: "next"` — validates quiz and build are complete, advances `currentStep`, returns next step preview

The build steps are ordered incrementally: config → core logic → agents → context → prompts → integration.

### Phase 3: Final Review

1. On the last `next` action, status transitions to `completed`
2. Tool returns: complete project structure, criteria coverage map (all 30 task statements with which step demonstrated each), weak areas (based on quiz performance per domain), and option to continue with targeted practice questions

## New MCP Tools

### `start_capstone_build`

**Purpose**: Initialize or refine a capstone build session.

**Parameters**:
- `theme` (string, optional): User's project idea. Omit to see criteria and instructions.

**Behavior**:
- Without `theme`: Returns the 30 architectural criteria + usage instructions
- With `theme` and no active build: Creates a new build (status: `shaping`), returns criteria + theme for LLM validation
- With `theme` and existing `shaping` build: Updates the theme on the existing build, returns criteria + updated theme for re-validation
- With `theme` and existing `building` build: Returns error — must abandon current build first

**Returns**: Criteria list, theme, and structured prompt for LLM-based coverage validation.

### `capstone_build_step`

**Purpose**: Drive the build through its phases.

**Parameters**:
- `action` (enum): `"confirm"` | `"quiz"` | `"build"` | `"next"` | `"status"` | `"abandon"`
  - `confirm`: Transition from `shaping` to `building`, create step records
  - `quiz`: Get quiz questions for the current step (returns error if already completed)
  - `build`: Get build content for the current step (returns error if quiz not completed)
  - `next`: Advance to next step (returns error if build not completed)
  - `status`: Get current build progress (alias for `capstone_build_status`)
  - `abandon`: Mark current build as `abandoned`

**Step State Machine**:
```
quiz_pending → quiz_done → build_done → complete
     ↑ (quiz action)  ↑ (build action)  ↑ (next action)
```

Out-of-order actions return descriptive error messages (e.g., "Complete the quiz before building. Call with action: 'quiz' first.").

**Returns**:
- `confirm`: First step preview with file targets and task statements
- `quiz`: 2-3 questions with IDs (user answers via `submit_answer`)
- `build`: Task statements, file targets, code generation hints for LLM walkthrough
- `next`: Completed step summary + next step preview (or final review on step 18)
- `status`: Current step, progress percentage, criteria coverage so far
- `abandon`: Confirmation message

### `capstone_build_status`

**Purpose**: Check current build progress (convenience alias).

**Parameters**: None

**Returns**: Current step index, completed/remaining steps, criteria coverage map, quiz performance summary per domain.

## Database Schema

### `capstone_builds` table

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID via `crypto.randomUUID()` |
| userId | TEXT NOT NULL | FK to users |
| theme | TEXT NOT NULL | User's project description |
| currentStep | INTEGER DEFAULT 0 | Current step index (0 = shaping, 1-18 = building) |
| status | TEXT DEFAULT 'shaping' | 'shaping' \| 'building' \| 'completed' \| 'abandoned' |
| themeValidated | INTEGER DEFAULT 0 | Set to 1 on `confirm` action (user locks in theme) |
| createdAt | TEXT NOT NULL | ISO timestamp |
| updatedAt | TEXT NOT NULL | ISO timestamp |

**Constraint**: `UNIQUE(userId, status)` where status IN ('shaping', 'building') — enforced in application code since SQLite doesn't support partial unique indexes. The tool checks for active builds before creating new ones.

### `capstone_build_steps` table

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID via `crypto.randomUUID()` |
| buildId | TEXT NOT NULL | FK to capstone_builds |
| stepIndex | INTEGER NOT NULL | 1-18, order in build sequence |
| fileName | TEXT NOT NULL | Target file (e.g., "src/coordinator.ts") |
| taskStatements | TEXT NOT NULL | JSON array of task statement IDs |
| quizQuestionIds | TEXT | JSON array of selected question IDs (set when quiz is served) |
| quizCompleted | INTEGER DEFAULT 0 | Boolean: all questions answered |
| buildCompleted | INTEGER DEFAULT 0 | Boolean: build content served |
| walkthroughViewed | INTEGER DEFAULT 0 | Boolean: walkthrough served |
| createdAt | TEXT NOT NULL | ISO timestamp |
| updatedAt | TEXT NOT NULL | ISO timestamp |

**Note**: The `buildPlan` column was removed from `capstone_builds` — the 18 fixed steps are defined in `src/data/build-steps.ts` and materialized as `capstone_build_steps` rows on `confirm`.

## Build Step Structure

The 18 build steps are fixed. Each maps to one or more files and covers specific task statements:

| Step | File(s) | Task Statements | Description |
|------|---------|-----------------|-------------|
| 1 | CLAUDE.md, .claude/ | 3.1, 3.2, 3.3 | Project config and rules |
| 2 | package.json, tsconfig.json | 3.4 | Project setup and CI hooks |
| 3 | src/server.ts | 2.1, 2.2 | MCP server with tool registration |
| 4 | src/tools/ | 2.1, 2.3, 2.5 | Tool definitions and scoping |
| 5 | src/error-handling.ts | 2.2 | Error boundaries and recovery |
| 6 | src/coordinator.ts | 1.1, 1.2, 1.6 | Main agentic loop |
| 7 | src/subagents/ | 1.3, 1.4 | Subagent definitions and routing |
| 8 | src/hooks.ts | 1.5 | Pre/post tool-use hooks |
| 9 | src/workflow.ts | 1.4, 1.6 | Multi-step workflows |
| 10 | src/session.ts | 1.7 | Session and state management |
| 11 | src/prompts/system.ts | 4.1, 4.2 | System prompts with few-shot |
| 12 | src/prompts/extraction.ts | 4.3, 4.4 | Structured output and validation |
| 13 | src/prompts/batch.ts | 4.5, 4.6 | Batch processing and multi-pass |
| 14 | src/context/preservation.ts | 5.1 | Context preservation strategies |
| 15 | src/context/triggers.ts | 5.2 | Context refresh triggers |
| 16 | src/context/propagation.ts | 5.3 | Cross-agent context propagation |
| 17 | src/context/scratchpad.ts | 5.4 | Scratchpad and subagent delegation |
| 18 | src/context/confidence.ts | 5.5, 5.6 | Confidence calibration and synthesis |

## Quiz Answer Flow

Quiz answers during capstone build reuse the existing `submit_answer` tool:

1. `capstone_build_step(action: "quiz")` selects 2-3 questions, stores their IDs in `quizQuestionIds`, and returns them
2. User calls `submit_answer(questionId, answer)` for each question — this flows through the existing grading, SM-2, and mastery systems
3. When the user calls `capstone_build_step(action: "build")`, the tool checks the `answers` table for the persisted `quizQuestionIds` to verify completion
4. If not all questions are answered, returns an error listing the remaining question IDs

This avoids duplicating grading logic and keeps all analytics unified.

## Criteria Validation (LLM-Based)

The criteria validation in Phase 1 uses Claude (the LLM hosting this MCP server) to analyze the user's project description. The tool returns structured guidance that Claude then uses to have a conversation with the user:

1. Tool returns the 30 criteria + user's theme description
2. Claude (the LLM) analyzes coverage, identifies gaps, suggests modifications
3. This is naturally LLM-based since the MCP tool's output is processed by the LLM
4. The tool stores validation results but the actual analysis happens in the LLM layer

This means `start_capstone_build` doesn't need to call an external LLM API — it returns the criteria and theme, and the hosting LLM does the validation as part of its normal response generation.

## Walkthrough Format

Each build step's walkthrough follows a consistent structure (ASCII style matching existing tools):

```
=== Step N: <file-name> ===

Task Statements Covered: X.Y, X.Z

--- Generated Code ---
<themed code for user's project>

--- Walkthrough ---

> Section: <function/class/block name>
  Task Statement X.Y -- <task statement title>
  <explanation of what this code does and why>
  <how it demonstrates the certification concept>
  <connection to the broader architecture>

> Section: <next function/class/block>
  ...

--- Key Takeaways ---
- <concept 1 reinforced>
- <concept 2 reinforced>

--- Next Step Preview ---
Up next: <next file> covering <task statements>
```

## Data Requirements

### Bundled Criteria

A new data file `src/data/criteria.ts` exports the 30 task statements with:
- ID (e.g., "1.1")
- Title
- Domain
- Description (what competency is being assessed)

### Build Step Templates

A new data file `src/data/build-steps.ts` exports the fixed 18 build step definitions:

```typescript
interface BuildStep {
  readonly stepIndex: number;        // 1-18
  readonly fileName: string;         // Target file path
  readonly taskStatements: readonly string[];  // e.g., ["3.1", "3.2", "3.3"]
  readonly description: string;      // Brief description of what gets built
  readonly codeHints: string;        // Prompt hints for LLM code generation
}
```

## Integration with Existing Tools

- **Quiz questions**: Build step quiz segments reuse questions from the existing 390-question bank, filtered by the step's task statements
- **Answer grading**: Uses `submit_answer` — no duplicate grading logic
- **Spaced repetition**: Quiz answers during build steps feed into the same SM-2 scheduling system
- **Mastery tracking**: Build step quiz performance updates the same mastery scores
- **Follow-up actions**: After build step quizzes, the same follow-up options (code_example, concept, handout) are available via `follow_up`
- **Scaffold project**: The existing `scaffold_project` tool shows reference implementations; the capstone build creates a *user-themed* version

## Non-Goals

- No file system writes — all generated code is returned as tool output text, not written to disk
- No external LLM API calls — validation uses the hosting LLM naturally
- No multiplayer/shared builds
- No custom criteria beyond the 30 exam task statements
- No step skipping (sequential progression required)
- No dynamic step structures (always 18 fixed steps)

## Success Criteria

1. User can start a capstone build, describe a theme, and get coverage validation
2. All 30 task statements are addressed across the 18 build steps
3. Quiz questions are contextually relevant to each build step
4. Generated code is themed to the user's project idea
5. Walkthroughs clearly map code sections to task statements
6. Build progress persists across sessions via SQLite
7. Final review shows complete criteria coverage map
8. Abandoning a build allows starting a fresh one
9. Resuming a session presents the same quiz questions (persisted IDs)
