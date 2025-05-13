# Getting Started with Attio MCP Server

This guide will help you get up and running with the Attio MCP Server. The server allows AI assistants like Claude to interact with your Attio CRM data through natural language.

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js** (v18 or higher)
- **npm** (usually comes with Node.js)
- **Attio API Key** (obtain from [Attio API Explorer](https://developers.attio.com/reference/get_v2-objects))
- **Git** (for development only)

## Installation Options

### Option 1: Install from npm (Recommended for Users)

```bash
npm install -g attio-mcp-server
```

This makes the `attio-mcp-server` command available globally.

### Option 2: Clone Repository (Recommended for Development)

```bash
# Fork the repository on GitHub first

# Clone your fork
git clone https://github.com/YOUR_USERNAME/attio-mcp-server.git
cd attio-mcp-server

# Add upstream remote
git remote add upstream https://github.com/hmk/attio-mcp-server.git

# Install dependencies
npm install
```

## Configuration

### Environment Variables

The server requires the following environment variables:

- `ATTIO_API_KEY` (required): Your Attio API bearer token
- `ATTIO_WORKSPACE_ID` (optional): Your Attio workspace ID

You can set these in a `.env` file at the root of the project:

```
ATTIO_API_KEY=your_api_key_here
ATTIO_WORKSPACE_ID=your_workspace_id_here
```

Or pass them as environment variables when running the server.

## Running the Server

### Option 1: Using npx (if installed globally)

```bash
attio-mcp-server
```

### Option 2: From cloned repository

```bash
# Build the project
npm run build

# Run the server
node dist/index.js
```

### Option 3: Development mode

```bash
# Watch mode for development
npm run build:watch

# Run with MCP inspector for debugging
dotenv npx @modelcontextprotocol/inspector node dist/index.js
```

## Connecting with Claude

To use the Attio MCP Server with Claude Desktop, add the following to your Claude configuration:

```json
{
  "mcpServers": {
    "attio": {
      "command": "npx",
      "args": ["attio-mcp-server"],
      "env": {
        "ATTIO_API_KEY": "YOUR_ATTIO_API_KEY"
      }
    }
  }
}
```

For more details on Claude configuration, see [Claude Desktop Configuration](./claude-desktop-config.md).

## Verifying Installation

To verify that the server is running correctly:

1. Start the server as described above
2. Ask Claude a question about your Attio data, such as "List all companies in my Attio CRM"
3. Claude should respond with data from your Attio instance

## Next Steps

- Explore the [API Reference](./api/api-overview.md) to understand the capabilities
- Read about [Docker deployment](./docker/docker-guide.md) for production use
- Check the [Troubleshooting](./troubleshooting.md) guide if you encounter issues

## Support

If you encounter any issues, please:

1. Check the [Troubleshooting](./troubleshooting.md) guide
2. Look for similar issues on our [GitHub Issues](https://github.com/kesslerio/attio-mcp-server/issues) page
3. Create a new issue if your problem isn't addressed