# Guided Capstone Build Mode — Design Specification

## Overview

A progressive, hands-on learning mode where users build their own capstone project while learning certification concepts. Instead of passively reading explanations, users shape a project around their own idea, then build it file-by-file with Claude generating code and explaining how each section maps to exam task statements.

## Core Flow

The mode has three phases:

### Phase 1: Project Shaping

1. User calls `start_capstone_build` tool
2. Tool presents the 30 architectural criteria (task statements) the capstone must satisfy
3. User describes their project idea (e.g., "a multi-agent code review system")
4. **LLM-based validation**: Claude analyzes the user's description against all 30 criteria, identifies which are naturally covered and which have gaps
5. Claude suggests additions or modifications to cover gaps (e.g., "To cover task statement 5.4 on subagent delegation, your review system could delegate analysis to specialized sub-agents")
6. User refines until Claude confirms all 30 criteria can be addressed
7. Claude generates a build plan: ~18 file-grouped steps matching the capstone's file structure

### Phase 2: Interleaved Build

For each build step:

1. **Quiz segment**: 2-3 questions on the task statements covered by the upcoming file
2. **Build segment**: Claude generates the file's code, themed to the user's project idea
3. **Guided walkthrough**: Claude explains each section of the generated code:
   - What the code does
   - Which task statement(s) it demonstrates
   - How it connects to the broader architecture
   - Why the pattern was chosen (linking back to exam concepts)
4. User proceeds to the next step

The ~18 build steps are grouped by file, ordered to build up the project incrementally (config → core logic → agents → context → prompts → integration).

### Phase 3: Final Review

1. Claude presents the completed project structure
2. Summary of all 30 criteria and where each is demonstrated
3. Weak areas identified for further study
4. Option to export or continue with practice questions on weak areas

## New MCP Tools

### `start_capstone_build`

**Purpose**: Initialize a new capstone build session.

**Parameters**:
- `theme` (string, optional): User's project idea. Omit to see criteria and instructions first.

**Returns**:
- Without theme: List of 30 architectural criteria + instructions
- With theme: LLM validation result with coverage analysis, gap suggestions, and proposed build plan

### `capstone_build_step`

**Purpose**: Execute the next build step in the sequence.

**Parameters**:
- `action` (enum): `"quiz"` | `"build"` | `"next"`
  - `quiz`: Get quiz questions for the current step's task statements
  - `build`: Get the generated code + guided walkthrough for the current step
  - `next`: Advance to the next build step
- `answer` (string, optional): Answer for quiz questions (A/B/C/D)

**Returns**:
- Quiz: Questions tied to the current step's task statements
- Build: Generated code file + walkthrough explanation mapping code sections to task statements
- Next: Summary of completed step + preview of next step

### `capstone_build_status`

**Purpose**: Check current build progress.

**Parameters**: None

**Returns**: Current step, completed steps, remaining steps, criteria coverage so far

## Database Schema

### `capstone_builds` table

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID |
| userId | TEXT NOT NULL | FK to users |
| theme | TEXT NOT NULL | User's project description |
| buildPlan | TEXT NOT NULL | JSON array of build steps |
| currentStep | INTEGER DEFAULT 0 | Current step index |
| status | TEXT DEFAULT 'shaping' | 'shaping' \| 'building' \| 'completed' |
| criteriaValidation | TEXT | JSON: LLM validation results |
| createdAt | TEXT | ISO timestamp |
| updatedAt | TEXT | ISO timestamp |

### `capstone_build_steps` table

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID |
| buildId | TEXT NOT NULL | FK to capstone_builds |
| stepIndex | INTEGER NOT NULL | Order in build sequence |
| fileName | TEXT NOT NULL | Target file (e.g., "src/coordinator.ts") |
| taskStatements | TEXT NOT NULL | JSON array of task statement IDs |
| quizCompleted | INTEGER DEFAULT 0 | Boolean |
| buildCompleted | INTEGER DEFAULT 0 | Boolean |
| walkthroughViewed | INTEGER DEFAULT 0 | Boolean |

## Build Step Structure

Each build step maps to one or more files and covers specific task statements. The ~18 steps follow the capstone's file structure:

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

## Criteria Validation (LLM-Based)

The criteria validation in Phase 1 uses Claude (the LLM hosting this MCP server) to analyze the user's project description. The tool returns structured guidance that Claude then uses to have a conversation with the user:

1. Tool returns the 30 criteria + user's theme description
2. Claude (the LLM) analyzes coverage, identifies gaps, suggests modifications
3. This is naturally LLM-based since the MCP tool's output is processed by the LLM
4. The tool stores validation results but the actual analysis happens in the LLM layer

This means `start_capstone_build` doesn't need to call an external LLM API — it returns the criteria and theme, and the hosting LLM does the validation as part of its normal response generation.

## Walkthrough Format

Each build step's walkthrough follows a consistent structure:

```
═══ Step N: <file-name> ═══

📋 Task Statements Covered: X.Y, X.Z

--- Generated Code ---
<themed code for user's project>

--- Walkthrough ---

▸ Section: <function/class/block name>
  Task Statement X.Y — <task statement title>
  <explanation of what this code does and why>
  <how it demonstrates the certification concept>
  <connection to the broader architecture>

▸ Section: <next function/class/block>
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

A new data file `src/data/build-steps.ts` exports the 18 build step definitions with:
- Step index
- Target file path(s)
- Associated task statement IDs
- Brief description of what gets built
- Code generation prompt hints (to help the LLM generate themed code)

## Integration with Existing Tools

- **Quiz questions**: Build step quiz segments reuse questions from the existing 390-question bank, filtered by the step's task statements
- **Spaced repetition**: Quiz answers during build steps feed into the same SM-2 scheduling system
- **Mastery tracking**: Build step quiz performance updates the same mastery scores
- **Follow-up actions**: After build step quizzes, the same follow-up options (code_example, concept, handout) are available
- **Scaffold project**: The existing `scaffold_project` tool shows reference implementations; the capstone build creates a *user-themed* version

## Non-Goals

- No file system writes — all generated code is returned as tool output text, not written to disk
- No external LLM API calls — validation uses the hosting LLM naturally
- No multiplayer/shared builds
- No custom criteria beyond the 30 exam task statements
- No partial builds or step skipping (sequential progression required)

## Success Criteria

1. User can start a capstone build, describe a theme, and get coverage validation
2. All 30 task statements are addressed across the ~18 build steps
3. Quiz questions are contextually relevant to each build step
4. Generated code is themed to the user's project idea
5. Walkthroughs clearly map code sections to task statements
6. Build progress persists across sessions via SQLite
7. Final review shows complete criteria coverage map
