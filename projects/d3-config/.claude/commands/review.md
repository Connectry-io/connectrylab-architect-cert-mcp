---
# Task 3.2: Custom slash command — invoked as /review in Claude Code.
#
# Frontmatter fields:
#   context: fork — runs in an isolated context so the review does not
#     pollute the main conversation history. This is important for
#     commands that generate large output or perform analysis.
#   allowed-tools — restricts which tools this command may use.
#     The review command only needs to read code and search; it should
#     never write files or execute arbitrary commands.
context: fork
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git diff)
  - Bash(git log)
---

# Code Review

Review the changes in this PR or working tree for quality, correctness, and adherence to project standards.

## Scope

$ARGUMENTS

If no arguments are provided, review all uncommitted changes (`git diff` and `git diff --staged`).

## Review Checklist

For each changed file, evaluate:

1. **Correctness** — Does the logic do what it claims? Edge cases handled?
2. **Type safety** — No `any` types, proper null checks, discriminated unions used?
3. **Error handling** — Are all error paths covered? Result types in domain layer?
4. **Naming** — Do names follow project conventions (see .claude/rules/coding-style.md)?
5. **Testing** — Are there corresponding test changes? Coverage maintained?
6. **Security** — No hardcoded secrets, input validated, SQL parameterized?
7. **Performance** — No N+1 queries, unnecessary allocations, or blocking I/O?

## Output Format

For each issue found, report:

```
[SEVERITY] file:line — description
  Suggestion: how to fix
```

Severity levels: CRITICAL, HIGH, MEDIUM, LOW, NIT

Summarize with counts per severity at the end.
