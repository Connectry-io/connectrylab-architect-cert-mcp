<p align="center">
  <br />
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Connectry-io/connectrylab-architect-cert-mcp/main/.github/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Connectry-io/connectrylab-architect-cert-mcp/main/.github/assets/logo-light.svg">
    <img alt="Architect Cert" src="https://raw.githubusercontent.com/Connectry-io/connectrylab-architect-cert-mcp/main/.github/assets/logo-dark.svg" width="420">
  </picture>
  <br />
</p>

<h3 align="center">
  Ace the Claude Certified Architect exam
</h3>

<p align="center">
  Adaptive certification prep powered by the Model Context Protocol.<br />
  390 questions. Spaced repetition. Zero sycophancy.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/connectry-architect-mcp"><img src="https://img.shields.io/npm/v/connectry-architect-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/connectry-architect-mcp"><img src="https://img.shields.io/npm/dm/connectry-architect-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="npm downloads"></a>
  <a href="https://github.com/Connectry-io/connectrylab-architect-cert-mcp"><img src="https://img.shields.io/github/stars/Connectry-io/connectrylab-architect-cert-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="GitHub stars"></a>
  <a href="https://github.com/Connectry-io/connectrylab-architect-cert-mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Connectry-io/connectrylab-architect-cert-mcp?style=flat&colorA=18181B&colorB=E8784A" alt="License"></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-exam-domains">Exam Domains</a> •
  <a href="#-tools">Tools</a> •
  <a href="#-study-modes">Study Modes</a> •
  <a href="#-architecture">Architecture</a>
</p>

---

## 💬 What is Architect Cert?

