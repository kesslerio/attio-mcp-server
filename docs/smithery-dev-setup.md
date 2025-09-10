# Smithery CLI Development Setup

This guide explains how to use the Smithery CLI for local development with the TypeScript runtime, providing the exact Playground and scanner behavior without deploying.

## Prerequisites

- **Node.js ≥ 18** (Node 20+ recommended)
- **npm ≥ 10** 
- Project configured with TypeScript runtime (already done ✅)

## Quick Start

```bash
# Install dependencies and build
npm install
npm run build

# Start Smithery dev server with Playground
npm run dev

# Or build and start in one command
npm run dev:build
```

## What Happens

When you run `npm run dev`:

1. **Smithery CLI** starts a local build of your MCP server
2. **ngrok tunnel** is created with a secure temporary domain
3. **Playground** opens in your browser connected to your local server
4. **Capability scan** runs automatically (tools/resources discovery)

## Project Configuration

### `src/smithery.ts` (Entry Point)

```typescript
import { z } from 'zod';
import { createServer as buildServer, ServerContext } from './server/createServer.js';

// Optional config schema - allows scanner to run with empty config
export const configSchema = z.object({
  ATTIO_API_KEY: z.string().min(1, 'Required').describe('Your Attio API key').optional(),
  ATTIO_WORKSPACE_ID: z.string().describe('Attio workspace ID (optional)').optional(),
  debug: z.boolean().default(false).optional(),
});

// Required default export for Smithery TypeScript runtime
export default function createServer({ config }: { config: z.infer<typeof configSchema> }) {
  const context: ServerContext = {
    getApiKey: () => config.ATTIO_API_KEY || process.env.ATTIO_API_KEY,
    getWorkspaceId: () => config.ATTIO_WORKSPACE_ID || process.env.ATTIO_WORKSPACE_ID,
  };
  return buildServer(context);
}
```

### `smithery.yaml` (Smithery Configuration)

```yaml
runtime: "typescript"

startCommand:
  type: http

# Empty config allows scanner to run without credentials
exampleConfig:
  ATTIO_API_KEY: ""
  ATTIO_WORKSPACE_ID: ""
  debug: false
```

## Testing in Playground

### 1. Discovery Testing (No Auth Required)

- **Tools Tab**: Should show all tools including `aaa-health-check`
- **Resources Tab**: Returns empty array without API key (expected)
- **Prompts Tab**: Shows available prompts

### 2. No-Auth Tool Testing

Run the `aaa-health-check` tool:
- Should return success without any API key
- Validates basic MCP communication

### 3. Authenticated Testing

1. Click **Edit Configuration** in Playground
2. Add your `ATTIO_API_KEY` and optional `ATTIO_WORKSPACE_ID`
3. Save and reconnect
4. Test Attio-dependent tools:
   - `search-records`
   - `create-record`
   - `get-record-details`

### 4. Session Testing

The TypeScript runtime handles:
- Streamable HTTP transport
- Session management (`Mcp-Session-Id` headers)
- Per-session configuration injection

Test by:
1. Making multiple tool calls in sequence
2. Verifying session persistence
3. Checking that config persists across calls

## Common Issues & Solutions

### Build Fails in CLI

```bash
# Fix TypeScript errors first
npm run build

# Check for missing dependencies
npm install

# Verify TypeScript version
npx tsc --version  # Should be 5.x
```

### Scanner Can't Find Tools

Verify:
- `export default function createServer` exists in `src/smithery.ts`
- `smithery.yaml` has `runtime: "typescript"`
- Build output exists in `dist/`

### Auth/Config Not Showing

- Export `configSchema` from `src/smithery.ts`
- Schema fields should be `.optional()` for scanner compatibility

### Port Already in Use

```bash
# Kill existing processes
pkill -f "node dist"

# Or use a different port
PORT=3001 npm run dev
```

## Development Workflow

### Recommended Workflow

1. **Make changes** to source files
2. **Build** with `npm run build`
3. **Test locally** with `npm run dev`
4. **Verify in Playground**:
   - Scanner passes (tools/resources discovered)
   - No-auth tools work
   - Authenticated tools work with config
5. **Commit** when ready

### Hot Reload Development

In separate terminals:
```bash
# Terminal 1: Watch and rebuild
npm run build:watch

# Terminal 2: Run dev server (restart after rebuild)
npm run dev
```

## Advanced Testing

### External Server Connection

Playground can connect to any MCP server URL:

1. Start your server manually:
   ```bash
   node dist/index.js  # For STDIO
   ```

2. In Playground, click **Add Servers**
3. Enter your server URL or use ngrok tunnel

### Debug Mode

Enable debug logging:
```bash
# Set in environment
MCP_LOG_LEVEL=DEBUG npm run dev

# Or in Playground config
{
  "debug": true
}
```

### Performance Testing

Monitor in Playground:
- Request/response times
- Session creation overhead
- Tool execution performance

## CI/CD Integration

### Pre-commit Checks

```bash
# Run before committing
npm run check         # Lint, format, typecheck
npm run test:offline  # Unit tests
npm run build         # Ensure build works
```

### GitHub Actions

The dev setup simulates the same flows as production:
- Initialize → List tools → Call tools
- Session management
- Configuration injection

## Troubleshooting

### Logs Location

- **Console output**: Direct in terminal
- **Smithery CLI logs**: `~/.smithery/logs/`
- **Debug logs**: Enable with `MCP_LOG_LEVEL=DEBUG`

### Reset Everything

```bash
# Clean build artifacts
npm run clean

# Fresh install
rm -rf node_modules package-lock.json
npm install

# Rebuild and test
npm run dev:build
```

## Benefits of TypeScript Runtime

Using Smithery's TypeScript runtime provides:

1. **Automatic HTTP handling**: No Express server needed
2. **Session management**: Built-in `Mcp-Session-Id` handling
3. **Configuration injection**: Per-session config support
4. **Scanner compatibility**: Works with Smithery's capability scanner
5. **Simplified deployment**: Just push and deploy

## Next Steps

1. Test your changes locally with `npm run dev`
2. Verify scanner passes in Playground
3. Deploy to Smithery when ready
4. Monitor production behavior matches local testing

## Resources

- [Smithery TypeScript Documentation](https://smithery.ai/docs/build/deployments/typescript)
- [MCP Specification](https://modelcontextprotocol.io/specification)
- [Smithery CLI Reference](https://smithery.ai/docs/build/cli)
- [Playground Guide](https://smithery.ai/docs/getting_started/quickstart_connect)

---

*Last updated: 2025-09-10*