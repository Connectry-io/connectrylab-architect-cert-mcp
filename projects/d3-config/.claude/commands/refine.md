---
# Task 3.5: Slash command demonstrating iterative refinement.
#
# The interview pattern: instead of generating output immediately,
# ask clarifying questions, show examples, and let the user steer
# through multiple rounds. This produces better results for ambiguous
# or creative tasks.
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Iterative Refinement

Collaboratively refine a specification, prompt, or code pattern through structured conversation rounds.

## Topic

$ARGUMENTS

## Process — The Interview Pattern

### Round 1: Understand Intent

Ask 3-5 clarifying questions before generating anything. Example questions:
- What is the primary use case for this?
- Who is the audience (developers, end users, CI system)?
- Are there existing patterns in the codebase to match?
- What are the constraints (performance, compatibility, size)?
- Can you show me an example of what "good" looks like?

### Round 2: Show Input/Output Examples

Present 2-3 concrete input/output pairs that demonstrate your understanding:

```
--- Example 1 ---
Input:  createUser({ name: "Alice", email: "alice@co.com" })
Output: { ok: true, data: { id: "usr_abc", name: "Alice", email: "alice@co.com" } }

--- Example 2 ---
Input:  createUser({ name: "", email: "invalid" })
Output: { ok: false, error: "Validation failed: name is required, email is invalid" }

--- Example 3 (edge case) ---
Input:  createUser({ name: "Bob", email: "bob@co.com" })  // email already exists
Output: { ok: false, error: "A user with this email already exists" }
```

Ask: "Do these examples match your expectations? What would you change?"

### Round 3: Generate Draft

Produce a first draft based on confirmed understanding. Mark uncertain decisions with `[DECISION NEEDED]` tags so the user can resolve them.

### Round 4: Refine

Incorporate feedback. Repeat until the user confirms the output is correct.

## Guidelines

- Never assume; always ask when ambiguous
- Show concrete examples rather than abstract descriptions
- Keep each round focused on one concern
- Track decisions made in earlier rounds; do not revisit unless asked
- Converge toward a final artifact within 3-4 rounds
