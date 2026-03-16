---
# Task 3.2: Custom slash command — invoked as /commit in Claude Code.
#
# This command has a focused set of allowed-tools: it can read code
# and run git commands, but cannot modify files. The commit message
# is generated and presented for approval before executing.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git status)
  - Bash(git diff)
  - Bash(git log)
  - Bash(git add)
  - Bash(git commit)
---

# Conventional Commit

Generate a well-structured conventional commit for the current staged changes.

## Arguments

$ARGUMENTS

If arguments are provided, use them as additional context for the commit message.

## Process

1. Run `git diff --staged` to see what will be committed
2. Run `git status` to check for unstaged changes that might be missing
3. Analyze the changes to determine:
   - **type**: feat, fix, refactor, docs, test, chore, perf, ci
   - **scope**: the primary module or subsystem affected
   - **description**: concise summary of the "why" (not the "what")
4. If the change is substantial, include a body paragraph explaining motivation
5. Present the proposed commit message for approval
6. Execute `git commit` with the approved message

## Commit Message Template

```
type(scope): short description

Optional body explaining WHY this change was made.
Focus on motivation and context, not implementation details.
```

## Rules

- Subject line: max 72 characters, imperative mood, no period
- Body: wrap at 80 characters, separated from subject by blank line
- If changes span multiple scopes, use the most significant one
- Breaking changes: add `!` after type/scope (e.g., `feat(api)!: remove v1 endpoints`)
