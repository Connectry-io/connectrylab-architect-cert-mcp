import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadOrCreateUserConfig } from './config.js';
import { createLazyDb } from './db/lazy.js';
import { registerTools } from './tools/index.js';
import { registerPrompts } from './prompts/index.js';
import { registerResources } from './resources/index.js';

const server = new McpServer({
  name: 'connectry-architect',
  version: '0.1.11',
});

const userConfig = loadOrCreateUserConfig();

// Lazy DB: better-sqlite3 native module loads on first tool call, not at startup.
// This makes the MCP server appear in Claude almost instantly.
const db = createLazyDb();

registerTools(server, db, userConfig);
registerPrompts(server, db, userConfig);
registerResources(server, db, userConfig);

const transport = new StdioServerTransport();
await server.connect(transport);
