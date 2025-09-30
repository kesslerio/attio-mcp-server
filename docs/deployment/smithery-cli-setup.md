# Smithery CLI Development Setup

This guide covers the local development setup for the Attio MCP Server using the Smithery CLI. This setup allows developers to test the MCP server in the Smithery Playground without deploying to production.

## Overview

The Smithery CLI provides a local development environment that:

- Runs your MCP server locally with a secure ngrok tunnel
- Opens the Smithery Playground for interactive testing
- Simulates the exact behavior of a deployed server
- Supports hot reload and rapid iteration

## Prerequisites

Before starting, ensure you have:

1. **Node.js ≥ 18** (v20+ recommended)
2. **npm** package manager
3. **Built project** - Run `npm run build` to compile TypeScript

## Quick Start

```bash
# Install dependencies and build
npm install
npm run build

# Start the Smithery dev environment
npm run dev
```

This opens the Smithery Playground in your browser, connected to your local server via a secure tunnel.

## Project Configuration

### Required Files

#### 1. `src/smithery.ts` (Entry Point)

This file exports the MCP server in the format expected by Smithery's TypeScript runtime:

```typescript
import { z } from 'zod';
import { createServer as buildServer } from './server/createServer.js';

// Configuration schema - all fields optional for discovery
export const configSchema = z.object({
  ATTIO_API_KEY: z.string().describe('Your Attio API key').optional(),
  ATTIO_WORKSPACE_ID: z
    .string()
    .describe('Optional Attio workspace ID')
    .optional(),
  debug: z.boolean().default(false).describe('Enable debug logging').optional(),
});

// Default export required by Smithery
export default function createServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  if (config?.debug) {
    process.env.MCP_LOG_LEVEL = 'DEBUG';
  }

  const server = buildServer({
    getApiKey: () => config?.ATTIO_API_KEY || process.env.ATTIO_API_KEY,
    getWorkspaceId: () =>
      config?.ATTIO_WORKSPACE_ID || process.env.ATTIO_WORKSPACE_ID,
  });

  return server;
}
```

#### 2. `smithery.yaml` (Runtime Configuration)

```yaml
name: Attio MCP
description: Connect Attio CRM to MCP clients
keywords: [attio, crm, contacts, companies, deals]

runtime: 'typescript'

startCommand:
  type: http

# Empty config enables scanner to run without secrets
exampleConfig:
  ATTIO_API_KEY: ''
  ATTIO_WORKSPACE_ID: ''
  debug: false
```

## Testing in Smithery Playground

### 1. Initial Discovery Test

When the Playground opens, it automatically runs the capability scan:

- **Tools tab**: Should show all available tools (including `aaa-health-check`)
- **Resources tab**: Empty without API key (expected behavior)

### 2. Testing Without Authentication

Test the health check tool which doesn't require authentication:

1. Navigate to **Tools** tab
2. Select `aaa-health-check`
3. Click **Run**
4. Verify successful response

### 3. Testing With API Key

To test authenticated operations:

1. In Playground, click **Edit Configuration**
2. Add your Attio API credentials:
   ```json
   {
     "ATTIO_API_KEY": "your-api-key-here",
     "ATTIO_WORKSPACE_ID": "optional-workspace-id",
     "debug": false
   }
   ```
3. Save configuration (applies to current session only)
4. Test authenticated tools like `records.search`, `get-record`, etc.

### 4. Testing Streaming Responses

The TypeScript runtime automatically handles:

- Streamable HTTP protocol
- Session management (`Mcp-Session-Id` headers)
- Proper streaming for long-running operations

## Development Workflow

### Local Changes

1. Make code changes
2. Rebuild: `npm run build`
3. Restart dev server: `npm run dev`
4. Test in Playground

### Debugging

Enable debug logging in two ways:

**Option 1: Via Configuration**

```json
{
  "debug": true
}
```

**Option 2: Via Environment**

```bash
MCP_LOG_LEVEL=DEBUG npm run dev
```

### Testing Different Scenarios

The Playground supports:

- **Empty config**: Tests discovery and non-authenticated tools
- **Partial config**: Tests graceful handling of missing credentials
- **Full config**: Tests complete functionality with real API calls

## Architecture Notes

### TypeScript Runtime

The Smithery TypeScript runtime:

- Wraps your MCP server with HTTP transport
- Manages the ngrok tunnel automatically
- Handles protocol negotiation and streaming
- Provides session management

### URL Path Structure

When deployed to Smithery, you may notice the endpoint URL appears as `/mcp/mcp`. This is expected behavior:

- Smithery's infrastructure adds its own `/mcp` prefix for routing
- Our HTTP server also defines `/mcp` as its endpoint
- Result: `https://server.smithery.ai/@kesslerio/attio-mcp-server/mcp/mcp`

This doesn't affect functionality - the TypeScript runtime handles routing internally.

### Key Differences from Standalone

| Aspect        | Standalone MCP        | Smithery Runtime            |
| ------------- | --------------------- | --------------------------- |
| Transport     | stdio or custom HTTP  | Managed HTTP with streaming |
| Configuration | Environment variables | Per-session config objects  |
| Discovery     | Not required          | Mandatory for marketplace   |
| Sessions      | Manual handling       | Automatic via runtime       |

## Troubleshooting

### Build Failures

```bash
# Fix TypeScript errors first
npm run typecheck

# Then rebuild
npm run build
```

### Scanner Can't Find Tools

Verify:

1. `export default createServer` exists in `src/smithery.ts`
2. `runtime: "typescript"` in `smithery.yaml`
3. Build is successful

### Configuration Not Showing

Ensure `configSchema` is exported from `src/smithery.ts`

### Connection Issues

The dev server uses ngrok with a temporary token. If connection fails:

1. Check network connectivity
2. Try restarting: `npm run dev`
3. Verify no firewall blocking ngrok

### Session Issues

The TypeScript runtime manages sessions automatically. If seeing session errors:

1. Ensure not mixing runtime modes (TypeScript vs Express)
2. Check that `src/smithery.ts` returns the raw server instance

## Advanced Usage

### Custom Build Steps

Modify the dev workflow:

```json
{
  "scripts": {
    "dev": "npm run build && npx @smithery/cli dev",
    "dev:watch": "npm run build:watch & npx @smithery/cli dev"
  }
}
```

### External Server Testing

Connect Playground to any MCP server:

1. In Playground, click **Add Servers**
2. Enter your server URL
3. Test against custom deployments

### CI/CD Integration

For automated testing:

```bash
# Build and validate
npm run build
npm run test

# Dry run (no browser)
npx @smithery/cli build --dry-run
```

## Security Considerations

### Development Mode

- Tunnel is temporary and expires after session
- URL is randomly generated and secure
- No data persists between sessions

### API Keys

- Never commit API keys to version control
- Use session configuration for testing
- Keys are scoped to Playground session only

## References

- [Smithery TypeScript Runtime Documentation](https://smithery.ai/docs/build/deployments/typescript)
- [Smithery CLI Quickstart](https://smithery.ai/docs/getting_started/quickstart_build)
- [MCP Protocol Specification](https://modelcontextprotocol.io/docs)
- [Attio API Documentation](https://docs.attio.com/)

## Support

For issues specific to:

- **Smithery CLI**: Check [Smithery Documentation](https://smithery.ai/docs)
- **MCP Protocol**: See [MCP GitHub](https://github.com/modelcontextprotocol/specification)
- **This Implementation**: Open an issue in [attio-mcp-server](https://github.com/kesslerio/attio-mcp-server)
