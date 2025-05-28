# MCP Protocol Communication Guidelines

This document provides important guidelines for ensuring reliable communication between your MCP server and clients like Claude Desktop.

## Critical Rule: NEVER Use console.log()

**The most important rule when working with MCP servers: NEVER use `console.log()` directly.**

### Why This Is Critical

The Model Context Protocol (MCP) uses **standard output (stdout)** for communication between the server and client:

1. Your MCP server receives requests on stdin
2. Your MCP server sends responses on stdout
3. Any debugging/logging information should go to stderr

If you use `console.log()`, it writes to stdout, which:
- Corrupts the JSON-RPC protocol
- Causes "Unexpected token in JSON" errors in the client
- Makes the MCP client (Claude Desktop) unable to parse your responses

## Safe Logging Practices

### 1. Use safeMcpLog (Preferred)

```typescript
import { safeMcpLog } from '../utils/logger.js';

// Safe MCP logging - won't break protocol
safeMcpLog('Processing tool request', { toolName, arguments });
```

### 2. Use console.error

```typescript
// Safe for MCP protocol - writes to stderr
console.error('Processing tool request', toolName, arguments);
```

### 3. Use Structured Logging

```typescript
import { debug, info, warn, error } from '../utils/logger.js';

// All these write to stderr now
debug('module-name', 'Debug message', { context: 'data' });
info('module-name', 'Info message', { context: 'data' });
warn('module-name', 'Warning message', { context: 'data' });
error('module-name', 'Error message', errorObject, { context: 'data' });
```

## Common MCP Protocol Errors

### Client-Side Error Messages

When protocol communication breaks, the client will show errors like:

```
SyntaxError: Unexpected token in JSON at position 12
SyntaxError: Expected property name or '}' in JSON at position 1
SyntaxError: Unexpected non-whitespace character after JSON at position 15
```

These errors usually indicate console.log output has contaminated the JSON response stream.

### Debugging MCP Protocol Issues

1. Search for `console.log` calls in your codebase
2. Check if any middleware or third-party code writes to stdout
3. Validate responses are proper JSON before sending
4. Use `sanitizeMcpResponse` for all tool responses

## Sanitizing MCP Responses

Always sanitize responses before returning them to the client:

```typescript
import { sanitizeMcpResponse } from '../utils/json-serializer.js';

// In your tool handler
const result = await processToolRequest(request);
return sanitizeMcpResponse(result);
```

## Common Pitfalls

1. **Debug statements**: Even temporary `console.log` statements will break MCP
2. **Third-party libraries**: Check if they write to stdout and redirect if needed
3. **Error handling**: Make sure errors are not logged to stdout
4. **Performance monitoring**: Use stderr for all performance logging

## Testing MCP Communication

To verify your MCP server doesn't contaminate stdout:

```bash
# Capture stdout separately and verify it's pure JSON
node src/index.js > stdout.log 2> stderr.log
cat stdout.log | jq . # Should parse cleanly as JSON
```

Always follow these guidelines to ensure reliable communication between your MCP server and clients.