# Support Agent Patterns — Domain-Specific Rules

> This file demonstrates D3: 3.x — Domain-specific rules that configure
> Claude Code behavior for support agent development.

## Ticket Handling Rules

1. **Never expose internal IDs to customers** — KB article IDs (KB-001),
   internal ticket IDs, and system identifiers must not appear in
   customer-facing responses.

2. **Always acknowledge the customer's emotion first** — Before jumping
   to resolution steps, validate the customer's frustration or concern.
   This is especially important for "frustrated" sentiment tickets.

3. **Escalation is a feature, not a failure** — When escalation triggers
   fire, the agent should frame this positively: "I'm connecting you with
   a specialist who can help with this specific issue."

## Response Quality Gates

Before any response is sent to a customer, verify:
- [ ] Core issue is directly addressed
- [ ] At least one actionable next step is included
- [ ] No internal jargon or system references
- [ ] Tone matches the sentiment analysis
- [ ] All claims trace back to KB articles or ticket data

## Subagent Design Rules

When creating or modifying subagents:
1. Each subagent gets the **minimum tools** needed for its task
2. Researcher = read-only KB tools (never ticket mutation)
3. Analyzer = no tools (pure LLM classification)
4. Responder = no tools (pure LLM generation)
5. Only the coordinator can call `update_ticket`

## Error Handling Pattern

All subagent functions must:
1. Return `AgentResult<T>` (never throw)
2. Wrap API calls in try/catch
3. Provide partial results when possible (prefer partial over failed)
4. Include the agent ID in all error metadata

## Prompt Engineering Rules

1. **Explicit criteria > vague instructions** — Every classification
   field must have concrete rules (see `extraction.ts`)
2. **Few-shot examples match the domain** — Use real-world support
   scenarios, not synthetic examples
3. **Anti-hallucination guardrails are mandatory** — Every prompt must
   include rules about not inventing information
4. **Structured output via tool_use** — Use Zod schemas registered as
   tool input schemas, not free-form JSON parsing
