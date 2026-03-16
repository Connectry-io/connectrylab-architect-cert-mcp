# Connectry Architect MCP

> Free certification prep for the **Claude Certified Architect — Foundations** exam.

Built by [Connectry LABS](https://connectry.io/labs/) — the same team behind [OmniTrade](https://connectry.io/labs/omnitrade/).

## What is this?

An MCP server that turns Claude into your personal certification tutor. It delivers adaptive practice questions, tracks your progress with spaced repetition, and provides concept lessons for all 30 task statements across 5 exam domains.

**Key features:**
- Adaptive learning with SM-2 spaced repetition — weak areas resurface until mastered
- Deterministic grading — answers are verified against Anthropic documentation, no ambiguity
- Interactive prompts — click A/B/C/D to answer, no typing needed
- Persistent progress — picks up exactly where you left off
- Concept lessons before questions (skippable), with expandable depth
- 5 domains, 30 task statements, 390 practice questions

## Quick Start

```bash
npm install -g connectry-architect-mcp
```

Then add to your MCP client config.

### Claude Code (VS Code / Cursor / Terminal)

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

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "connectry-architect": {
      "command": "connectry-architect-mcp"
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `start_assessment` | Begin with 15 questions to determine your learning path |
| `get_practice_question` | Get the next adaptive question (reviews > weak areas > new) |
| `submit_answer` | Grade your answer — deterministic, final, no disputes |
| `get_progress` | View your study progress overview |
| `get_curriculum` | Browse all domains and task statements with mastery levels |
| `get_section_details` | Deep dive into a specific task statement with concept lesson |
| `get_weak_areas` | See which topics need the most work |
| `get_study_plan` | Get personalized recommendations based on your performance |
| `scaffold_project` | Access reference projects for hands-on practice |
| `reset_progress` | Start over (requires confirmation) |

## Learning Paths

After the initial assessment, you'll be placed on one of two paths:

- **Beginner-Friendly** (< 60% accuracy): Starts with fundamentals, builds up gradually
- **Exam-Weighted** (≥ 60% accuracy): Focuses on high-weight domains first

## Exam Domains

| # | Domain | Weight |
|---|--------|--------|
| 1 | Agentic Architecture & Orchestration | 27% |
| 2 | Tool Design & MCP Integration | 18% |
| 3 | Claude Code Configuration & Workflows | 20% |
| 4 | Prompt Engineering & Structured Output | 20% |
| 5 | Context Management & Reliability | 15% |

## Architecture

```
Claude (UI) ←→ MCP Server (stdio) ←→ Core Engine ←→ SQLite
```

- **Claude is the UI** — no dashboard, no web server
- **MCP server** — registers tools, prompts, and resources
- **Core engine** — grading, spaced repetition (SM-2), adaptive path
- **SQLite** — persistent progress at `~/.connectry-architect/progress.db`

## License

MIT — see [LICENSE](LICENSE)

---

*By [Connectry LABS](https://connectry.io/labs/) — Empowering developers with AI-powered tools.*
