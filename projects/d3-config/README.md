# Mini Claude Code Config — Team Workflow Setup

> **Domain 3 Reference Project** for the Connectry Architect Certification MCP Server.
> This is a configuration reference layout, not a runnable application.

## Purpose

Demonstrates all Domain 3 (Configuration & Customization) task statements
through a realistic team project configuration. Each file maps to one or more
exam objectives, showing production-quality patterns that a certified architect
would use.

## Mental Model

> "Hierarchy of instructions: user → project → directory, each scoped to its audience"

Claude Code configuration follows a layered override model:

```
~/.claude/rules/         ← User-level (personal preferences, global style)
  └─ project/CLAUDE.md   ← Project-level (team conventions, @import rules)
      └─ src/api/CLAUDE.md  ← Directory-level (subsystem-specific guidance)
```

Each layer inherits from the one above and can narrow scope but never widen it.

## File → Task Statement Map

| File | Task Statement | Concept |
|------|---------------|---------|
| `CLAUDE.md` | 3.1 | Project-level instructions, @import directives |
| `.claude/rules/coding-style.md` | 3.1 | Imported rule file for coding conventions |
| `.claude/rules/testing.md` | 3.1 | Imported rule file for test requirements |
| `.claude/rules/api-patterns.md` | 3.3 | Path-scoped rules via YAML frontmatter globs |
| `.claude/rules/db-patterns.md` | 3.3 | Path-scoped rules via YAML frontmatter globs |
| `.claude/commands/review.md` | 3.2 | Custom slash command (context: fork, allowed-tools) |
| `.claude/commands/commit.md` | 3.2 | Custom slash command for conventional commits |
| `.claude/commands/plan.md` | 3.4 | Plan mode vs direct execution heuristic |
| `.claude/commands/refine.md` | 3.5 | Iterative refinement with input/output examples |
| `.github/workflows/claude-review.yml` | 3.6 | CI/CD with `-p`, `--output-format json` |
| `.github/workflows/claude-test-gen.yml` | 3.6 | CI/CD test generation on changed files |
| `src/api/CLAUDE.md` | 3.1 | Directory-level CLAUDE.md (API subsystem) |
| `src/db/CLAUDE.md` | 3.1 | Directory-level CLAUDE.md (DB subsystem) |

## Key Concepts by Task Statement

### 3.1 — CLAUDE.md Hierarchy and Scoping

Three levels of configuration: user (`~/.claude/`), project (`CLAUDE.md` at repo
root), and directory (`src/*/CLAUDE.md`). The `@import` directive pulls in shared
rule files from `.claude/rules/`. The `.claude/rules/` directory is auto-loaded
when present.

### 3.2 — Custom Slash Commands and Skills

Files in `.claude/commands/` become `/command-name` in the CLI. Frontmatter
controls behavior: `context: fork` runs in an isolated context, `allowed-tools`
restricts which tools the command can use, and `$ARGUMENTS` injects user input.

### 3.3 — Path-Specific Rules

YAML frontmatter with `paths:` arrays and glob patterns activates rules only
when working on matching files. This keeps domain knowledge scoped to the
subsystem that needs it.

### 3.4 — Plan Mode vs Direct Execution

A complexity assessment heuristic determines whether to plan first or execute
directly. Simple, well-scoped tasks go direct; multi-step, cross-cutting
changes require a plan.

### 3.5 — Iterative Refinement

The interview pattern: ask clarifying questions before generating, then show
input/output examples so the user can steer. Multiple rounds converge on the
desired output.

### 3.6 — CI/CD Integration

GitHub Actions workflows invoke `claude -p` (non-interactive/piped mode) with
`--output-format json` for machine-readable output and `--json-schema` for
structured validation. This enables automated code review and test generation.