Architect Cert is a free, open-source [MCP](https://modelcontextprotocol.io/) server that turns Claude into your personal certification tutor for the **Claude Certified Architect — Foundations** exam. No courses, no slides — just ask Claude and study:

```
You: "Start my study session"

Claude: 📊 Your Study Dashboard

        Overall Progress: 42% mastered

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
```

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
```

```
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

<br />

## ✨ Features

<table>
<tr>
<td width="50%">

### 🧠 Adaptive Learning
SM-2 spaced repetition algorithm resurfaces weak areas at optimal intervals. Questions you get wrong come back sooner — questions you master fade away.

### 📝 390 Exam Questions
13 scenario-based questions per task statement across all 30 task statements. Easy, medium, and hard difficulties with balanced answer distributions.

### ✅ Deterministic Grading
Pure function grading — no LLM judgment calls. Your answer is checked against a verified key. Right is right, wrong is wrong.

</td>
<td width="50%">

### 🚫 Zero Sycophancy
Claude won't sugarcoat wrong answers. Anti-sycophancy rules are enforced at the protocol level, not just in prompts. Wrong means wrong.

### 📊 Progress Tracking
Persistent SQLite database tracks every answer, mastery level, and review schedule. Pick up exactly where you left off across sessions.

### 🎯 Smart Question Selection
Three-priority selection: overdue reviews first, then weak areas, then new material. You always work on what matters most.

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

Add to `.mcp.json` in your project or `~/.claude.json`:

```json
{
  "mcpServers": {
    "connectry-architect": {
      "command": "connectry-architect-mcp"
    }
  }
}
```

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

</details>

### 3. Start Studying

Restart your MCP client and start chatting:

- *"Start an assessment to find my weak areas"*
- *"Give me a practice question on agentic architecture"*
- *"Show my progress across all domains"*
- *"What should I study next?"*

<br />

## 🔄 How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                      YOUR MACHINE                             │
│                                                                │
│   ┌──────────┐          ┌──────────────────────┐              │
│   │  Claude   │ ◄──────► │  Architect Cert MCP  │              │
│   │  (tutor)  │   stdio  │  (engine + content)  │              │
│   └──────────┘          └──────────┬───────────┘              │
│                                     │                          │
│                          ┌──────────┴───────────┐              │
│                          │                       │              │
│                  ~/.connectry-architect/   390 questions        │
│                     progress.db          (bundled JSON)        │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

1. **Assessment** — 15 questions to baseline your knowledge across all domains
2. **Adaptive path** — Places you on beginner-friendly or exam-weighted track
3. **Smart selection** — Prioritizes: overdue reviews → weak areas → new material
4. **Spaced repetition** — SM-2 algorithm schedules reviews at optimal intervals
5. **Mastery tracking** — Four levels: weak → developing → strong → mastered

<br />

## 📚 Exam Domains

| # | Domain | Weight | Questions |
|---|--------|--------|-----------|
| 1 | Agentic Architecture & Orchestration | 27% | 91 |
| 2 | Tool Design & MCP Integration | 18% | 65 |
| 3 | Claude Code Configuration & Workflows | 20% | 78 |
| 4 | Prompt Engineering & Structured Output | 20% | 78 |
| 5 | Context Management & Reliability | 15% | 78 |
| | **Total** | **100%** | **390** |

Each domain contains 5–7 task statements with 13 questions each. Questions are scenario-based, with verified correct answers sourced from Anthropic's official documentation.

### 30 Task Statements

<details>
<summary><b>Domain 1 — Agentic Architecture & Orchestration</b> (7 tasks)</summary>

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
<summary><b>Domain 2 — Tool Design & MCP Integration</b> (5 tasks)</summary>

| Task | Description |
|------|-------------|
| 2.1 | Design effective tool schemas with clear descriptions and parameters |
| 2.2 | Implement structured error handling for tool responses |
| 2.3 | Configure tool_choice and manage tool provisioning per agent |
| 2.4 | Integrate MCP servers into Claude Code and agent workflows |
| 2.5 | Apply Claude Code's built-in tools for codebase navigation |

</details>

<details>
<summary><b>Domain 3 — Claude Code Configuration & Workflows</b> (6 tasks)</summary>

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
<summary><b>Domain 4 — Prompt Engineering & Structured Output</b> (6 tasks)</summary>

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
<summary><b>Domain 5 — Context Management & Reliability</b> (6 tasks)</summary>

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

Architect Cert provides **10 MCP tools**:

| Tool | Description |
|------|-------------|
| `start_assessment` | Begin with 15 diagnostic questions to determine your learning path |
| `get_practice_question` | Get the next adaptive question (reviews → weak areas → new material) |
| `submit_answer` | Grade your answer — deterministic, no LLM judgment, final verdict |
| `get_progress` | View overall study progress with mastery percentages |
| `get_curriculum` | Browse all 5 domains and 30 task statements with mastery levels |
| `get_section_details` | Deep dive into a specific task statement with concept lesson |
| `get_weak_areas` | Identify topics that need the most work |
| `get_study_plan` | Get personalized recommendations based on your performance |
| `scaffold_project` | Access reference projects for hands-on practice |
| `reset_progress` | Start over — requires confirmation |

<br />

## 📖 Study Modes

### Initial Assessment

Start with 15 questions across all domains. Based on your score:

- **< 60% accuracy** → **Beginner-Friendly Path**: Starts with fundamentals, builds up gradually through each domain sequentially
- **≥ 60% accuracy** → **Exam-Weighted Path**: Focuses on high-weight domains first (Domain 1 at 27%), targets weak areas aggressively

### Adaptive Practice

After assessment, every question is selected by priority:

1. **Overdue reviews** — Spaced repetition items due for review today
2. **Weak areas** — Topics where your mastery is below 50%
3. **New material** — Fresh questions from your recommended domain

### Mastery Levels

| Level | Criteria |
|-------|----------|
| **Unassessed** | No attempts yet |
| **Weak** | < 50% accuracy |
| **Developing** | 50–69% accuracy |
| **Strong** | 70–89% accuracy |
| **Mastered** | ≥ 90% accuracy, 5+ attempts, 3+ consecutive correct |

<br />

## 🏗 Architecture

```
Claude (UI) ←→ MCP Server (stdio) ←→ Core Engine ←→ SQLite
```

- **Claude is the UI** — no dashboard, no web app, no extra tooling
- **MCP server** — registers tools, prompts, and resources via `@modelcontextprotocol/sdk`
- **Core engine** — deterministic grading, SM-2 spaced repetition, adaptive path selection
- **SQLite** — persistent progress at `~/.connectry-architect/progress.db` (WAL mode)
- **Question bank** — 390 questions bundled as JSON, validated at build time

### Anti-Sycophancy Design

This server enforces honest grading at the protocol level:

1. **Deterministic grading** — `gradeAnswer()` is a pure function. No LLM involved in judging correctness.
2. **Tool-level enforcement** — The `submit_answer` tool description instructs Claude to relay results verbatim.
3. **No partial credit** — Multiple choice, one correct answer. No "you were on the right track."
4. **Explanation includes why wrong** — Every incorrect option has a specific `whyWrongMap` entry.
5. **System prompt rules** — Five anti-sycophancy directives in the system prompt fragment.

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

# Run tests
npm test

# Run locally
node dist/index.js
```

### Adding Questions

Questions live in `src/data/questions/domain-{1-5}.json`. Each question requires:

- `id` — Unique ID (format: `q-{taskStatement}-{difficulty}-{n}`)
- `scenario` — 2–3 sentence real-world context
- `options` — A/B/C/D with one correct answer
- `explanation` — Why the correct answer is right
- `whyWrongMap` — Specific explanation for each wrong option
- `references` — Anthropic documentation URLs

<br />

## 📄 License

MIT © [Connectry Labs](https://connectry.io/labs)

<br />

## 🙏 Credits

- [Anthropic](https://anthropic.com) — Claude & the certification program
- [Model Context Protocol](https://modelcontextprotocol.io/) — The protocol that makes this possible
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Fast, synchronous SQLite

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
