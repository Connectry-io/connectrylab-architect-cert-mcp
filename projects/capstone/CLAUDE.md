# Support Agent Pro — Claude Code Configuration

> This file demonstrates Domain 3 (D3) patterns: project-level CLAUDE.md
> that configures Claude Code behavior for this specific project.

## Project Overview

This is a multi-agent customer support system built with the Anthropic SDK
and MCP SDK. It processes support tickets through an analysis → research →
response pipeline using specialized subagents.

## Architecture

- **Coordinator** (`src/coordinator.ts`) — orchestrates the pipeline
- **Analyzer** (`src/subagents/analyzer.ts`) — classifies tickets
- **Researcher** (`src/subagents/researcher.ts`) — searches knowledge base
- **Responder** (`src/subagents/responder.ts`) — drafts customer responses

## Coding Standards

- **Immutability**: All interfaces use `readonly`. Never mutate objects in place.
- **Error handling**: Every function returns `AgentResult<T>` envelopes, never throws except at pipeline boundaries.
- **Validation**: Zod schemas validate all data crossing stage boundaries.
- **Provenance**: Every piece of information must be traceable to its source.

## TypeScript Conventions

- Use ESM imports with `.js` extensions (required for ESM resolution)
- Prefer `interface` over `type` for object shapes
- Use `readonly` on all interface properties and array types
- Functions should be < 50 lines; files < 400 lines

## Tool Design Rules

When adding new MCP tools:
1. Use `verb_noun` naming: `get_ticket`, `search_knowledge_base`
2. Include detailed descriptions with examples in the tool schema
3. Validate all inputs with Zod before processing
4. Return structured errors via `error-handler.ts`, never raw strings
5. Register hooks for audit logging on every new tool

## Testing

Run tests with: `npm test`
Expected coverage: 80%+ on all modules.

## Environment

- Requires `ANTHROPIC_API_KEY` environment variable
- Node.js 20+ with ESM support
- TypeScript strict mode enabled
