<p align="center">
  <br />
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Connectry-io/connectrylab-architect-cert-mcp/master/.github/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Connectry-io/connectrylab-architect-cert-mcp/master/.github/assets/logo-light.svg">
    <img alt="Architect Cert" src="https://raw.githubusercontent.com/Connectry-io/connectrylab-architect-cert-mcp/master/.github/assets/logo-light.svg" width="420">
  </picture>
  <br />
</p>

<h3 align="center">
  Ace the Claude Certified Architect exam
</h3>

<p align="center">
  Adaptive certification prep powered by the Model Context Protocol.<br />
  390 questions. Guided capstone build. 30 concept handouts. 6 reference projects. Practice exams. Interactive dashboard. Spaced repetition. Zero sycophancy.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/connectry-architect-mcp"><img src="https://img.shields.io/npm/v/connectry-architect-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/connectry-architect-mcp"><img src="https://img.shields.io/npm/dm/connectry-architect-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="npm downloads"></a>
  <a href="https://github.com/Connectry-io/connectrylab-architect-cert-mcp"><img src="https://img.shields.io/github/stars/Connectry-io/connectrylab-architect-cert-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="GitHub stars"></a>
  <a href="https://github.com/Connectry-io/connectrylab-architect-cert-mcp/blob/master/LICENSE"><img src="https://img.shields.io/github/license/Connectry-io/connectrylab-architect-cert-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="License"></a>
  <a href="https://glama.ai/mcp/servers/Connectry-io/connectrylab-architect-cert-mcp"><img src="https://glama.ai/mcp/servers/Connectry-io/connectrylab-architect-cert-mcp/badges/score.svg" alt="Glama Score"></a>
</p>

<p align="center">
  <a href="https://glama.ai/mcp/servers/Connectry-io/connectrylab-architect-cert-mcp">
    <img src="https://glama.ai/mcp/servers/Connectry-io/connectrylab-architect-cert-mcp/badges/card.svg" alt="Connectry Architect Cert MCP server" />
  </a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-learning-path">Learning Path</a> •
  <a href="#-interactive-experience">Interactive Experience</a> •
  <a href="#-initial-assessment">Assessment</a> •
  <a href="#-concept-handouts">Handouts</a> •
  <a href="#-adaptive-practice">Practice</a> •
  <a href="#-guided-capstone-build">Capstone Build</a> •
  <a href="#-practice-exams">Practice Exams</a> •
  <a href="#-progress-dashboard">Dashboard</a> •
  <a href="#-reference-projects">Reference Projects</a> •
  <a href="#-tools">Tools</a> •
  <a href="#-architecture">Architecture</a>
</p>

---

## What is Architect Cert?

