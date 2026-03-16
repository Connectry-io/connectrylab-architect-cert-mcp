# D2 Mini — Tool Design & Structured Errors

**Domain 2 Reference Project for the Connectry Architect Certification MCP Server**

A mini MCP server that demonstrates every Domain 2 task statement through a realistic billing system. The server registers invoice tools with well-designed interfaces, structured error handling, agent-scoped tool distribution, MCP resources, and built-in tool usage patterns.

**Domain Mental Model:** "Tool descriptions are the LLM's only guide — design them like API docs."

## What This Project Teaches

| Task Statement | Concept | Where to Find It |
|---|---|---|
| **2.1** — Tool interface design | Clear descriptions, split vs consolidate, boundary language | `src/tools/invoice-tools.ts` |
| **2.2** — Structured error responses | `isError` flag, error categories, retryable metadata | `src/tools/error-handling.ts` |
| **2.3** — Tool distribution & tool_choice | Agent scoping, read-only vs write tools, auto/any/tool modes | `src/tools/agent-scoped-tools.ts`, `src/tools/meta-tools.ts` |
| **2.4** — MCP server integration | `.mcp.json`, `env://` expansion, resources, resource templates | `.mcp.json`, `src/server.ts`, `src/resources/index.ts` |
| **2.5** — Built-in tool selection | Glob/Grep/Read/Edit funnel, progressive narrowing | `src/examples/built-in-tools.ts` |

## How to Run

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run the MCP server (stdio transport)
npm start

# Or use tsx for development
npm run dev
```

To connect from Claude Code, add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "d2-tools-demo": {
      "type": "stdio",
      "command": "node",
      "args": ["./projects/d2-tools/dist/server.js"]
    }
  }
}
```

## File-by-File Walkthrough

### `package.json`
Project metadata with `@modelcontextprotocol/sdk`, `zod`, and `better-sqlite3` as dependencies. ESM module configuration.

### `tsconfig.json`
Strict TypeScript with ES2022 target and Node16 module resolution for ESM compatibility.

### `.mcp.json` (Task 2.4)
Example MCP configuration showing both **stdio** and **SSE** transports. Demonstrates `env://` prefix for environment variable expansion — secrets are never hardcoded in the config file.

### `src/types.ts` (All Domains)
Shared type definitions. Every interface uses `readonly` properties — objects are never mutated. Covers invoice domain types, error categories, agent scoping types, and resource types.

### `src/server.ts` (Task 2.4)
MCP server entry point. Creates `McpServer`, registers tools and resources from domain-specific modules, then connects via `StdioServerTransport`. Comments explain the server lifecycle and how `.mcp.json` triggers the launch.

### `src/tools/invoice-tools.ts` (Tasks 2.1, 2.2)
Three invoice tools that demonstrate **split vs consolidate** decisions:

- **`get_invoice`** — Retrieve a single invoice by ID. Description answers: what it does, when to use it, and what NOT to use it for.
- **`list_invoices`** — List invoices by customer with optional status filter. Returns summaries, not full details. Explicit boundary: "Do NOT use this to retrieve details of a single known invoice."
- **`create_invoice`** — Write operation separated from reads. Complex nested schema with documented parameters. Not available to research agents (see 2.3).

Every error path returns structured errors via `toolError()`.

### `src/tools/error-handling.ts` (Task 2.2)
Shared error-response builders:

- **`toolError()`** — Core builder with `isError: true`, category, message, retryable flag, and details.
- **`validationError()`** — Non-retryable, includes `field` and `received` metadata.
- **`authError()`** — Non-retryable, includes `scope` metadata.
- **`notFoundError()`** — Non-retryable, includes `resource` metadata.
- **`rateLimitError()`** — Retryable, includes `retryAfterMs` hint.
- **`toolSuccess()`** — Consistent success envelope (data, no error).
- **`withErrorGuard()`** — Higher-order function that catches uncaught exceptions and converts them to structured errors.

### `src/tools/agent-scoped-tools.ts` (Task 2.3)
Demonstrates tool distribution across agent roles:

- **Central tool registry** — All tools defined once, subsets distributed per agent.
- **Research agent** — Read-only tools (`get_invoice`, `list_invoices`, `get_customer`), `tool_choice: auto`.
- **Action agent** — Write tools plus read context, `tool_choice: any` (must always call a tool).
- **Coordinator** — Forced first step with `tool_choice: { type: "tool", name: "validate_request" }`, then switches to `auto`.
- Helper functions: `getToolsForAgent()`, `getToolChoice()`, `buildResearchAgentRequest()`, `buildCoordinatorFirstTurn()`.

### `src/tools/meta-tools.ts` (Task 2.3)
MCP tools that expose the agent-scoping configuration for inspection:

- **`get_agent_config`** — Query which tools a specific agent role can access and its tool_choice mode.
- **`compare_agent_scoping`** — Compare two roles side by side (shared tools, exclusive tools).
- **`explain_tool_choice`** — Detailed explanation of auto, any, and tool modes with common mistakes.

### `src/resources/index.ts` (Task 2.4)
MCP resources and resource templates:

- **`customers://{customerId}/profile`** — Resource template with parameterized URI. Supports listing and individual lookup.
- **`customers://{customerId}/invoices`** — Second template on the same scheme, showing REST-like hierarchy.
- **`billing://pricing/tiers`** — Static resource with fixed URI for reference data.
- **`billing://docs/api-reference`** — Static resource demonstrating that large read-only documents should be resources, not tool responses.

### `src/examples/built-in-tools.ts` (Task 2.5)
Documented walkthrough of the **Glob -> Grep -> Read -> Edit** progressive narrowing strategy:

- **Funnel example** — Four-step scenario with tool calls, reasoning, and anti-patterns.
- **Decision matrix** — Maps "What question am I answering?" to the correct built-in tool.
- **Anti-patterns** — Six common mistakes with correct approaches.
- **Composition example** — Multi-step codebase exploration showing context cost at each step.

## Key Patterns to Study

### 1. Description Design (2.1)
Every tool description answers three questions:
1. **What does this tool do?** (purpose, not implementation)
2. **When should this tool be used?** (trigger condition)
3. **What does this tool NOT do?** (explicit boundary)

### 2. Error Response Envelope (2.2)
```
Success: { data: { ... } }
Error:   { error: { category, message, retryable, details } }
```
Never mix shapes. The model should never have to guess which response type it received.

### 3. Least Privilege (2.3)
Each agent sees only the tools it needs. The model cannot call tools not in its list. Narrow tool sets produce sharper, more predictable behavior.

### 4. Resources vs Tools (2.4)
- **Resources** = read-only context (customer profiles, docs, pricing)
- **Tools** = side-effecting actions (create invoice, send email)

### 5. Progressive Narrowing (2.5)
Glob (orient) -> Grep (locate) -> Read (inspect) -> Edit (modify). Four tool calls instead of reading the entire codebase.
