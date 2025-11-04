# Getting Started with Attio MCP Server

This guide will help you get up and running with the Attio MCP Server. The server allows AI assistants like Claude to interact with your Attio CRM data through natural language.

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js** (v18 or higher)
- **npm** (usually comes with Node.js)
- **Attio API Key** (obtain from [Attio Developer Documentation](https://docs.attio.com/docs/overview))
- **Git** (for development only)

## Installation Options

### Option 1: Install from npm (Recommended for Users)

> ⚠️ **Note**: The npm package name is `attio-mcp` (not `attio-mcp-server`)

```bash
npm install -g attio-mcp
```

This makes the `attio-mcp` command available globally.

### Option 2: Clone Repository (Recommended for Development)

```bash
# Fork the repository on GitHub first

# Clone your fork
git clone https://github.com/YOUR_USERNAME/attio-mcp-server.git
cd attio-mcp-server

# Add upstream remote
git remote add upstream https://github.com/kesslerio/attio-mcp-server.git

# Run comprehensive setup script (recommended)
./scripts/setup-dev-env.sh

# Or manually install dependencies only
npm install
```

## Configuration

### Environment Variables

The server requires the following environment variables:

- `ATTIO_API_KEY` (required): Your Attio API bearer token
- `ATTIO_WORKSPACE_ID` (optional): Your Attio workspace ID

**Optional Deal Configuration**:

- `ATTIO_DEFAULT_DEAL_OWNER` (optional): Default owner email address for new deals (e.g., "user@company.com")
- `ATTIO_DEFAULT_DEAL_STAGE` (optional): Default stage for new deals (e.g., "Interested")
- `ATTIO_DEFAULT_CURRENCY` (optional): Default currency for deal values (e.g., "USD")

You can set these in a `.env` file at the root of the project:

```
ATTIO_API_KEY=your_api_key_here
ATTIO_WORKSPACE_ID=your_workspace_id_here

# Optional: Deal defaults
ATTIO_DEFAULT_DEAL_OWNER=user@company.com
ATTIO_DEFAULT_DEAL_STAGE=Interested
ATTIO_DEFAULT_CURRENCY=USD
```

Or pass them as environment variables when running the server.

## Running the Server

### Option 1: Using npx (if installed globally)

```bash
attio-mcp
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

## Development Environment Setup

For developers contributing to the project, we provide a comprehensive setup script that handles all configuration:

```bash
# Run the comprehensive setup script
./scripts/setup-dev-env.sh

# Available options:
# --skip-tdd        Skip TDD environment setup
# --skip-ide        Skip IDE configuration setup
# --skip-hooks      Skip git hooks setup
# --force           Force re-run all setup steps
# --help            Show help message
```

The setup script will:

- ✅ Check and validate Node.js version (>=18.0.0)
- ✅ Install npm dependencies
- ✅ Set up git hooks (Husky) for pre-commit validation
- ✅ Create .env file from template
- ✅ Validate Attio API key configuration
- ✅ Run initial TypeScript build
- ✅ Configure VS Code settings for optimal development
- ✅ Set up TDD environment with test templates
- ✅ Run comprehensive health checks
- ✅ Provide clear feedback and next steps

For a minimal setup (e.g., in CI/CD):

```bash
./scripts/setup-dev-env.sh --skip-tdd --skip-ide --skip-hooks
```

## Connecting with Claude

To use the Attio MCP Server with Claude Desktop, add the following to your Claude configuration:

```json
{
  "mcpServers": {
    "attio": {
      "command": "npx",
      "args": ["attio-mcp"],
      "env": {
        "ATTIO_API_KEY": "YOUR_ATTIO_API_KEY"
      }
    }
  }
}
```

For more details on Claude configuration, see [Claude Desktop Configuration](./claude-desktop-config.md).

## Automatic Attribute Discovery

The Attio MCP server now automatically discovers and maintains attribute mappings:

- **Runs on Startup**: Automatically discovers all attributes when the server starts
- **Periodic Updates**: Refreshes mappings every hour by default
- **Zero Configuration**: Works out of the box with no manual setup required

### Customizing Auto-Discovery

You can customize the behavior via environment variables in your `.env` file:

```bash
# Disable auto-discovery (default: true)
ATTIO_AUTO_DISCOVERY=false

# Disable discovery on startup (default: true)
ATTIO_DISCOVERY_ON_STARTUP=false

# Set update interval in minutes (default: 60)
ATTIO_DISCOVERY_INTERVAL=120
```

### Manual Discovery (Optional)

If you prefer manual control or need immediate updates:

```bash
# Discover all attributes manually
npm run discover:all-attributes:robust

# This creates config/mappings/user.json with your workspace's attribute mappings
```

For more details, see the [CLI Documentation](./cli/README.md).

## Verifying Installation

To verify that the server is running correctly:

1. Start the server as described above
2. Wait a moment for automatic attribute discovery (check logs)
3. Ask Claude a question about your Attio data, such as "List all companies in my Attio CRM"
4. Claude should respond with data from your Attio instance

The server will automatically discover attributes on startup. Check the logs for:

```
Starting automatic attribute discovery...
Discovered X attributes for companies
Automatic attribute discovery completed successfully
```

If discovery fails, it won't prevent the server from starting. You can:

- Check logs for error details
- Run manual discovery: `npm run discover:all-attributes:robust`
- See [CLI Troubleshooting](./cli/README.md#troubleshooting) for more help

## Next Steps

- Explore the [API Reference](./api/api-overview.md) to understand the capabilities
- Read about [Docker deployment](./docker/docker-guide.md) for production use
- Check the [Troubleshooting Guide](../TROUBLESHOOTING.md) if you encounter issues

## Support

If you encounter any issues, please:

1. Check the [Troubleshooting Guide](../TROUBLESHOOTING.md)
2. Look for similar issues on our [GitHub Issues](https://github.com/kesslerio/attio-mcp-server/issues) page
3. Create a new issue if your problem isn't addressed
