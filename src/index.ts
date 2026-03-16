import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDatabase, getDefaultDbPath } from './db/store.js';
import { loadOrCreateUserConfig } from './config.js';
import { registerTools } from './tools/index.js';
import { registerPrompts } from './prompts/index.js';
import { registerResources } from './resources/index.js';

const server = new McpServer({
  name: 'connectry-architect',
  version: '0.1.0',
});

const dbPath = process.env['CONNECTRY_DB_PATH'] ?? getDefaultDbPath();
const db = createDatabase(dbPath);
const userConfig = loadOrCreateUserConfig();

registerTools(server, db, userConfig);
registerPrompts(server, db, userConfig);
registerResources(server, db, userConfig);

const transport = new StdioServerTransport();
await server.connect(transport);
