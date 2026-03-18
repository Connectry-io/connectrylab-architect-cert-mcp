<p align="center">
  <br />
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Connectry-io/connectrylab-architect-cert-mcp/master/.github/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Connectry-io/connectrylab-architect-cert-mcp/master/.github/assets/logo-light.svg">
    <img alt="Architect Cert" src="https://raw.githubusercontent.com/Connectry-io/connectrylab-architect-cert-mcp/master/.github/assets/logo-dark.svg" width="420">
  </picture>
  <br />
</p>

<h3 align="center">
  Ace the Claude Certified Architect exam
</h3>

<p align="center">
  Adaptive certification prep powered by the Model Context Protocol.<br />
  390 questions. Guided capstone build. 30 concept handouts. 6 reference projects. Practice exams. Spaced repetition. Zero sycophancy.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/connectry-architect-mcp"><img src="https://img.shields.io/npm/v/connectry-architect-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/connectry-architect-mcp"><img src="https://img.shields.io/npm/dm/connectry-architect-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="npm downloads"></a>
  <a href="https://github.com/Connectry-io/connectrylab-architect-cert-mcp"><img src="https://img.shields.io/github/stars/Connectry-io/connectrylab-architect-cert-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="GitHub stars"></a>
  <a href="https://github.com/Connectry-io/connectrylab-architect-cert-mcp/blob/master/LICENSE"><img src="https://img.shields.io/github/license/Connectry-io/connectrylab-architect-cert-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="License"></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-study-modes">Study Modes</a> •
  <a href="#-guided-capstone-build">Capstone Build</a> •
  <a href="#-reference-projects">Reference Projects</a> •
  <a href="#-concept-handouts">Concept Handouts</a> •
  <a href="#-exam-domains">Exam Domains</a> •
  <a href="#-tools">Tools</a> •
  <a href="#-architecture">Architecture</a>
</p>

---

## What is Architect Cert?

Architect Cert is a free, open-source [MCP](https://modelcontextprotocol.io/) server that turns Claude into your personal certification tutor for the **Claude Certified Architect — Foundations** exam. No courses, no slides, no video lectures — just ask Claude and study.

It ships with:
- **390 scenario-based questions** across all 5 exam domains and 30 task statements
- **Guided capstone build** — shape your own project, then build it step-by-step while learning every task statement hands-on
- **30 concept handouts** — one per task statement, with code examples and common mistakes
- **6 reference projects** — runnable TypeScript codebases demonstrating each domain in practice
- **Practice exams** — 60-question weighted exams with history tracking and improvement trends
- **Interactive follow-ups** — wrong answer? Dive into code examples, concept lessons, handouts, or reference projects before moving on
- **PDF generation** — branded handout PDFs with the Architect Cert logo for offline study
- **Spaced repetition** — SM-2 algorithm schedules reviews at optimal intervals
- **Deterministic grading** — pure function grading, no LLM judgment, zero sycophancy

Everything runs locally. No cloud, no accounts, no telemetry.

<br />

## Quick Start

### 1. Install

```bash
npm install -g connectry-architect-mcp
```

### 2. Configure Your MCP Client

<details>
<summary><b>Claude Code</b> (VS Code / Cursor / Terminal)</summary>

Add to `.mcp.json` in your project or `~/.claude.json` globally:

```json
{
  "mcpServers": {
    "connectry-architect": {
      "command": "connectry-architect-mcp"
    }
  }
}
```

Then restart Claude Code. The server starts automatically when Claude loads.

</details>

<details>
<summary><b>Claude Desktop</b> — macOS</summary>

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "connectry-architect": {
      "command": "connectry-architect-mcp"
    }
  }
}
```

Restart Claude Desktop. You'll see the MCP tools icon appear in the chat input.

</details>

<details>
<summary><b>Claude Desktop</b> — Windows</summary>

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "connectry-architect": {
      "command": "connectry-architect-mcp"
    }
  }
}
```

Restart Claude Desktop. You'll see the MCP tools icon appear in the chat input.

</details>

<details>
<summary><b>Any MCP-compatible client</b></summary>

