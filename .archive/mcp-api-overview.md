# Attio MCP Server Documentation

The Attio MCP (Model Context Protocol) Server provides a bridge between Claude and other AI assistants and the Attio API. This documentation covers how to set up, use, and extend the MCP server.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Error Handling](#error-handling)
- [Extending the MCP Server](#extending-the-mcp-server)
- [Using with Claude](#using-with-claude)
- [Docker Support](#docker-support)
- [Development](#development)

## Architecture Overview

The Attio MCP Server follows a modular architecture:

```
src/
├── index.ts                 # Entry point
├── api/                     # API client functionality
│   ├── attio-client.ts      # Attio API client
│   └── attio-operations.ts  # Core API operations
├── handlers/                # Request handlers
│   ├── resources.ts         # Resource handlers
│   └── tools.ts             # Tool handlers
├── objects/                 # Object-specific implementations
│   ├── companies.ts         # Companies implementation
│   ├── people.ts            # People implementation
│   └── lists.ts             # Lists implementation
├── types/                   # TypeScript type definitions
│   └── attio.ts             # Attio data types
└── utils/                   # Utilities
    ├── error-handler.ts     # Error handling
    ├── validation.ts        # Input validation
    └── response-formatter.ts # Response formatting
```

This architecture is designed for:
- **Modularity**: Each component has a specific responsibility
- **Extensibility**: New functionality can be added without modifying existing code
- **Type Safety**: TypeScript provides strong typing throughout
- **Error Resilience**: Comprehensive error handling and recovery

## Installation

### Prerequisites

- Node.js v18 or higher
- npm v7 or higher
- An Attio account with API access

### NPM Installation

```bash
npm install attio-mcp-server
```

### Manual Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/username/attio-mcp-server.git
   ```

2. Install dependencies:
   ```bash
   cd attio-mcp-server
   npm install
   ```

3. Build the server:
   ```bash
   npm run build
   ```

## Configuration

The MCP server requires the following environment variables:

- `ATTIO_API_KEY`: Your Attio API key

You can set these in a `.env` file:

```
ATTIO_API_KEY=your_api_key_here
```

### Configuration with Claude Desktop

Add the following to your Claude Desktop configuration:

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

## Available Tools

The MCP server provides the following tools:

### People Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `search-people` | Search for people by name, email, or phone | `query`: Search query string |
| `get-person` | Get detailed information about a person | `id`: Person record ID |
| `get-person-notes` | Get notes for a person | `id`: Person record ID |
| `create-person-note` | Create a note for a person | `id`: Person record ID, `title`: Note title, `content`: Note content |

### Company Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `search-companies` | Search for companies by name | `query`: Search query string |
| `get-company` | Get detailed information about a company | `id`: Company record ID |
| `get-company-notes` | Get notes for a company | `id`: Company record ID |
| `create-company-note` | Create a note for a company | `id`: Company record ID, `title`: Note title, `content`: Note content |

### List Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `list-lists` | Get all lists | `limit` (optional): Maximum number of lists to return |
| `get-list` | Get details for a specific list | `id`: List ID |
| `get-list-entries` | Get entries for a list | `id`: List ID, `limit` (optional): Maximum number of entries to return |
| `add-to-list` | Add a record to a list | `listId`: List ID, `recordId`: Record ID to add |
| `remove-from-list` | Remove a record from a list | `listId`: List ID, `entryId`: List entry ID to remove |

## Error Handling

The MCP server implements a comprehensive error handling system:

- **Error Categorization**: Different types of errors are categorized for better handling
- **Retry Logic**: Automatic retry with exponential backoff for transient errors
- **Validation**: Input validation to catch errors before they reach the API
- **Standardized Responses**: All errors return in a consistent format

For detailed information, see [Error Handling](./docs/api/error-handling.md).

## Extending the MCP Server

The MCP server is designed to be extensible. You can add:

- New object types
- New tools for existing object types
- Custom validation logic
- Enhanced error handling

See [Extending MCP](./docs/api/extending-mcp.md) for more information.

## Using with Claude

Claude can interact with the Attio MCP server to perform CRM operations. Example prompts:

- "Search for people named Sarah in Attio"
- "Get details about company with ID company_123"
- "Add a note to person person_456 about our latest conversation"
- "Show me all the lists in Attio"
- "Add recordId abc123 to list xyz789"

## Docker Support

The MCP server can be run in a Docker container:

### Building the Docker Image

```bash
docker build -t attio-mcp-server .
```

### Running with Docker

```bash
docker run -p 3000:3000 \
  -e ATTIO_API_KEY=your_api_key_here \
  attio-mcp-server
```

### Docker Compose

```yaml
version: '3'
services:
  attio-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ATTIO_API_KEY=your_api_key_here
```

## Development

### Running in Development Mode

```bash
npm run build:watch
```

In a separate terminal:

```bash
dotenv npx @modelcontextprotocol/inspector node ./dist/index.js
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run check
```

## API Reference

For detailed information on the underlying Attio API, please refer to:

- [API Overview](./docs/api/api-overview.md)
- [People API](./docs/api/people-api.md)
- [Companies API](./docs/api/objects-api.md)
- [Lists API](./docs/api/lists-api.md)
- [Notes API](./docs/api/notes-api.md)
- [Error Handling](./docs/api/error-handling.md)