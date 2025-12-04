# @attio-mcp/core

Edge-compatible core library for Attio MCP servers. Provides tool definitions, HTTP client, and registry that work on Node.js, Cloudflare Workers, and other edge runtimes.

## Installation

```bash
npm install @attio-mcp/core
```

## Usage

### Basic Setup

```typescript
import { createAttioClient, createToolRegistry } from '@attio-mcp/core';

// Create HTTP client with Attio token
const client = createAttioClient(process.env.ATTIO_ACCESS_TOKEN);

// Create tool registry (all tools by default)
const registry = createToolRegistry();

// Get tool definitions for MCP
const definitions = registry.getDefinitions();

// Execute a tool
const result = await registry.executeTool(client, 'records_search', {
  resource_type: 'companies',
  query: 'Acme',
});
```

### Filtered Tools

```typescript
// Only include specific tools
const registry = createToolRegistry({
  tools: ['records_search', 'records_get_details'],
});

// Search-only mode
const searchRegistry = createToolRegistry({
  mode: 'search',
});
```

### Custom HTTP Client

```typescript
import { createFetchClient, type HttpClient } from '@attio-mcp/core/api';

// Create custom client
const client = createFetchClient({
  baseUrl: 'https://api.attio.com',
  authorization: 'Bearer YOUR_TOKEN',
  timeout: 60000,
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

## API Reference

### `createAttioClient(token: string): HttpClient`

Creates an HTTP client configured for the Attio API.

### `createFetchClient(config: HttpClientConfig): HttpClient`

Creates a custom HTTP client with specified configuration.

```typescript
interface HttpClientConfig {
  baseUrl: string;
  authorization: string; // Required for Attio API calls
  timeout?: number;
  headers?: Record<string, string>;
}
```

### `createToolRegistry(config?: ToolRegistryConfig): ToolRegistry`

Creates a tool registry with optional filtering.

```typescript
interface ToolRegistryConfig {
  tools?: string[]; // Specific tools to include
  mode?: 'full' | 'search'; // Preset modes
}

interface ToolRegistry {
  getDefinitions(): ToolDefinition[];
  executeTool(
    client: HttpClient,
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult>;
}
```

### `getToolDefinitions(): ToolDefinition[]`

Returns all available tool definitions.

## Available Tools

| Tool                          | Description                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| `aaa-health-check`            | Check API connectivity (aaa- prefix for alphabetical sorting) |
| `records_search`              | Search records by type and query                              |
| `records_get_details`         | Get detailed record information                               |
| `create-record`               | Create a new record                                           |
| `update-record`               | Update an existing record                                     |
| `delete-record`               | Delete a record                                               |
| `records_discover_attributes` | List available attributes for a resource type                 |
| `create-note`                 | Create a note on a record                                     |
| `list-notes`                  | List notes for a record                                       |

## Phone Validation Configuration

The phone validation module normalizes phone numbers to E.164 format before sending to Attio. By default, it uses `US` as the fallback country for numbers without an international prefix.

### Configuring Default Country

When calling handlers directly, pass `ToolHandlerConfig` to customize phone validation:

```typescript
import {
  handleCreateRecord,
  createFetchClient,
  type ToolHandlerConfig,
} from '@attio-mcp/core';

const client = createFetchClient({ token: process.env.ATTIO_API_KEY });

// Configure for UK phone numbers
const config: ToolHandlerConfig = {
  phone: { defaultCountry: 'GB' },
};

// Create a person with UK phone number (no +44 prefix needed)
const result = await handleCreateRecord(
  client,
  {
    resource_type: 'people',
    record_data: {
      name: 'John Smith',
      phone_numbers: [{ phone_number: '020 7946 0958' }],
    },
  },
  config // <- Config passed here
);
// Phone normalized to: +442079460958
```

### Supported Countries

Any ISO 3166-1 alpha-2 country code is supported (US, GB, DE, FR, JP, AU, etc.). See [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js) for the full list.

### Note on Registry Dispatch

When using the tool registry (`executeTool`), config injection is not yet supported. This is tracked for a future enhancement. For now, use direct handler invocation when custom country configuration is needed.

## Edge Compatibility

This library is designed to work in edge environments:

- **No Node.js Dependencies**: Uses native `fetch` API
- **Web Crypto Compatible**: No Node.js crypto modules
- **No Environment Variables**: Configuration via injection
- **ESM Only**: Modern module format

### Cloudflare Workers

```typescript
import { createAttioClient, createToolRegistry } from '@attio-mcp/core';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const client = createAttioClient(env.ATTIO_TOKEN);
    const registry = createToolRegistry();

    // Handle MCP requests...
  },
};
```

### Node.js

```typescript
import { createAttioClient, createToolRegistry } from '@attio-mcp/core';

const client = createAttioClient(process.env.ATTIO_ACCESS_TOKEN!);
const registry = createToolRegistry();
```

## Types

```typescript
import type {
  HttpClient,
  HttpClientConfig,
  ToolDefinition,
  ToolResult,
  ToolRegistry,
  ToolRegistryConfig,
  ResourceType,
  AttioRecord,
} from '@attio-mcp/core';
```

## License

Apache 2.0
