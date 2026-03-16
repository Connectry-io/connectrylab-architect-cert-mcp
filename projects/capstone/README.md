# Capstone — Multi-Agent Research System (Support Agent Pro)

A working multi-agent customer support system that demonstrates **all 5 certification domains** integrated into a single cohesive application. This project processes support tickets through a pipeline of specialized subagents: analysis, research, and response drafting.

## Architecture

```
                         MCP Client (Claude Code / Inspector)
                                     |
                                     | stdio
                                     v
                          +--------------------+
                          |   MCP Server       |  D2: Tool & resource registration
                          |   (server.ts)      |  D1: Hook system initialization
                          +--------+-----------+
                                   |
                          +--------v-----------+
                          |   Coordinator      |  D1: Agentic loop, task decomposition
                          |   (coordinator.ts) |  D5: Session context, escalation
                          +--------+-----------+
                                   |
                     +-------------+-------------+
                     |             |             |
              +------v------+ +---v--------+ +--v---------+
              |  Analyzer   | | Researcher | | Responder  |
              |  (D4: 4.1,  | | (D1: 1.3,  | | (D4: 4.2,  |
              |   4.3)      | |  D2: 2.3)  | |  4.4)      |
              +------+------+ +---+--------+ +--+---------+
                     |             |             |
                     v             v             v
              Structured    Knowledge Base   Few-shot
              Classification  Search         Templates
                     |             |             |
                     +------+------+------+------+
                            |             |
                     +------v------+ +----v-------+
                     |  Pipeline   | |  Context   |
                     |  (D1: 1.4)  | |  (D5: 5.1, |
                     |  Zod gates  | |   5.4, 5.6) |
                     +-------------+ +------------+
```

## Domain Mapping

| File | D1 Agentic | D2 Tools | D3 Config | D4 Prompts | D5 Context |
|------|:----------:|:--------:|:---------:|:----------:|:----------:|
| `src/server.ts` | 1.5 | 2.1, 2.2, 2.3 | | | |
| `src/coordinator.ts` | 1.1, 1.2, 1.6 | | | | 5.1, 5.2, 5.3 |
| `src/subagents/researcher.ts` | 1.3 | 2.3 | | | 5.6 |
| `src/subagents/analyzer.ts` | 1.3 | | | 4.1, 4.3 | |
| `src/subagents/responder.ts` | | | | 4.2, 4.4 | 5.6 |
| `src/tools/ticket-tools.ts` | | 2.1 | | | |
| `src/tools/knowledge-tools.ts` | | 2.1, 2.2 | | | |
| `src/tools/error-handler.ts` | | 2.2 | | | |
| `src/prompts/extraction.ts` | | | | 4.1 | |
| `src/prompts/few-shot-templates.ts` | | | | 4.2, 4.4 | |
| `src/prompts/schemas.ts` | | | | 4.3 | |
| `src/context/session-manager.ts` | | | | | 5.1, 5.4 |
| `src/context/escalation.ts` | | | | | 5.2 |
| `src/context/error-propagation.ts` | | | | | 5.3 |
| `src/context/provenance.ts` | | | | | 5.6 |
| `src/workflow/pipeline.ts` | 1.4 | | | | 5.3 |
| `src/hooks/index.ts` | 1.5 | | | | |
| `src/types.ts` | all | all | | all | all |
| `CLAUDE.md` | | | 3.x | | |
| `.claude/rules/support-patterns.md` | | | 3.x | | |
| `.claude/commands/triage.md` | | | 3.x | | |

## Setup

### Prerequisites

- Node.js 20+
- An Anthropic API key

### Installation

```bash
cd projects/capstone
npm install
```

### Environment

```bash
export ANTHROPIC_API_KEY="your-key-here"
```

### Build

```bash
npm run build
```

### Run

**As MCP server (stdio transport):**
```bash
npm start
```

**With MCP Inspector:**
```bash
npm run inspect
```

**Development mode (with tsx):**
```bash
npm run dev
```

### MCP Client Configuration

Add to your MCP client config (e.g., Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "support-agent-pro": {
      "command": "node",
      "args": ["--loader", "ts-node/esm", "src/server.ts"],
      "cwd": "/path/to/projects/capstone",
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `get_ticket` | Retrieve a ticket by ID |
| `search_tickets` | Search tickets by query, status, priority, category |
| `update_ticket` | Update ticket status, priority, or add notes |
| `search_knowledge_base` | Search KB articles by query and filters |
| `get_article` | Retrieve a specific KB article by ID |
| `process_ticket` | Full multi-agent pipeline: analyze + research + draft response |

## Key Design Decisions

1. **Immutability everywhere** — All interfaces use `readonly`, all updates create new objects
2. **AgentResult envelope** — Every subagent returns `AgentResult<T>` for consistent error propagation
3. **Zod at boundaries** — Schema validation at every pipeline stage transition
4. **Provenance tracking** — Every claim in a response traces back to a KB article or ticket data
5. **Least privilege** — The researcher has only read-only KB tools, never ticket mutation
6. **Hook system** — Cross-cutting concerns (audit, rate limiting, sanitization) are decoupled from tool logic

## Sample Tickets

The system includes three sample tickets for testing:

- **TKT-001** — Billing dashboard access issue (high priority, frustrated customer, recurring)
- **TKT-002** — API rate limiting mismatch (medium priority, technical, enterprise customer)
- **TKT-003** — Plan upgrade inquiry (low priority, neutral, straightforward)

## Project Structure

```
capstone/
├── CLAUDE.md                          # D3: Project-level config
├── .claude/
│   ├── rules/support-patterns.md      # D3: Domain-specific rules
│   └── commands/triage.md             # D3: Custom triage command
├── package.json
├── tsconfig.json
└── src/
    ├── server.ts                      # MCP server entry point
    ├── coordinator.ts                 # Main orchestration agent
    ├── types.ts                       # Shared immutable types + Zod schemas
    ├── subagents/
    │   ├── analyzer.ts                # Ticket classification
    │   ├── researcher.ts              # KB research with provenance
    │   └── responder.ts               # Response drafting with few-shot
    ├── tools/
    │   ├── ticket-tools.ts            # Ticket CRUD tools
    │   ├── knowledge-tools.ts         # KB search/read tools
    │   └── error-handler.ts           # Structured error builder
    ├── prompts/
    │   ├── extraction.ts              # Explicit classification criteria
    │   ├── few-shot-templates.ts      # Response examples by category
    │   └── schemas.ts                 # Zod schemas for structured output
    ├── context/
    │   ├── session-manager.ts         # Long conversation context
    │   ├── escalation.ts              # Typed escalation triggers
    │   ├── error-propagation.ts       # AgentResult envelope
    │   └── provenance.ts              # Source tracking
    ├── workflow/
    │   └── pipeline.ts                # Multi-step pipeline with Zod gates
    └── hooks/
        └── index.ts                   # Tool call interception hooks
```
