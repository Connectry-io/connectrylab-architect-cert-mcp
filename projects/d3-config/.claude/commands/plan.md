---
# Task 3.4: Slash command demonstrating the plan mode assessment heuristic.
#
# This command helps the user decide whether to use plan mode or direct
# execution. Plan mode is valuable for complex, multi-step tasks but adds
# overhead for simple changes. The heuristic encodes this tradeoff.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git diff)
  - Bash(git log)
  - Bash(find)
---

# Complexity Assessment — Plan or Execute?

Evaluate the requested task and recommend whether to use plan mode or direct execution.

## Task Description

$ARGUMENTS

## Assessment Heuristic

Score each dimension (0 = low, 1 = medium, 2 = high):

| Dimension | 0 (Direct) | 1 (Either) | 2 (Plan) |
|-----------|-----------|------------|----------|
| **Files touched** | 1-2 files | 3-5 files | 6+ files |
| **Cross-cutting** | Single module | 2 modules | 3+ modules |
| **Ambiguity** | Clear spec | Some unknowns | Vague requirements |
| **Risk** | Easily reversible | Moderate impact | Breaking change / data migration |
| **Dependencies** | None | Internal deps | External API / schema changes |

**Total score interpretation:**
- **0-3**: Direct execution. Task is well-scoped and low-risk.
- **4-6**: Use judgment. Plan if any single dimension scores 2.
- **7-10**: Plan mode recommended. Break into phases with checkpoints.

## Output

1. Score each dimension with justification
2. Calculate total and state recommendation
3. If plan mode: outline 3-5 implementation phases
4. If direct mode: suggest the first concrete step

## When to Override

Always use plan mode regardless of score when:
- The task involves database schema changes
- The task modifies authentication or authorization logic
- The task affects the public API contract
- The user explicitly requests a plan