Architect Cert is a free, open-source [MCP](https://modelcontextprotocol.io/) server that turns Claude into your personal certification tutor for the **Claude Certified Architect — Foundations** exam. No courses, no slides, no video lectures — just ask Claude and study.

It ships with:
- **390 scenario-based questions** across all 5 exam domains and 30 task statements
- **Interactive clickable UI** — answer questions with A/B/C/D buttons, select follow-ups, pick domains with checkboxes — all inside Claude
- **Lessons-first assessment** — learn each domain's concepts before being tested on them
- **Guided capstone build** — shape your own project, then build it step-by-step while learning every task statement hands-on
- **30 concept handouts** — one per task statement, with code examples and common mistakes
- **6 reference projects** — runnable TypeScript codebases demonstrating each domain in practice
- **Practice exams** — 60-question weighted exams with history tracking and improvement trends
- **Progress dashboard** — glassmorphism visual dashboard with mastery levels, exam history chart, activity timeline
- **Visual progress tracking** — todo checklists track your progress through assessments, exams, and capstone builds in real time
- **Interactive follow-ups** — wrong answer? Click to see code examples, concept lessons, handouts, or reference projects
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
<summary><b>Claude Code</b> — One-liner</summary>

```bash
claude mcp add connectry-architect -- connectry-architect-mcp
```

That's it. Restart Claude Code and the server starts automatically.

</details>

<details>
<summary><b>Claude Code</b> — Manual config</summary>

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

Restart Claude Code. The server starts automatically when Claude loads.

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

> **Tip:** If you use `nvm`, you may need to specify the full path to the binary:
> ```json
> "command": "/Users/yourname/.nvm/versions/node/v22.20.0/bin/connectry-architect-mcp"
> ```

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

The server exposes 18 tools, 8 prompts, and 3 resource types.

</details>

### 3. Start Studying

Restart your MCP client and start chatting:

| What you want | What to ask Claude |
|---------------|-------------------|
| Start from scratch | *"Start an assessment to figure out where I stand"* |
| Practice questions | *"Give me a practice question"* |
| Focus on a domain | *"Give me a question about agentic architecture"* |
| Learn a concept first | *"Teach me about task 2.3 — tool provisioning"* |
| Build your own capstone | *"I want to start a guided capstone build"* |
| Take a practice exam | *"I want to take a practice exam"* |
| Check your progress | *"Show my study progress"* |
| Show the dashboard | *"Show my dashboard"* |
| Get a study plan | *"What should I study next?"* |
| Explore a reference project | *"Show me a reference project for domain 1"* |
| Generate PDF handouts | Run `npm run generate:pdfs` in the project directory |
| Reset and start over | *"Reset my progress"* |

<br />

## Learning Path

Architect Cert is designed to follow a natural progression. Here's the recommended order:

```
1. Assessment        → Baseline your knowledge across all 5 domains
       ↓
2. Learn concepts    → Read handouts for weak domains before practicing
       ↓
3. Adaptive practice → Questions prioritized by weakness, reviews, new material
       ↓
4. Follow-ups        → Dive into code examples, concept lessons, reference projects
       ↓
5. Capstone build    → Build your own project covering all 30 task statements
       ↓
6. Practice exams    → Simulate the real exam (60 questions, scored out of 1000)
       ↓
7. Review & repeat   → Dashboard tracks mastery, spaced repetition handles scheduling
```

You can jump to any stage at any time — the system adapts. But the path above gives you the most structured experience.

<br />

## Interactive Experience

Architect Cert uses Claude's built-in interactive UI to make studying feel natural. No typing answer letters — just click.

### Clickable Answer Selection

Every question presents **clickable A/B/C/D buttons** directly in Claude. You tap your answer instead of typing it. If the question includes code in the scenario, a **code preview** appears alongside each option so you can reference it while deciding.

### Follow-Up Actions

After every answer, clickable follow-up buttons appear:

**After a wrong answer:**
- Got it, next question
- Explain with a code example
- Show me the concept lesson
- Show me the handout
- Show me in the reference project

**After a correct answer:**
- Next question
- Explain why the others are wrong

### Multi-Select Domain Picker

When requesting a study plan, you can select multiple domains to focus on using **checkboxes** — no need to list them out by name.

### Visual Progress Checklists

Long flows like the assessment (15 questions), practice exams (60 questions), and capstone build (18 steps) create a **visual todo checklist** that updates in real time as you progress. You always know where you are and what's left.

### Skip & Other

Every question selection includes a **Skip** button to move on and an **Other** option to ask a free-form question. If you use "Other" to ask something, Claude answers your question and then **re-presents the same quiz question** — you never lose your place. "Skip" moves to the next question; skipped questions remain unanswered and will reappear later.

<br />

## Initial Assessment

Start with a **15-question diagnostic** (3 per domain) that determines your learning path. The assessment works differently from raw practice:

### Lessons-First Flow

When the assessment reaches a **new domain** for the first time, it pauses to show you the **concept handout** before asking questions. This means you learn the key ideas, see code examples, and understand common mistakes *before* being tested — no guessing blindly.

The flow for each domain:
1. Concept handout is shown (one-time per domain)
2. 3 questions presented one at a time (easy, medium, hard)
3. Each answer graded immediately with explanation
4. Move to the next domain

### Path Assignment

Based on your overall accuracy:

| Score | Path | Description |
|-------|------|-------------|
| **< 60%** | Beginner-Friendly | Starts with fundamentals, builds up gradually. Focuses on easy and medium questions first. |
| **>= 60%** | Exam-Weighted | Focuses on high-weight domains first (D1 at 27%, D3 & D4 at 20% each). Targets weak areas aggressively. |

### Progress Tracking

The assessment creates a **15-item visual checklist** (Q1 through Q15, grouped by domain) that updates after each answer. You always see exactly how far you've progressed.

<br />

## Concept Handouts

Every task statement has a **concept handout** — a structured study document (~500-800 words) that covers:

- **Concept** — The core idea, mental model, and when/why to use it
- **Code Example** — Realistic TypeScript demonstrating the pattern
- **Common Mistakes** — The 3-5 most frequent errors (which map to exam wrong answers)
- **References** — Links to Anthropic's official documentation

### Reading Handouts in Claude

```
You: "Show me the handout for task 2.3"

Claude: [loads the full handout with concept, code, mistakes, references]
```

### When Handouts Appear Automatically

- **During assessment** — shown before the first question of each new domain
- **After a wrong answer** — "Show me the handout" is one of the follow-up options
- **During capstone build** — relevant handouts are available at each build step

### Generating PDF Handouts

Generate branded PDFs for all 30 handouts for offline study:

```bash
cd connectrylab-architect-cert-mcp
npm run generate:pdfs
```

This creates 30 PDFs in `generated/handouts/` with:
- Architect Cert logo and domain label in the header
- Clean formatting with syntax-highlighted code blocks
- "Connectry LABS — Claude Certified Architect Exam Prep — Free & Open Source" footer

<br />

## Adaptive Practice

Every practice question is selected by a **three-priority algorithm**:

1. **Overdue reviews** — Spaced repetition items due for review today
2. **Weak areas** — Topics where your mastery is below 50%
3. **New material** — Fresh questions from your recommended domain

### Filtering

You can filter practice questions by domain and/or difficulty:

```
You: "Give me a hard question about prompt engineering"

Claude: [presents a hard Domain 4 question with clickable A/B/C/D buttons]
```

### Interactive Follow-Ups

After every answer, you get clickable follow-up options. Each option dives deeper into the concept — then brings you right back to your quiz. You never leave your study flow to look something up.

### Mastery Levels

Each of the 30 task statements has an independent mastery level:

| Level | Criteria | What it means |
|-------|----------|---------------|
| **Unassessed** | No attempts yet | You haven't seen questions on this topic |
| **Weak** | < 50% accuracy | Needs significant study — questions resurface frequently |
| **Developing** | 50-69% accuracy | Making progress — keep practicing |
| **Strong** | 70-89% accuracy | Good understanding — review intervals are longer |
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

### How It Works

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

1. **Quiz** — 2-3 questions on the task statements you're about to build (clickable A/B/C/D)
2. **Build** — Claude generates the file's code, themed to your project
3. **Walkthrough** — Line-by-line explanation mapping code to task statements

A **visual 18-step checklist** tracks your progress in real time.

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

### Capstone Build Tools

| Tool | What it does |
|------|-------------|
| `start_capstone_build` | See the 30 criteria, describe your theme, refine until coverage is complete |
| `capstone_build_step` | Drive the build: confirm, quiz, build, next, status, or abandon |
| `capstone_build_status` | Check your progress — current step, criteria coverage, quiz performance |

### How It Connects to Everything Else

- Quiz answers during the build use the same `submit_answer` grading and SM-2 scheduling
- After any quiz question, you can use the same follow-up options (code example, concept lesson, handout, reference project)
- The reference projects show how the capstone structure looks when complete
- Progress persists across sessions — pick up where you left off

<br />

## Practice Exams

Full 60-question exams that simulate the real certification:

| Detail | Value |
|--------|-------|
| Total questions | 60 |
| D1: Agentic Architecture | 16 questions (27%) |
| D2: Tool Design & MCP | 11 questions (18%) |
| D3: Claude Code Config | 12 questions (20%) |
| D4: Prompt Engineering | 12 questions (20%) |
| D5: Context & Reliability | 9 questions (15%) |
| Scoring | 0-1000, passing at 720 |
| Question selection | Fresh set each time — avoids repeating your most recent attempt |
| UI | Clickable A/B/C/D buttons with code previews |
| Progress | Visual 60-item checklist updated after each answer |

All attempts are saved with per-domain score breakdowns and improvement trends.

<br />

## Progress Dashboard

Architect Cert includes a **glassmorphism visual dashboard** that renders directly inside Claude via Claude Preview.

### What It Shows

- **Readiness Ring** — Overall exam readiness percentage in a circular progress indicator
- **Domain Mastery Grid** — 5 cards with progress bars for each exam domain
- **Exam History Chart** — Line chart plotting your practice exam scores over time, with the 720 passing score marked
- **Recent Activity Timeline** — Your last 10 answers with correct/incorrect indicators
- **Capstone Progress** — Current build step and completion percentage
- **Quick Action Buttons** — Jump to practice, exam, study plan, or capstone

### How to Open

```
You: "Show my dashboard"

Claude: [opens the branded dashboard in Claude Preview]
```

The dashboard can be reopened at any time by asking Claude again. It always reflects your latest data.

### Text Fallback

For MCP clients that don't support Claude Preview, the dashboard tool also returns a **text summary** with mastery percentages and exam stats.

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

### How to Access

```
You: "Show me a reference project for domain 1"

Claude: [returns the project README, file listing, and architecture walkthrough]
```

### How They Connect to the Study Flow

When you get a question wrong, one of the follow-up options is **"Show me in the reference project"** — this takes you straight to the relevant domain project so you can see the concept implemented in real code. Then you jump back to your quiz.

<br />

## Study Plan

Get personalized study recommendations based on your performance, exam weights, and spaced repetition schedule.

### Multi-Select Domain Focus

When requesting a study plan, you can pick specific domains to focus on using **checkboxes**:

```
You: "What should I study next?"

Claude: [shows domain checkboxes — select the ones you want to focus on]
        [generates a personalized study plan with a visual checklist]
```

The study plan creates a **visual checklist** so you can track your progress through each recommendation.

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

Architect Cert provides **18 MCP tools** that Claude uses to deliver the study experience:

### Study Flow

| Tool | Description |
|------|-------------|
| `start_assessment` | Begin with 15 diagnostic questions (lessons-first, one at a time) to determine your learning path |
| `get_practice_question` | Get the next adaptive question with clickable A/B/C/D buttons (reviews > weak areas > new material) |
| `submit_answer` | Grade your answer deterministically — presents interactive follow-up options |
| `follow_up` | Handle post-answer actions: code examples, concept lessons, handouts, reference projects |
| `get_section_details` | Deep dive into a specific task statement with full concept handout |

### Progress & Planning

| Tool | Description |
|------|-------------|
| `get_progress` | View overall study progress with mastery percentages per domain |
| `get_curriculum` | Browse all 5 domains and 30 task statements with current mastery levels |
| `get_weak_areas` | Identify topics that need the most work, ranked by weakness |
| `get_study_plan` | Get personalized recommendations with multi-select domain focus |
| `get_dashboard` | Open the visual progress dashboard in Claude Preview |

### Practice Exams

| Tool | Description |
|------|-------------|
| `start_practice_exam` | Take a full 60-question practice exam simulating the real certification |
| `submit_exam_answer` | Submit and grade answers during a practice exam |
| `get_exam_history` | View all past exam attempts with scores, trends, and per-domain comparison |

### Capstone Build

| Tool | Description |
|------|-------------|
| `start_capstone_build` | Start a guided capstone build — shape your project and validate criteria coverage |
| `capstone_build_step` | Drive the capstone build: confirm, quiz, build, next, status, or abandon |
| `capstone_build_status` | Check capstone build progress — current step, coverage, quiz performance |

### Reference & Admin

| Tool | Description |
|------|-------------|
| `scaffold_project` | Access reference projects for hands-on practice with real code |
| `reset_progress` | Start over — requires explicit confirmation to prevent accidents |

The server also registers **8 interactive prompts** and **3 resource types** (concept handouts, reference projects, exam overview).

<br />

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           YOUR MACHINE                               │
│                                                                      │
│   ┌──────────────┐       ┌────────────────────────────────┐          │
│   │ Claude Desktop│       │     Architect Cert MCP          │          │
│   │ Claude Code   │◄─────►│                                │          │
│   │ Any MCP client│ stdio │  18 tools                      │          │
│   └──────┬───────┘       │   8 prompts                     │          │
│          │                │   3 resource types              │          │
│          │                └──────────┬─────────────────────┘          │
│          │                           │                                │
│          │         ┌────────────────┼────────────────────┐           │
│          │         │                │                     │           │
│          │   ~/.connectry-      390 questions         6 reference     │
│          │    architect/       30 handouts            projects        │
│          │    progress.db     (bundled JSON/MD)      (bundled TS)     │
│          │                                                            │
│          │  ┌──────────────────────────┐                              │
│          └──► Claude Preview (Dashboard) │                              │
│             │ localhost HTTP server      │                              │
│             └──────────────────────────┘                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| MCP Server | `@modelcontextprotocol/sdk` v1 | Registers tools, prompts, resources over stdio |
| Grading Engine | Pure TypeScript functions | Deterministic answer verification |
| Spaced Repetition | SM-2 algorithm | Optimal review scheduling |
| Question Selector | Three-priority algorithm | Overdue reviews > weak areas > new material |
| Follow-Up System | State-driven tool chain | Interactive post-answer detours |
| Capstone Build Engine | 18-step interleaved builder | Guided learn-build-explain flow with LLM validation |
| Dashboard Server | Node.js HTTP + HTML | Glassmorphism visual dashboard via Claude Preview |
| Question Bank | 390 bundled JSON questions | Scenario-based, verified against docs |
| Concept Handouts | 30 bundled markdown files | Structured study materials per task statement |
| Reference Projects | 6 bundled TypeScript projects | Runnable code demonstrating each domain |
| PDF Generator | Puppeteer + Marked | Branded handout PDFs for offline study |
| Progress Store | `better-sqlite3` (WAL mode) | Persistent mastery, answers, schedules |

### Interactive UI Architecture

Architect Cert doesn't build its own chat UI. Instead, it instructs Claude to use **built-in interactive tools**:

- **AskUserQuestion** — Presents clickable buttons for A/B/C/D answers, follow-up actions, and domain selection. Supports single-select (radio buttons), multi-select (checkboxes), and free-text input via "Other".
- **TodoWrite** — Creates visual progress checklists that update in real time during assessments, exams, and capstone builds.
- **Claude Preview** — Renders the glassmorphism dashboard HTML on a local HTTP server.

This approach works across Claude Code and Claude Desktop without requiring any custom UI code on the client side.

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

## Data Storage

- Progress is stored locally at `~/.connectry-architect/progress.db` (SQLite, WAL mode)
- Your user config lives at `~/.connectry-architect/config.json` (auto-created on first run)
- No cloud, no accounts, no telemetry — everything stays on your machine

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

# Run tests
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
│   ├── review-schedule.ts # SM-2 review scheduling
│   ├── capstone.ts       # Capstone build CRUD operations
│   ├── users.ts          # User management
│   └── exam-attempts.ts  # Practice exam tracking
├── engine/
│   ├── grading.ts        # Deterministic grading
│   ├── spaced-repetition.ts  # SM-2 algorithm
│   ├── question-selector.ts  # Priority-based selection
│   ├── exam-builder.ts       # Practice exam generation
│   └── adaptive-path.ts      # Learning path recommendations
├── tools/                # 18 MCP tool handlers
│   ├── index.ts          # Tool registration
│   ├── elicit.ts         # MCP elicitation helper (graceful fallback)
│   ├── start-assessment.ts
│   ├── submit-answer.ts
│   ├── get-practice-question.ts
│   ├── follow-up.ts
│   ├── get-progress.ts
│   ├── get-curriculum.ts
│   ├── get-section-details.ts
│   ├── get-weak-areas.ts
│   ├── get-study-plan.ts
│   ├── start-practice-exam.ts
│   ├── submit-exam-answer.ts
│   ├── get-exam-history.ts
│   ├── scaffold-project.ts
│   ├── start-capstone-build.ts
│   ├── capstone-build-step.ts
│   ├── capstone-build-status.ts
│   ├── reset-progress.ts
│   └── dashboard.ts
├── ui/
│   ├── server.ts         # Dashboard HTTP server
│   ├── dashboard.html    # Glassmorphism dashboard UI
│   ├── meta.ts           # Quiz widget metadata
│   └── loader.ts         # HTML asset loader
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
