# JSON Serialization in Attio MCP Server

This document explains the JSON serialization approach used in the Attio MCP server, which is critical for ensuring reliable communication with Claude Desktop and other MCP clients.

## Overview

The MCP server needs to serialize complex JavaScript objects to JSON strings for:
- API responses to Claude Desktop
- Error messages and details
- Logging information
- Debugging output

Serialization must be robust against various edge cases that can cause JSON parsing errors, including:
- Circular references
- Non-serializable values (functions, symbols, etc.)
- Very deep object structures
- Very large response objects

## Implementation

We use the [`fast-safe-stringify`](https://github.com/davidmarkclements/fast-safe-stringify) library to handle JSON serialization throughout the application. This library was chosen after benchmarking multiple approaches:

```javascript
import fastSafeStringify from 'fast-safe-stringify';

// Basic usage
const json = fastSafeStringify(complexObject);

// With custom replacer and indentation
const prettyJson = fastSafeStringify(complexObject, (key, value) => {
  // Custom handling for specific values
  return value;
}, 2);
```

The implementation is wrapped in utility functions in `src/utils/json-serializer.ts` to provide additional features like string truncation and error object handling.

## Benchmark Results

We compared several JSON serialization approaches:

| Test Case | Native JSON | Our Custom Implementation | fast-safe-stringify | safe-stable-stringify |
|-----------|-------------|-------------------|---------------------|----------------------|
| Simple object | 1000/1000 (0μs) | 1000/1000 (1μs) | 1000/1000 (0μs) | 1000/1000 (1μs) |
| Circular reference | 0/1000 (6μs) | 1000/1000 (2μs) | 1000/1000 (1μs) | 1000/1000 (1μs) |
| Deep object | 1000/1000 (9μs) | 1000/1000 (85μs) | 1000/1000 (15μs) | 1000/1000 (25μs) |
| Large array | 1000/1000 (610μs) | 1000/1000 (2677μs) | 1000/1000 (975μs) | 1000/1000 (2934μs) |
| MCP response | 1000/1000 (8μs) | 1000/1000 (9μs) | 1000/1000 (8μs) | 1000/1000 (5μs) |
| Company record | 1000/1000 (1μs) | 1000/1000 (4μs) | 1000/1000 (2μs) | 1000/1000 (4μs) |

*Results show success rate and average time in microseconds (μs) over 1000 iterations*

Key findings:
- `fast-safe-stringify` was 2-5x faster than our custom implementation
- For deep objects, it was 5.7x faster (15μs vs. 85μs)
- For large arrays, it was 2.7x faster (975μs vs. 2677μs)
- Both `fast-safe-stringify` and `safe-stable-stringify` handled all edge cases correctly
- Native `JSON.stringify` failed completely on circular references

## Key Features

The implementation includes:

1. **Circular reference handling**: Replaces circular references with `[Circular]` marker
2. **Non-serializable value handling**: Properly excludes functions, symbols, etc.
3. **String truncation**: Limits very long string values to prevent excessive response sizes
4. **Error object formatting**: Special handling for Error objects to include relevant details
5. **Fallback mechanism**: Returns valid JSON even if serialization fails

## Usage in the Codebase

The JSON serialization utilities are used in several key places:

1. **MCP Response Sanitization**: All tool responses are sanitized before being returned to Claude Desktop
```typescript
// In src/handlers/tools/dispatcher/core.ts
const sanitizedResult = sanitizeMcpResponse(result);
return sanitizedResult;
```

2. **Error Formatting**: Error responses are formatted using safe JSON serialization
```typescript
// In src/utils/error-handler.ts
const safeDetails = JSON.parse(safeJsonStringify(details));
```

3. **Logging**: Structured logging uses safe JSON serialization
```typescript
// In src/utils/logger.ts
logFunction(safeJsonStringify(entry, { indent: 2 }));
```

## Best Practices

When working with JSON serialization in the codebase:

1. **Always use the provided utilities** - Never use `JSON.stringify` directly for MCP responses or logging
2. **Sanitize responses** - Call `sanitizeMcpResponse` on objects before returning them to MCP clients
3. **Handle errors gracefully** - Use try/catch blocks around serialization operations
4. **Limit response size** - Large responses can cause performance issues; truncate when appropriate
5. **Test edge cases** - Verify serialization with circular references and special value types

## Troubleshooting

Common JSON serialization issues:

1. **"Unexpected token in JSON"**: Usually indicates a circular reference or unhandled special value
2. **"Converting circular structure to JSON"**: Native `JSON.stringify` cannot handle circular references
3. **Performance issues with large responses**: Consider pagination or more specific queries

## Related Files

- `src/utils/json-serializer.ts` - Core serialization utilities
- `src/handlers/tools/dispatcher/core.ts` - MCP response handling
- `src/utils/error-handler.ts` - Error formatting with JSON
- `src/utils/logger.ts` - Structured logging with JSON
- `test/utils/json-serializer.test.ts` - Tests for serialization
- `test/utils/json-stringify-benchmark.js` - Benchmarking tool