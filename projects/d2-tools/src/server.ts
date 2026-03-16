/**
 * MCP Server Entry Point — Tool Registration and Transport Setup
 *
 * Covers: Task Statement 2.4
 *   - MCP server creation with McpServer
 *   - StdioServerTransport for stdio communication
 *   - Tool and resource registration pattern
 *   - Server lifecycle (create -> register -> connect)
 *
 * Also demonstrates: Task Statement 2.1, 2.2
 *   - All registered tools use clear descriptions with boundaries
 *   - All error paths use structured error responses
 *
 * This server is designed to be launched via .mcp.json:
 *   {
 *     "mcpServers": {
 *       "billing": {
 *         "type": "stdio",
 *         "command": "node",
 *         "args": ["./dist/server.js"],
 *         "env": { "API_SECRET": "env://BILLING_API_SECRET" }
 *       }
 *     }
 *   }
 *
 * The env:// prefix resolves environment variables at connection time,
 * keeping secrets out of version control.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerInvoiceTools } from './tools/invoice-tools.js';
import { registerResources } from './resources/index.js';
import { registerMetaTools } from './tools/meta-tools.js';

// ---- Server Creation ----

/**
 * Create the MCP server instance.
 *
 * The name and version are visible to Claude Code in the server
 * registration UI. Use a descriptive name that communicates the
 * server's domain.
 */
const server = new McpServer({
  name: 'd2-tools-demo',
  version: '1.0.0',
});

// ---- Register Tools ----

/**
 * Tools are registered in domain-specific modules. This keeps
 * the server entry point clean and each module focused on a
 * single responsibility.
 *
 * Registration order does not affect tool selection — Claude
 * selects tools based on descriptions, not position.
 */

// Domain 2.1 + 2.2: Invoice tools with clear descriptions and structured errors
registerInvoiceTools(server);

// Domain 2.3: Meta tools demonstrating agent-scoping concepts
registerMetaTools(server);

// ---- Register Resources ----

/**
 * Resources provide read-only context that Claude can fetch on demand.
 * Unlike tools, resources do not have side effects and are intended
 * for context injection (customer profiles, documentation, pricing).
 *
 * Domain 2.4: MCP resources and resource templates
 */
registerResources(server);

// ---- Connect Transport ----

/**
 * StdioServerTransport communicates over stdin/stdout. This is the
 * standard transport for local MCP servers launched by Claude Code.
 *
 * When Claude Code reads .mcp.json and finds:
 *   "type": "stdio", "command": "node", "args": ["./dist/server.js"]
 * it spawns this process and connects via stdio.
 *
 * The server's lifetime is bound to the Claude Code session.
 * When the session ends, the process is terminated.
 */
const transport = new StdioServerTransport();
await server.connect(transport);
