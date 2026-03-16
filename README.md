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
  390 scenario-based questions. 5 domains. 30 task statements. Spaced repetition. Zero sycophancy.
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
  <a href="#-examples">Examples</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-exam-domains">Exam Domains</a> •
  <a href="#-tools">Tools</a> •
  <a href="#-study-modes">Study Modes</a> •
  <a href="#-architecture">Architecture</a>
</p>

---

## 💬 What is Architect Cert?

Architect Cert is a free, open-source [MCP](https://modelcontextprotocol.io/) server that turns Claude into your personal certification tutor for the **Claude Certified Architect — Foundations** exam. No courses, no slides, no video lectures — just ask Claude and study.

It ships with **390 scenario-based multiple-choice questions** covering all **5 exam domains** and **30 task statements**, graded deterministically against Anthropic's official documentation. Your progress persists across sessions with SM-2 spaced repetition scheduling.

<br />

## ✨ Features

<table>
<tr>
<td width="50%">

### 🧠 Adaptive Learning
SM-2 spaced repetition algorithm resurfaces weak areas at optimal intervals. Questions you get wrong come back sooner — questions you master fade away.

### 📝 390 Exam Questions
13 scenario-based questions per task statement across all 30 task statements. Easy, medium, and hard difficulties with balanced answer distributions across A/B/C/D.

### ✅ Deterministic Grading
Pure function grading — no LLM judgment calls. Your answer is checked against a verified key. Right is right, wrong is wrong. Every wrong answer includes a specific explanation of why it's wrong.

</td>
<td width="50%">

### 🚫 Zero Sycophancy
Claude won't sugarcoat wrong answers. Anti-sycophancy rules are enforced at the protocol level, not just in prompts. Wrong means wrong — no "you were on the right track."

### 📊 Progress Tracking
Persistent SQLite database tracks every answer, mastery level, and review schedule. Pick up exactly where you left off across sessions, devices, and MCP clients.

### 🎯 Smart Question Selection
Three-priority selection: overdue reviews first, then weak areas, then new material. You always work on what matters most for exam readiness.

</td>
</tr>
<tr>
<td width="50%">

### 📖 Learn Before You're Tested
Each of the 30 task statements has a **concept lesson** (handout) you can read before tackling questions. Ask Claude to teach you about any topic — it delivers a structured lesson with key concepts, mental models, and examples from Anthropic's docs. The server tracks which lessons you've viewed.

### 🗺 Full Curriculum Browser
Browse the entire exam curriculum with your current mastery level per task statement. See which topics are unassessed, weak, developing, strong, or mastered — all at a glance. Drill into any task for its concept lesson and question history.

</td>
<td width="50%">

### 📋 Personalized Study Plans
Get a recommended study order based on your assessment results and learning path. The plan tells you which domain to focus on next, how many reviews are overdue, and estimates your time to exam readiness.

### 🎯 Practice Exams with History
Take full 60-question practice exams weighted by domain — just like the real certification. Each exam uses a fresh set of questions (no repetition from your last attempt). Scored out of 1000 with pass/fail at 720. All attempts are saved with per-domain breakdowns so you can track improvement over time.

### 🔄 Pick Up Where You Left Off
Everything persists in a local SQLite database. Close Claude, come back tomorrow, switch from Claude Desktop to Claude Code — your mastery levels, answer history, review schedule, exam history, and handout progress are all waiting for you.

</td>
</tr>
</table>

<br />

## 🚀 Quick Start

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

The server exposes 10 tools, 8 prompts, and 3 resource types.

</details>

### 3. Start Studying

Restart your MCP client and start chatting. Here's what to say:

| What you want | What to ask Claude |
|---------------|-------------------|
| Find your weak areas | *"Start an assessment to figure out where I stand"* |
| Practice questions | *"Give me a practice question"* |
| Focus on a domain | *"Give me a question about agentic architecture"* |
| Check your progress | *"Show my study progress"* |
| Get a study plan | *"What should I study next?"* |
| Deep dive on a topic | *"Teach me about task 2.3 — tool provisioning"* |
| Reset and start over | *"Reset my progress"* |

<br />

## 📋 What Can You Do?

Everything happens through natural conversation with Claude. Here's every capability:

### 🎓 Learning & Studying

| Action | How to ask | What happens |
|--------|-----------|--------------|
| **Read a concept lesson** | *"Teach me about task 1.5 — tool-use hooks"* | Claude calls `get_section_details` which loads the concept handout for that task statement. You get a structured lesson with key concepts, mental models, and examples — all before any questions. The server tracks that you've viewed it. |
| **Browse the curriculum** | *"Show me the full curriculum"* | Claude calls `get_curriculum` and displays all 5 domains, 30 task statements, and your current mastery level for each (unassessed/weak/developing/strong/mastered). |
| **Get a study plan** | *"What should I study next?"* | Claude calls `get_study_plan` which analyzes your mastery, learning path, and overdue reviews to recommend a domain order and estimate time remaining. |
| **Read a concept handout** | *"Show me the handout for task 2.3"* | Claude reads the `handout://2.3` MCP resource — a markdown document explaining the core concepts for that task statement. |
| **View exam info** | *"Tell me about the exam format"* | Claude reads the `exam-info://overview` resource with exam format, domain weights, passing score, and scenario descriptions. |

### 📝 Assessment & Practice

| Action | How to ask | What happens |
|--------|-----------|--------------|
| **Take the initial assessment** | *"Start an assessment"* | `start_assessment` delivers 15 questions (3 per domain: 1 easy, 1 medium, 1 hard). Based on your score, you're placed on a beginner-friendly (<60%) or exam-weighted (≥60%) learning path. |
| **Get a practice question** | *"Give me a question"* | `get_practice_question` uses the three-priority algorithm: overdue reviews → weak areas → new material. You always get the most impactful question. |
| **Focus on a specific domain** | *"Quiz me on domain 3"* | You can ask for questions filtered to a specific domain or task statement. |
| **Answer a question** | *"B"* or *"I think it's C"* | `submit_answer` grades your response with a pure function — no LLM judgment. You get: correct/incorrect, explanation, why each wrong option is wrong, references, updated mastery, and next review date. |

### 📊 Progress & Tracking

| Action | How to ask | What happens |
|--------|-----------|--------------|
| **Check overall progress** | *"Show my progress"* | `get_progress` returns: total questions answered, overall accuracy %, reviews due, and per-domain breakdown with accuracy and mastered task count. |
| **Find weak areas** | *"What are my weak areas?"* | `get_weak_areas` lists every task statement below 70% accuracy, ranked from weakest to strongest, with attempt counts and mastery levels. |
| **Deep dive on a task** | *"Show me details for task 1.2"* | `get_section_details` returns: mastery level, accuracy %, total attempts, whether you've read the concept lesson, and the full concept handout text. |
| **View the curriculum map** | *"Show the curriculum with my mastery"* | `get_curriculum` displays all 30 task statements with their mastery level badge: `[UNASSESSED]`, `[WEAK]`, `[DEVELOPING]`, `[STRONG]`, or `[MASTERED]`. |

### 🎯 Practice Exams

| Action | How to ask | What happens |
|--------|-----------|--------------|
| **Take a practice exam** | *"Start a practice exam"* | `start_practice_exam` generates a fresh 60-question exam weighted by domain (D1: 16, D2: 11, D3: 12, D4: 12, D5: 9). Each exam avoids repeating questions from your most recent attempt. Scored out of 1000 — passing is 720. |
| **Answer an exam question** | *"B"* | `submit_exam_answer` grades your answer, shows feedback, and serves the next question. After question 60, the exam is auto-scored with per-domain breakdown. |
| **View exam history** | *"Show my exam history"* | `get_exam_history` displays all completed exams with scores, pass/fail status, per-domain breakdowns, and improvement trends across attempts. |

### 🔧 Management

| Action | How to ask | What happens |
|--------|-----------|--------------|
| **Reset all progress** | *"Reset my progress"* | `reset_progress` wipes all answers, mastery, review schedule, handout views, and exam history. Requires explicit confirmation — no accidental resets. |
| **Access reference projects** | *"Show me a reference project for domain 2"* | `scaffold_project` provides hands-on coding exercises for each domain. |

<br />

## 💡 Examples

### Starting an Assessment

```
You: "I want to prepare for the Claude Architect certification.
      Let's start with an assessment."

Claude: Starting your diagnostic assessment! I'll ask you 15
        questions across all 5 exam domains to determine your
        current knowledge level and create a personalized study plan.

        📝 Question 1 of 15 — Domain 1: Agentic Architecture
        Difficulty: Medium

        Scenario: A SaaS company is building an AI agent that
        processes customer support tickets. The agent needs to
        read the ticket, classify urgency, draft a response, and
        optionally escalate to a human.

        What is the primary signal the orchestrator should check
        after each API call to decide whether to continue the
        agentic loop?

        A) The HTTP status code of the API response
        B) The stop_reason field in the API response
        C) The length of the assistant's message
        D) A custom "done" flag in the system prompt
```

### Practice Session with Progress

```
You: "Show me my progress"

Claude: 📊 Your Study Dashboard

        Overall Progress: 42% mastered (164/390 questions attempted)

        ┌─────────────────────────────────────────────────┐
        │ Domain                              │ Mastery   │
        ├─────────────────────────────────────────────────┤
        │ 1. Agentic Architecture (27%)       │ ████░░ 68%│
        │ 2. Tool Design & MCP (18%)          │ █████░ 82%│
        │ 3. Claude Code Config (20%)         │ ███░░░ 51%│
        │ 4. Prompt Engineering (20%)         │ ██░░░░ 35%│
        │ 5. Context & Reliability (15%)      │ █░░░░░ 22%│
        └─────────────────────────────────────────────────┘

        📌 Recommended: Domain 4 — Prompt Engineering
        3 questions due for review, 2 weak areas detected

        Estimated time to exam readiness: ~12 hours
```

### Answering a Question

```
You: "Give me a practice question"

Claude: 📝 Question — Domain 1: Agentic Architecture
        Difficulty: Medium | Task 1.2: Multi-agent orchestration

        Scenario: A fintech company builds a document processing
        pipeline with three subagents: OCR extraction, data
        validation, and compliance checking. The coordinator needs
        to handle partial failures gracefully.

        If the validation subagent returns an error for 2 of 10
        documents, what should the coordinator do?

        A) Abort the entire batch and retry all 10 documents
        B) Continue processing the 8 successful documents and
           queue the 2 failures for isolated retry
        C) Pass the raw errors to the compliance subagent
        D) Restart the validation subagent with increased timeout

You: "B"

Claude: ✅ Correct!

        The coordinator should continue with successful results
        and isolate failures for retry. This follows the partial
        failure handling pattern from Anthropic's multi-agent
        orchestration guide.

        Why the others are wrong:
        • A — Aborting wastes the 8 successful results
        • C — Raw errors lack structure for downstream processing
        • D — Timeout isn't the issue; the documents themselves
              failed validation

        📚 Reference: docs.anthropic.com/en/docs/agents

        Your mastery: Task 1.2 → 72% (strong)
        Next review scheduled: March 19
```

### Getting a Wrong Answer

```
You: "D"

Claude: ❌ Incorrect. The correct answer is B.

        Restarting the validation subagent with increased timeout
        does not address the root cause — the documents themselves
        failed validation, not the subagent process. Increasing
        timeout would only help with transient network or
        processing-time issues.

        The correct approach: Continue processing the 8 successful
        documents and queue the 2 failures for isolated retry.
        This preserves partial progress and follows Anthropic's
        recommended partial failure handling pattern.

        Why A and C are also wrong:
        • A — Aborting wastes the 8 successful results
        • C — Raw errors lack structure for downstream consumption

        📚 Reference: docs.anthropic.com/en/docs/agents

        Your mastery: Task 1.2 → 45% (weak) ⬇
        This question will appear again in 1 day.
```

### Learning a Topic (Concept Lesson)

```
You: "Teach me about task 1.5 — tool-use hooks"

Claude: ═══ 1.5: Build tool-use hooks for pre/post-processing
        and audit logging ═══

        Domain: Agentic Architecture & Orchestration
        Description: Hook into tool execution lifecycle for
        validation, transformation, and logging.

        Mastery: unassessed
        Accuracy: 0%
        Attempts: 0
        Handout Viewed: No

        --- Concept Lesson ---

        # Tool-Use Hooks

        Mental Model: "The model drives decisions, code enforces
        guardrails"

        ## What Are Hooks?
        Tool-use hooks are callback functions that run before
        (PreToolUse) or after (PostToolUse) a tool is executed
        in an agentic loop. They provide deterministic control
        points in an otherwise probabilistic system.

        ## PreToolUse Hooks
        - Run BEFORE the tool executes
        - Can validate parameters, enforce permissions, or abort
        - Return `{ abort: true, message: "..." }` to block
        - Example: Prevent file writes outside a sandbox directory

        ## PostToolUse Hooks
        - Run AFTER the tool returns its result
        - Can transform output, redact PII, or log for audit
        - Example: Strip email addresses from API responses

        ## When to Use Hooks vs. System Prompts
        - Hooks: deterministic rules (path restrictions, schema
          validation, PII redaction)
        - System prompts: soft heuristics (tone, style, judgment)

        📚 References:
        • docs.anthropic.com/en/docs/agents#hooks

        Ready to test your understanding? I have 13 questions
        on this topic ranging from easy to hard.
```

### Checking Your Progress

```
You: "Show me my progress"

Claude: ═══ CERTIFICATION STUDY PROGRESS ═══

        Questions Answered: 164
        Overall Accuracy: 71%
        Reviews Due: 3

        Domain Progress:
          D1: Agentic Architecture & Orchestration — 68% accuracy,
              4/7 mastered
          D2: Tool Design & MCP Integration — 82% accuracy,
              3/5 mastered
          D3: Claude Code Configuration & Workflows — 51% accuracy,
              1/6 mastered
          D4: Prompt Engineering & Structured Output — 35% accuracy,
              0/6 mastered
          D5: Context Management & Reliability — 22% accuracy,
              0/6 mastered
```

### Getting a Study Plan

```
You: "What should I study next?"

Claude: ═══ YOUR STUDY PLAN ═══

        Learning Path: exam-weighted
        Estimated Time Remaining: ~14 hours

        Next Recommended Domain: D4 — Prompt Engineering &
        Structured Output

        Domain Study Order:
          1. D1: Agentic Architecture & Orchestration
          2. D3: Claude Code Configuration & Workflows
          3. D4: Prompt Engineering & Structured Output
          4. D2: Tool Design & MCP Integration
          5. D5: Context Management & Reliability

        Reviews Due: 3
        Start with your overdue reviews before new material.
```

### Viewing the Curriculum Map

```
You: "Show me the full curriculum"

Claude: ═══ CERTIFICATION CURRICULUM ═══

        ## Domain 1: Agentic Architecture & Orchestration (27%)

          1.1 [MASTERED] Design and implement agentic loops (94%)
          1.2 [STRONG] Orchestrate multi-agent systems (78%)
          1.3 [MASTERED] Manage subagent context isolation (92%)
          1.4 [DEVELOPING] Implement deterministic guardrails (55%)
          1.5 [MASTERED] Build tool-use hooks (96%)
          1.6 [WEAK] Apply task decomposition patterns (44%)
          1.7 [MASTERED] Manage conversation lifecycle (90%)

        ## Domain 2: Tool Design & MCP Integration (18%)

          2.1 [STRONG] Design effective tool schemas (85%)
          2.2 [DEVELOPING] Structured error handling (62%)
          2.3 [UNASSESSED] Configure tool_choice (—)
          ...
```

### Finding Weak Areas

```
You: "What are my weak areas?"

Claude: ═══ WEAK AREAS ═══

          1.6: Apply task decomposition patterns
            Accuracy: 44% (4/9)
            Mastery: weak

          4.3: Configure structured output via tool_use
            Accuracy: 32% (2/6)
            Mastery: weak

          5.1: Manage context window limits
            Accuracy: 38% (3/8)
            Mastery: weak

        These 3 tasks are below 70%. Want me to start drilling
        your weakest one?
```

### Taking a Practice Exam

```
You: "I want to take a practice exam"

Claude: ═══ PRACTICE EXAM STARTED ═══

        Simulating the Claude Certified Architect — Foundations exam.

        Exam ID: 1
        Total Questions: 60
        Passing Score: 720/1000

        Question Distribution:
          D1: Agentic Architecture & Orchestration — 16 questions (27%)
          D2: Tool Design & MCP Integration — 11 questions (18%)
          D3: Claude Code Configuration & Workflows — 12 questions (20%)
          D4: Prompt Engineering & Structured Output — 12 questions (20%)
          D5: Context Management & Reliability — 9 questions (15%)

        ─── Question 1 of 60 ───

        Domain: D1
        Task: 1.3
        Difficulty: medium

        Scenario: A legal tech startup runs parallel subagents
        for contract analysis. Each subagent handles a different
        clause type but should not access other subagents' tools.

        How should the coordinator restrict each subagent's
        tool access?

        A) Use a shared tool registry with role-based filtering
        B) Pass an allowed_tools parameter scoping each subagent
           to only its relevant tools
        C) Let each subagent discover tools dynamically at runtime
        D) Use system prompt instructions to tell each subagent
           which tools to ignore
```

### Viewing Exam History

```
You: "Show me my exam history"

Claude: ═══ EXAM HISTORY ═══

        Total Attempts: 3
        Best Score: 812/1000
        Latest Score: 812/1000

        ─── Attempt #3 (latest) ───
          Date: 2026-03-16
          Score: 812/1000 ✅ PASSED
          Correct: 49/60 (82%)

          Domain Scores:
            D1: Agentic Architecture — 14/16 (88%)
            D2: Tool Design & MCP — 9/11 (82%)
            D3: Claude Code Config — 10/12 (83%)
            D4: Prompt Engineering — 9/12 (75%)
            D5: Context & Reliability — 7/9 (78%)

          Change from previous: ↑ +78 points

        ─── Attempt #2 ───
          Date: 2026-03-14
          Score: 734/1000 ✅ PASSED
          Correct: 44/60 (73%)
          ...

        ─── Overall Trend ───
          First attempt: 653/1000
          Latest attempt: 812/1000
          Total improvement: +159 points
```

<br />

## 🔄 How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                      YOUR MACHINE                             │
│                                                                │
│   ┌──────────────┐       ┌──────────────────────┐             │
│   │ Claude Desktop│       │  Architect Cert MCP  │             │
│   │ Claude Code   │◄─────►│                      │             │
│   │ Any MCP client│ stdio │  10 tools            │             │
│   └──────────────┘       │   8 prompts           │             │
│                           │   3 resource types    │             │
│                           └──────────┬───────────┘             │
│                                      │                         │
│                           ┌──────────┴───────────┐             │
│                           │                       │             │
│                   ~/.connectry-architect/   390 questions       │
│                      progress.db          (bundled JSON)       │
│                      config.json                               │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

**The study loop:**

1. **Assessment** — 15 diagnostic questions baseline your knowledge across all 5 domains
2. **Path assignment** — Places you on a beginner-friendly or exam-weighted track based on your score
3. **Smart selection** — Each question is chosen by priority: overdue reviews → weak areas → new material
4. **Deterministic grading** — Pure function checks your answer against the verified key — no LLM judgment
5. **Spaced repetition** — SM-2 algorithm schedules optimal review intervals (1 day → 3 days → 6 days → ...)
6. **Mastery tracking** — Progress through weak → developing → strong → mastered per task statement
7. **Adaptive recommendations** — Study plan adjusts as you improve, always targeting exam readiness

**Data storage:**

- Progress is stored locally at `~/.connectry-architect/progress.db` (SQLite, WAL mode)
- Your user config lives at `~/.connectry-architect/config.json` (auto-created on first run)
- No cloud, no accounts, no telemetry — everything stays on your machine

<br />

## 📚 Exam Domains

The Claude Certified Architect — Foundations exam covers 5 domains weighted by importance:

| # | Domain | Weight | Task Statements | Questions |
|---|--------|--------|-----------------|-----------|
| 1 | Agentic Architecture & Orchestration | 27% | 7 | 91 |
| 2 | Tool Design & MCP Integration | 18% | 5 | 65 |
| 3 | Claude Code Configuration & Workflows | 20% | 6 | 78 |
| 4 | Prompt Engineering & Structured Output | 20% | 6 | 78 |
| 5 | Context Management & Reliability | 15% | 6 | 78 |
| | **Total** | **100%** | **30** | **390** |

Each domain contains 5–7 task statements with **13 questions each** (4 easy, 5 medium, 4 hard). Questions are scenario-based, with verified correct answers sourced from Anthropic's official documentation.

### 30 Task Statements

<details>
<summary><b>Domain 1 — Agentic Architecture & Orchestration</b> (7 tasks, 91 questions)</summary>

| Task | Description |
|------|-------------|
| 1.1 | Design and implement agentic loops for autonomous task execution |
| 1.2 | Orchestrate multi-agent systems with coordinator-subagent patterns |
| 1.3 | Manage subagent context isolation and tool scoping |
| 1.4 | Implement deterministic guardrails and structured handoff protocols |
| 1.5 | Build tool-use hooks for pre/post-processing and audit logging |
| 1.6 | Apply task decomposition patterns (prompt chaining, parallel, dynamic) |
| 1.7 | Manage conversation lifecycle with sessions, compaction, and forking |

</details>

<details>
<summary><b>Domain 2 — Tool Design & MCP Integration</b> (5 tasks, 65 questions)</summary>

| Task | Description |
|------|-------------|
| 2.1 | Design effective tool schemas with clear descriptions and parameters |
| 2.2 | Implement structured error handling for tool responses |
| 2.3 | Configure tool_choice and manage tool provisioning per agent |
| 2.4 | Integrate MCP servers into Claude Code and agent workflows |
| 2.5 | Apply Claude Code's built-in tools for codebase navigation |

</details>

<details>
<summary><b>Domain 3 — Claude Code Configuration & Workflows</b> (6 tasks, 78 questions)</summary>

| Task | Description |
|------|-------------|
| 3.1 | Configure CLAUDE.md files and modular rule systems |
| 3.2 | Create and configure custom slash commands |
| 3.3 | Apply path-specific rules for conditional convention loading |
| 3.4 | Use plan mode and explore subagent for complex workflows |
| 3.5 | Apply iterative development practices with feedback loops |
| 3.6 | Automate CI/CD pipelines with headless Claude Code |

</details>

<details>
<summary><b>Domain 4 — Prompt Engineering & Structured Output</b> (6 tasks, 78 questions)</summary>

| Task | Description |
|------|-------------|
| 4.1 | Design evaluation rubrics with quantitative criteria |
| 4.2 | Apply few-shot examples for output consistency |
| 4.3 | Configure structured output via tool_use and JSON schemas |
| 4.4 | Implement error recovery and escalation strategies |
| 4.5 | Optimize throughput with the Batches API |
| 4.6 | Apply multi-instance review for quality verification |

</details>

<details>
<summary><b>Domain 5 — Context Management & Reliability</b> (6 tasks, 78 questions)</summary>

| Task | Description |
|------|-------------|
| 5.1 | Manage context window limits and attention degradation |
| 5.2 | Build escalation and clarification triggers |
| 5.3 | Handle errors and partial failures across agent boundaries |
| 5.4 | Apply context management strategies for long-running sessions |
| 5.5 | Design human-in-the-loop confidence-based review systems |
| 5.6 | Maintain output integrity with provenance tracking |

</details>

<br />

## 🛠 Tools

Architect Cert provides **13 MCP tools** that Claude uses to deliver the study experience:

| Tool | Description |
|------|-------------|
| `start_assessment` | Begin with 15 diagnostic questions to determine your learning path |
| `get_practice_question` | Get the next adaptive question (reviews → weak areas → new material) |
| `submit_answer` | Grade your answer — deterministic, no LLM judgment, final verdict |
| `get_progress` | View overall study progress with mastery percentages per domain |
| `get_curriculum` | Browse all 5 domains and 30 task statements with current mastery levels |
| `get_section_details` | Deep dive into a specific task statement with concept lesson |
| `get_weak_areas` | Identify topics that need the most work, ranked by weakness |
| `get_study_plan` | Get personalized recommendations based on your performance and exam weights |
| `start_practice_exam` | Take a full 60-question practice exam simulating the real certification exam |
| `submit_exam_answer` | Submit and grade answers during a practice exam |
| `get_exam_history` | View all past exam attempts with scores, trends, and per-domain comparison |
| `scaffold_project` | Access reference projects for hands-on practice with real code |
| `reset_progress` | Start over — requires explicit confirmation to prevent accidents |

The server also registers **8 interactive prompts** (for quiz flow, mode selection, post-answer options) and **3 resource types** (concept handouts, reference projects, exam overview).

<br />

## 📖 Study Modes

### Initial Assessment

Start with 15 questions across all domains. Based on your score:

- **< 60% accuracy** → **Beginner-Friendly Path**: Starts with fundamentals in Domain 1, builds up gradually through each domain sequentially. Focuses on easy and medium questions first.
- **≥ 60% accuracy** → **Exam-Weighted Path**: Focuses on high-weight domains first (Domain 1 at 27%, Domains 3 & 4 at 20% each). Targets weak areas aggressively with harder questions.

### Adaptive Practice

After assessment, every question is selected by a three-priority algorithm:

1. **Overdue reviews** — Spaced repetition items due for review today (highest priority)
2. **Weak areas** — Topics where your mastery is below 50%
3. **New material** — Fresh questions from your recommended domain

This means you never waste time on topics you've already mastered. The algorithm continuously adapts as your skills improve.

### Mastery Levels

Each of the 30 task statements has an independent mastery level:

| Level | Criteria | What it means |
|-------|----------|---------------|
| **Unassessed** | No attempts yet | You haven't seen questions on this topic |
| **Weak** | < 50% accuracy | Needs significant study — questions will resurface frequently |
| **Developing** | 50–69% accuracy | Making progress — keep practicing |
| **Strong** | 70–89% accuracy | Good understanding — review intervals are longer |
| **Mastered** | ≥ 90% accuracy, 5+ attempts, 3+ consecutive correct | Exam-ready on this topic — rare reviews |

### Spaced Repetition (SM-2)

The [SM-2 algorithm](https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm) schedules review intervals:

- **First review:** 1 day after answering
- **Second review:** 3 days after first review
- **Subsequent reviews:** Previous interval × ease factor (starts at 2.5)
- **Wrong answer:** Interval resets, ease factor decreases by 0.2 (floor: 1.3)
- **Correct answer:** Ease factor increases by 0.1

This means difficult questions come back often, while easy questions space out to weeks or months apart.

<br />

## 🏗 Architecture

```
Claude (UI) ←→ MCP Server (stdio) ←→ Core Engine ←→ SQLite
```

| Component | Technology | Purpose |
|-----------|-----------|---------|
| MCP Server | `@modelcontextprotocol/sdk` v1 | Registers tools, prompts, resources over stdio |
| Grading Engine | Pure TypeScript functions | Deterministic answer verification |
| Spaced Repetition | SM-2 algorithm | Optimal review scheduling |
| Adaptive Path | Priority-based selector | Routes to most impactful questions |
| Question Bank | 390 bundled JSON questions | Scenario-based, verified against docs |
| Progress Store | `better-sqlite3` (WAL mode) | Persistent mastery, answers, schedules |

### Anti-Sycophancy Design

This server enforces honest grading at the protocol level — not just in prompts:

1. **Deterministic grading** — `gradeAnswer()` is a pure function. No LLM is involved in judging correctness.
2. **Tool-level enforcement** — The `submit_answer` tool description instructs Claude to relay results verbatim.
3. **No partial credit** — Multiple choice, one correct answer. No "you were on the right track."
4. **Wrong answer explanations** — Every incorrect option has a specific `whyWrongMap` entry explaining the misconception.
5. **System prompt rules** — Five anti-sycophancy directives prevent Claude from softening incorrect results.

<br />

## 📊 Question Bank Details

**390 total questions** across the certification curriculum:

| Metric | Value |
|--------|-------|
| Total questions | 390 |
| Domains covered | 5 |
| Task statements covered | 30 |
| Questions per task statement | 13 |
| Difficulty distribution | 4 easy, 5 medium, 4 hard per task |
| Answer key balance | Distributed across A/B/C/D |
| Question format | Scenario-based multiple choice |
| Each question includes | Scenario, question, 4 options, explanation, why-wrong-map, references |
| Source material | Anthropic official documentation |

Every question includes:
- A **2–3 sentence scenario** grounding the question in a real-world context
- **4 options** (A/B/C/D) with exactly one correct answer
- A detailed **explanation** of why the correct answer is right
- A **whyWrongMap** with specific explanations for each of the 3 incorrect options
- **References** linking to the relevant Anthropic documentation pages

<br />

## 🤝 Contributing

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

# Run locally
node dist/index.js
```

### Adding Questions

Questions live in `src/data/questions/domain-{1-5}.json`. Each question requires:

- `id` — Unique ID (format: `q-{taskStatement}-{difficulty}-{n}`)
- `taskStatement` — Which task statement this tests (e.g., "1.2")
- `domainId` — Domain number (1–5)
- `difficulty` — `"easy"`, `"medium"`, or `"hard"`
- `scenario` — 2–3 sentence real-world context
- `text` — The actual question
- `options` — Object with keys A, B, C, D
- `correctAnswer` — One of A, B, C, D
- `explanation` — Why the correct answer is right
- `whyWrongMap` — Object with 3 entries (one per wrong option) explaining each misconception
- `references` — Array of Anthropic documentation URLs

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
│   └── system-prompt.ts  # Anti-sycophancy rules
├── db/
│   ├── schema.ts         # SQLite schema (7 tables)
│   ├── store.ts          # Database initialization
│   ├── mastery.ts        # Mastery level calculations
│   └── answers.ts        # Answer recording
├── engine/
│   ├── grading.ts        # Deterministic grading
│   ├── spaced-repetition.ts  # SM-2 algorithm
│   ├── question-selector.ts  # Priority-based selection
│   ├── session-state.ts      # Navigation state
│   └── adaptive-path.ts     # Learning path recommendations
├── tools/                # 10 MCP tool handlers
├── prompts/              # 8 MCP prompt definitions
└── resources/            # 3 MCP resource types
```

<br />

## 📄 License

MIT © [Connectry Labs](https://connectry.io/labs)

<br />

## 🙏 Credits

- [Anthropic](https://anthropic.com) — Claude & the Claude Certified Architect certification program
- [Model Context Protocol](https://modelcontextprotocol.io/) — The protocol that makes this possible
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Fast, synchronous SQLite for Node.js

<br />

---

<p align="center">
  <sub>Built with ⚡ by <a href="https://connectry.io/labs">Connectry Labs</a></sub>
</p>

<p align="center">
  <a href="https://github.com/Connectry-io/connectrylab-architect-cert-mcp">GitHub</a> •
  <a href="https://www.npmjs.com/package/connectry-architect-mcp">npm</a> •
  <a href="https://connectry.io/labs">Website</a>
</p>
