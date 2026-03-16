# Setup Guide

## Prerequisites

- Node.js 18+
- An MCP-compatible client (Claude Code, Claude Desktop, or similar)

## Installation

### From npm (recommended)

```bash
npm install -g connectry-architect-mcp
```

### From source

```bash
git clone https://github.com/Connectry-io/connectry-architect-mcp.git
cd connectry-architect-mcp
npm install
npm run build
```

## Configuration

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "connectry-architect": {
      "command": "connectry-architect-mcp"
    }
  }
}
```

Or for global access, add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "connectry-architect": {
      "command": "connectry-architect-mcp"
    }
  }
}
```

### Claude Desktop

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "connectry-architect": {
      "command": "connectry-architect-mcp"
    }
  }
}
```

### From source (development)

```json
{
  "mcpServers": {
    "connectry-architect": {
      "command": "node",
      "args": ["/path/to/connectry-architect-mcp/dist/index.js"]
    }
  }
}
```

## First Run

1. Open your MCP client
2. Claude will auto-detect the MCP server
3. Say "I want to study for the Claude Architect certification"
4. The server will create your profile at `~/.connectry-architect/config.json`
5. Start with the assessment: "Let's start the assessment"

## Data Storage

All data is stored locally:

- Config: `~/.connectry-architect/config.json`
- Progress: `~/.connectry-architect/progress.db`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONNECTRY_DB_PATH` | `~/.connectry-architect/progress.db` | Custom database path |

## Troubleshooting

### Server not showing up

1. Restart your MCP client
2. Check that `connectry-architect-mcp` is in your PATH: `which connectry-architect-mcp`
3. Verify the config JSON is valid

### Database errors

Delete the database to start fresh:
```bash
rm ~/.connectry-architect/progress.db
```

### Build errors from source

```bash
rm -rf node_modules dist
npm install
npm run build
```