Architect Cert works with any client that supports the [Model Context Protocol](https://modelcontextprotocol.io/). Configure it as a stdio server:

- **Command:** `connectry-architect-mcp`
- **Arguments:** none
- **Transport:** stdio

The server exposes 17 tools, 8 prompts, and 3 resource types.

</details>

### 3. Start Studying

Restart your MCP client and start chatting:

| What you want | What to ask Claude |
|---------------|-------------------|
| Find your weak areas | *"Start an assessment to figure out where I stand"* |
| Practice questions | *"Give me a practice question"* |
| Focus on a domain | *"Give me a question about agentic architecture"* |
| Learn a concept first | *"Teach me about task 2.3 — tool provisioning"* |
| Build your own capstone | *"I want to start a guided capstone build"* |
| Take a practice exam | *"I want to take a practice exam"* |
| Check your progress | *"Show my study progress"* |
| Get a study plan | *"What should I study next?"* |
| Explore a reference project | *"Show me a reference project for domain 1"* |
| Generate PDF handouts | Run `npm run generate:pdfs` in the project directory |
| Reset and start over | *"Reset my progress"* |

<br />

## Features

<table>
<tr>
<td width="50%">

### Adaptive Learning
SM-2 spaced repetition resurfaces weak areas at optimal intervals. Questions you get wrong come back sooner — questions you master fade away.

### 390 Exam Questions
13 scenario-based questions per task statement across all 30 topics. Easy, medium, and hard difficulties with balanced answer distributions across A/B/C/D.

### Deterministic Grading
Pure function grading — no LLM judgment calls. Your answer is checked against a verified key. Right is right, wrong is wrong. Every wrong answer includes a specific explanation.

</td>
<td width="50%">

### Zero Sycophancy
Claude won't sugarcoat wrong answers. Anti-sycophancy rules are enforced at the protocol level. Wrong means wrong — no "you were on the right track."

### Progress Tracking
Persistent SQLite database tracks every answer, mastery level, and review schedule. Pick up exactly where you left off across sessions, devices, and MCP clients.

### Smart Question Selection
Three-priority algorithm: overdue reviews first, then weak areas, then new material. You always work on what matters most for exam readiness.

</td>
</tr>
<tr>
<td width="50%">

### Interactive Follow-Ups
After every answer, you get follow-up options. Got it wrong? Choose to see a code example, read the concept lesson, open the handout, or explore the relevant reference project — then jump back to your quiz.

### Guided Capstone Build
Shape your own project idea, then build it file-by-file across 18 steps. Each step: quiz on the relevant task statements, Claude generates themed code, then a walkthrough explains how every section maps to exam concepts. Learn by doing.

</td>
<td width="50%">

### 30 Concept Handouts
Every task statement has a structured handout: concept explanation, TypeScript code example, common mistakes, and documentation references. Available as markdown in Claude or as branded PDFs for offline study.

### 6 Reference Projects
Runnable TypeScript codebases that demonstrate each domain in practice. A capstone project ties all 5 domains together. Each file maps to specific task statements so you can see concepts in real code.

### Practice Exams
Full 60-question exams weighted by domain — just like the real certification. Fresh questions each time (no repetition from your last attempt). Scored out of 1000, passing at 720. All attempts saved with per-domain breakdowns.

### PDF Handouts
Generate branded PDFs for all 30 handouts with `npm run generate:pdfs`. Each PDF includes the Architect Cert logo, domain label, and clean formatting for printing or tablet reading.

</td>
</tr>
</table>

<br />

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                         YOUR MACHINE                             │
│                                                                  │
│   ┌──────────────┐       ┌──────────────────────────┐           │
│   │ Claude Desktop│       │   Architect Cert MCP     │           │
│   │ Claude Code   │◄─────►│                          │           │
│   │ Any MCP client│ stdio │  17 tools                │           │
│   └──────────────┘       │   8 prompts               │           │
│                           │   3 resource types        │           │
│                           └──────────┬───────────────┘           │
│                                      │                           │
│                    ┌─────────────────┼─────────────────┐         │
│                    │                 │                  │         │
│              ~/.connectry-      390 questions      6 reference   │
│               architect/       30 handouts         projects      │
│               progress.db     (bundled JSON/MD)   (bundled TS)   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**The study loop:**

1. **Assessment** — 15 diagnostic questions baseline your knowledge across all 5 domains
2. **Path assignment** — Score < 60% gets the beginner-friendly track; score >= 60% gets the exam-weighted track
3. **Learn first** — Read the concept handout for a topic before tackling questions (or skip straight to practice)
4. **Smart selection** — Each question chosen by priority: overdue reviews > weak areas > new material
5. **Deterministic grading** — Pure function checks your answer against the verified key
6. **Interactive follow-up** — Wrong answer? Dive into code examples, concept lessons, or reference projects
7. **Spaced repetition** — SM-2 algorithm schedules reviews: 1 day > 3 days > 6 days > ...
8. **Practice exams** — Take full 60-question exams when you're ready, track improvement over time

**Data storage:**

- Progress is stored locally at `~/.connectry-architect/progress.db` (SQLite, WAL mode)
- Your user config lives at `~/.connectry-architect/config.json` (auto-created on first run)
- No cloud, no accounts, no telemetry — everything stays on your machine

<br />

## Study Modes

### Initial Assessment

Start with 15 questions across all domains. Based on your score:

- **< 60% accuracy** — **Beginner-Friendly Path**: Starts with fundamentals, builds up gradually through each domain. Focuses on easy and medium questions first.
- **>= 60% accuracy** — **Exam-Weighted Path**: Focuses on high-weight domains first (D1 at 27%, D3 & D4 at 20% each). Targets weak areas aggressively.

### Learn-First Mode

Before tackling questions on any topic, you can read the concept handout first:

```
You: "Teach me about task 1.5 — tool-use hooks"

Claude: [loads the concept handout with key concepts, code examples,
         common mistakes, and documentation references]

        Ready to test your understanding? I have 13 questions
        on this topic ranging from easy to hard.
```

The server tracks which handouts you've viewed. You can always come back to them later.

### Interactive Follow-Ups

After every answer, you get contextual follow-up options:

**After a wrong answer:**
```
The correct answer is B. [explanation]

  > Got it, next question
  > Explain with a code example
  > Show me the concept lesson
  > Show me the handout
  > Show me in the reference project
```

**After a correct answer:**
```
Correct!

  > Next question
  > Explain why the others are wrong
```

Each option dives deeper into the concept — then brings you right back to your quiz. This means you never have to leave your study flow to look something up.

### Adaptive Practice

Every question is selected by a three-priority algorithm:

1. **Overdue reviews** — Spaced repetition items due for review today
2. **Weak areas** — Topics where your mastery is below 50%
3. **New material** — Fresh questions from your recommended domain

### Practice Exams

Full 60-question exams that simulate the real certification:

| Detail | Value |
|--------|-------|
| Total questions | 60 |
| D1: Agentic Architecture | 16 questions (27%) |
| D2: Tool Design & MCP | 11 questions (18%) |
| D3: Claude Code Config | 12 questions (20%) |
| D4: Prompt Engineering | 12 questions (20%) |
| D5: Context & Reliability | 9 questions (15%) |
| Scoring | 0–1000, passing at 720 |
| Question selection | Fresh set each time — avoids repeating your most recent attempt |

All attempts are saved with per-domain score breakdowns and improvement trends.

### Mastery Levels

Each of the 30 task statements has an independent mastery level:

| Level | Criteria | What it means |
|-------|----------|---------------|
| **Unassessed** | No attempts yet | You haven't seen questions on this topic |
| **Weak** | < 50% accuracy | Needs significant study — questions resurface frequently |
| **Developing** | 50–69% accuracy | Making progress — keep practicing |
| **Strong** | 70–89% accuracy | Good understanding — review intervals are longer |
| **Mastered** | >= 90% accuracy, 5+ attempts, 3+ consecutive correct | Exam-ready — rare reviews |

### Spaced Repetition (SM-2)

The [SM-2 algorithm](https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm) schedules review intervals:

- **First review:** 1 day after answering
- **Second review:** 3 days after first review
- **Subsequent reviews:** Previous interval x ease factor (starts at 2.5)
- **Wrong answer:** Interval resets, ease factor decreases by 0.2 (floor: 1.3)
- **Correct answer:** Ease factor increases by 0.1

Difficult questions come back often. Easy ones space out to weeks or months.

<br />

## Guided Capstone Build

The most hands-on way to learn — build your own project from scratch while covering all 30 task statements. Instead of just answering questions, you architect a real system themed to your own idea.

### How it works

The capstone build has three phases:

**Phase 1 — Project Shaping**

You describe a project idea (e.g., "a multi-agent code review system"). Claude analyzes your idea against all 30 architectural criteria and identifies gaps. You refine together until every task statement is covered.

```
You: "I want to start a guided capstone build"

Claude: [presents the 30 criteria across all 5 domains]
        Describe your project idea and I'll analyze coverage.

You: "A multi-agent code review system that analyzes PRs"

Claude: Your idea naturally covers 24/30 criteria. To cover the
        remaining 6, I'd suggest adding: [specific suggestions
        mapped to task statements]
```

**Phase 2 — Interleaved Build (18 steps)**

Each step follows the same pattern:

1. **Quiz** — 2-3 questions on the task statements you're about to build
2. **Build** — Claude generates the file's code, themed to your project
3. **Walkthrough** — Line-by-line explanation mapping code to task statements

The 18 steps build incrementally:

| Steps | What you build | Task Statements |
|-------|---------------|-----------------|
| 1-2 | Project config (CLAUDE.md, package.json) | 3.1-3.4 |
| 3-5 | MCP server, tools, error handling | 2.1-2.5 |
| 6-10 | Agentic loop, subagents, hooks, workflows, sessions | 1.1-1.7 |
| 11-13 | Prompts: system, extraction, batch processing | 4.1-4.6 |
| 14-18 | Context: preservation, triggers, propagation, scratchpad, confidence | 5.1-5.6 |

Every quiz answer feeds into the same spaced repetition and mastery tracking as regular practice.

**Phase 3 — Final Review**

After step 18, you get a complete coverage map: all 30 task statements, where each is demonstrated in your project, and your quiz performance per domain. Weak areas are flagged for further study.

### Capstone build tools

| Tool | What it does |
|------|-------------|
| `start_capstone_build` | See the 30 criteria, describe your theme, refine until coverage is complete |
| `capstone_build_step` | Drive the build: confirm, quiz, build, next, status, or abandon |
| `capstone_build_status` | Check your progress — current step, criteria coverage, quiz performance |

### How it connects to everything else

- Quiz answers during the build use the same `submit_answer` grading and SM-2 scheduling
- After any quiz question, you can use the same follow-up options (code example, concept lesson, handout, reference project)
- The reference projects show how the capstone structure looks when complete
- Progress persists across sessions — pick up where you left off

<br />

## Reference Projects

Architect Cert includes **6 complete reference projects** — runnable TypeScript codebases that demonstrate certification concepts in real code. Every file has a header comment mapping it to specific task statements.

| Project | Focus | Files | What You'll See |
|---------|-------|-------|-----------------|
| **Capstone** | All 5 domains | 24 | Full multi-agent support system with MCP server, coordinator, subagents, prompt engineering, context management, and hooks |
| **D1 — Agentic Loop** | Domain 1 | 10 | Multi-agent research coordinator with agentic loops, subagent spawning, hooks, session management, and task decomposition |
| **D2 — Tool Design** | Domain 2 | 12 | MCP server with split tools, structured errors, agent-scoped tool distribution, resources, and built-in tool patterns |
| **D3 — Claude Code Config** | Domain 3 | 14 | Complete config reference: CLAUDE.md hierarchy, slash commands, path rules, CI/CD workflows — not runnable code, but a real config layout |
| **D4 — Prompt Engineering** | Domain 4 | 11 | Data extraction pipeline with explicit criteria, few-shot, structured output, validation-retry, batch processing, and multi-pass review |
| **D5 — Context Manager** | Domain 5 | 14 | Long-session patterns: context preservation, scratchpad, subagent delegation, escalation, error propagation, confidence calibration, provenance |

### How to access them

Ask Claude:

```
You: "Show me a reference project for domain 1"

Claude: [calls scaffold_project, returns the project README,
         file listing, and architecture walkthrough]
```

Or browse them directly in the repo under `projects/`.

### How they connect to the study flow

When you get a question wrong, one of the follow-up options is **"Show me in the reference project"** — this takes you straight to the relevant domain project so you can see the concept implemented in real code. Then you jump back to your quiz.

<br />

## Concept Handouts

Every task statement has a **concept handout** — a structured study document (~500-800 words) that covers:

- **Concept** — The core idea, mental model, and when/why to use it
- **Code Example** — Realistic TypeScript demonstrating the pattern
- **Common Mistakes** — The 3-5 most frequent errors (which map to exam wrong answers)
- **References** — Links to Anthropic's official documentation

### Reading handouts in Claude

```
You: "Show me the handout for task 2.3"

Claude: [loads the full handout with concept, code, mistakes, references]
```

### Generating PDF handouts

You can generate branded PDFs for all 30 handouts for offline study:

```bash
cd connectrylab-architect-cert-mcp
npm run generate:pdfs
```

This creates 30 PDFs in `generated/handouts/` with:
- Architect Cert logo and domain label in the header
- Clean formatting with syntax-highlighted code blocks
- "Connectry LABS — Claude Certified Architect Exam Prep — Free & Open Source" footer

<br />

## Exam Domains

The Claude Certified Architect — Foundations exam covers 5 domains:

| # | Domain | Weight | Tasks | Questions |
|---|--------|--------|-------|-----------|
| 1 | Agentic Architecture & Orchestration | 27% | 7 | 91 |
| 2 | Tool Design & MCP Integration | 18% | 5 | 65 |
| 3 | Claude Code Configuration & Workflows | 20% | 6 | 78 |
| 4 | Prompt Engineering & Structured Output | 20% | 6 | 78 |
| 5 | Context Management & Reliability | 15% | 6 | 78 |
| | **Total** | **100%** | **30** | **390** |

### 30 Task Statements

<details>
<summary><b>Domain 1 — Agentic Architecture & Orchestration</b> (7 tasks, 91 questions)</summary>

| Task | Description |
|------|-------------|
| 1.1 | Design and implement agentic loops for autonomous task execution |
| 1.2 | Orchestrate multi-agent systems with coordinator-subagent patterns |
| 1.3 | Configure subagent invocation, context passing, and spawning |
| 1.4 | Implement multi-step workflows with enforcement and handoff patterns |
| 1.5 | Apply Agent SDK hooks for tool call interception and data normalization |
| 1.6 | Design task decomposition strategies for complex workflows |
| 1.7 | Manage session state, resumption, and forking |

</details>

<details>
<summary><b>Domain 2 — Tool Design & MCP Integration</b> (5 tasks, 65 questions)</summary>

| Task | Description |
|------|-------------|
| 2.1 | Design effective tool interfaces with clear descriptions and boundaries |
| 2.2 | Implement structured error responses for MCP tools |
| 2.3 | Distribute tools appropriately across agents and configure tool choice |
| 2.4 | Integrate MCP servers into Claude Code and agent workflows |
| 2.5 | Select and apply built-in tools effectively |

</details>

<details>
<summary><b>Domain 3 — Claude Code Configuration & Workflows</b> (6 tasks, 78 questions)</summary>

| Task | Description |
|------|-------------|
| 3.1 | Configure CLAUDE.md files with appropriate hierarchy and scoping |
| 3.2 | Create and configure custom slash commands and skills |
| 3.3 | Apply path-specific rules for conditional convention loading |
| 3.4 | Determine when to use plan mode vs direct execution |
| 3.5 | Apply iterative refinement techniques for progressive improvement |
| 3.6 | Integrate Claude Code into CI/CD pipelines |

</details>

<details>
<summary><b>Domain 4 — Prompt Engineering & Structured Output</b> (6 tasks, 78 questions)</summary>

| Task | Description |
|------|-------------|
| 4.1 | Design prompts with explicit criteria to improve precision |
| 4.2 | Apply few-shot prompting to improve output consistency |
| 4.3 | Enforce structured output using tool use and JSON schemas |
| 4.4 | Implement validation, retry, and feedback loops |
| 4.5 | Design efficient batch processing strategies |
| 4.6 | Design multi-instance and multi-pass review architectures |

</details>

<details>
<summary><b>Domain 5 — Context Management & Reliability</b> (6 tasks, 78 questions)</summary>

| Task | Description |
|------|-------------|
| 5.1 | Manage conversation context to preserve critical information |
| 5.2 | Design effective escalation and ambiguity resolution patterns |
| 5.3 | Implement error propagation strategies across multi-agent systems |
| 5.4 | Manage context effectively in large codebase exploration |
| 5.5 | Design human review workflows and confidence calibration |
| 5.6 | Preserve information provenance and handle uncertainty in synthesis |

</details>

<br />

## Tools

Architect Cert provides **17 MCP tools** that Claude uses to deliver the study experience:

| Tool | Description |
|------|-------------|
| `start_assessment` | Begin with 15 diagnostic questions to determine your learning path |
| `get_practice_question` | Get the next adaptive question (reviews > weak areas > new material) |
| `submit_answer` | Grade your answer deterministically — includes interactive follow-up options |
| `follow_up` | Handle post-answer actions: code examples, concept lessons, handouts, reference projects |
| `get_progress` | View overall study progress with mastery percentages per domain |
| `get_curriculum` | Browse all 5 domains and 30 task statements with current mastery levels |
| `get_section_details` | Deep dive into a specific task statement with concept lesson |
| `get_weak_areas` | Identify topics that need the most work, ranked by weakness |
| `get_study_plan` | Get personalized recommendations based on performance and exam weights |
| `start_practice_exam` | Take a full 60-question practice exam simulating the real certification |
| `submit_exam_answer` | Submit and grade answers during a practice exam |
| `get_exam_history` | View all past exam attempts with scores, trends, and per-domain comparison |
| `scaffold_project` | Access reference projects for hands-on practice with real code |
| `start_capstone_build` | Start a guided capstone build — shape your project and validate criteria coverage |
| `capstone_build_step` | Drive the capstone build: confirm, quiz, build, next, status, or abandon |
| `capstone_build_status` | Check capstone build progress — current step, coverage, quiz performance |
| `reset_progress` | Start over — requires explicit confirmation to prevent accidents |

The server also registers **8 interactive prompts** and **3 resource types** (concept handouts, reference projects, exam overview).

<br />

## Architecture

```
Claude (UI) <-> MCP Server (stdio) <-> Core Engine <-> SQLite
```

| Component | Technology | Purpose |
|-----------|-----------|---------|
| MCP Server | `@modelcontextprotocol/sdk` v1 | Registers tools, prompts, resources over stdio |
| Grading Engine | Pure TypeScript functions | Deterministic answer verification |
| Spaced Repetition | SM-2 algorithm | Optimal review scheduling |
| Follow-Up System | State-driven tool chain | Interactive post-answer detours |
| Capstone Build Engine | 18-step interleaved builder | Guided learn-build-explain flow with LLM validation |
| Question Bank | 390 bundled JSON questions | Scenario-based, verified against docs |
| Concept Handouts | 30 bundled markdown files | Structured study materials per task statement |
| Reference Projects | 6 bundled TypeScript projects | Runnable code demonstrating each domain |
| PDF Generator | `pdfkit` | Branded handout PDFs for offline study |
| Progress Store | `better-sqlite3` (WAL mode) | Persistent mastery, answers, schedules |

### Anti-Sycophancy Design

This server enforces honest grading at the protocol level — not just in prompts:

1. **Deterministic grading** — `gradeAnswer()` is a pure function. No LLM is involved in judging correctness.
2. **Tool-level enforcement** — The `submit_answer` tool description instructs Claude to relay results verbatim.
3. **No partial credit** — Multiple choice, one correct answer. No "you were on the right track."
4. **Wrong answer explanations** — Every incorrect option has a specific `whyWrongMap` entry explaining the misconception.
5. **System prompt rules** — Five anti-sycophancy directives prevent Claude from softening incorrect results.

<br />

## Question Bank Details

| Metric | Value |
|--------|-------|
| Total questions | 390 |
| Domains covered | 5 |
| Task statements covered | 30 |
| Questions per task statement | 13 |
| Difficulty distribution | ~4 easy, 5 medium, ~4 hard per task |
| Answer key balance | Distributed across A/B/C/D |
| Question format | Scenario-based multiple choice |
| Each question includes | Scenario, question, 4 options, explanation, why-wrong-map, references |
| Source material | Anthropic official documentation |

<br />

## Contributing

We welcome contributions! Here's how to get started:

```bash
# Clone the repo
git clone https://github.com/Connectry-io/connectrylab-architect-cert-mcp.git
cd connectrylab-architect-cert-mcp

# Install dependencies
npm install

# Build
npm run build

# Run tests (30 tests across 6 test files)
npm test

# Generate PDF handouts
npm run generate:pdfs

# Run locally
node dist/index.js
```

### Project Structure

```
src/
├── index.ts              # MCP server entry point
├── config.ts             # User config management
├── types.ts              # All TypeScript interfaces
├── data/
│   ├── loader.ts         # Lazy-cached data loading
│   ├── curriculum.json   # 30 task statements
│   ├── questions/        # 390 questions (5 domain files)
│   ├── handouts/         # 30 concept handouts (markdown)
│   ├── criteria.ts       # 30 task statement criteria for capstone validation
│   ├── build-steps.ts    # 18 capstone build step definitions
│   └── system-prompt.ts  # Anti-sycophancy rules
├── db/
│   ├── schema.ts         # SQLite schema (9 tables)
│   ├── store.ts          # Database initialization
│   ├── mastery.ts        # Mastery level calculations
│   ├── answers.ts        # Answer recording
│   ├── capstone.ts       # Capstone build CRUD operations
│   └── exam-attempts.ts  # Practice exam tracking
├── engine/
│   ├── grading.ts        # Deterministic grading
│   ├── spaced-repetition.ts  # SM-2 algorithm
│   ├── question-selector.ts  # Priority-based selection
│   ├── exam-builder.ts       # Practice exam generation
│   └── adaptive-path.ts      # Learning path recommendations
├── tools/                # 17 MCP tool handlers
├── prompts/              # 8 MCP prompt definitions
└── resources/            # 3 MCP resource types

projects/
├── capstone/             # All 5 domains — multi-agent support system
├── d1-agentic/           # Domain 1 — agentic loop research coordinator
├── d2-tools/             # Domain 2 — MCP server with tool patterns
├── d3-config/            # Domain 3 — Claude Code configuration layout
├── d4-prompts/           # Domain 4 — extraction & prompt engineering
└── d5-context/           # Domain 5 — context management & reliability

scripts/
└── generate-pdfs.ts      # PDF handout generator
```

<br />

## License

MIT © [Connectry Labs](https://connectry.io/labs)

<br />

## Credits

- [Anthropic](https://anthropic.com) — Claude & the Claude Certified Architect certification program
- [Model Context Protocol](https://modelcontextprotocol.io/) — The protocol that makes this possible
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Fast, synchronous SQLite for Node.js

<br />

---

<p align="center">
  <sub>Built with care by <a href="https://connectry.io/labs">Connectry Labs</a></sub>
</p>

<p align="center">
  <a href="https://github.com/Connectry-io/connectrylab-architect-cert-mcp">GitHub</a> •
  <a href="https://www.npmjs.com/package/connectry-architect-mcp">npm</a> •
  <a href="https://connectry.io/labs/architect-cert/">Architect Cert</a> •
  <a href="https://connectry.io/labs">Connectry Labs</a>
</p>
