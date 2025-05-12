# Attio MCP Server Documentation

Welcome to the Attio MCP Server documentation! This guide provides comprehensive information on setting up, using, and extending the Attio Model Context Protocol (MCP) server.

## Table of Contents

- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Core Features](#core-features)
- [Using with Claude](#using-with-claude)
- [Development](#development)
- [API Reference](#api-reference)

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm (v7 or higher)
- Git
- Attio API key

### Installation

```bash
npm install attio-mcp-server
```

For development, clone the repository:

```bash
git clone https://github.com/username/attio-mcp-server.git
cd attio-mcp-server
npm install
```

### Quick Start

1. Set up your API key:

```bash
export ATTIO_API_KEY=your_api_key_here
```

2. Start the server:

```bash
npm start
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ATTIO_API_KEY` | Your Attio API key | Yes |
| `ATTIO_BASE_URL` | Attio API base URL (default: `https://api.attio.com/v2`) | No |
| `MCP_PORT` | Port for the MCP server (default: 3000) | No |
| `NODE_ENV` | Node environment (development/production) | No |

### Claude Desktop Configuration

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

The Attio MCP server provides tools for working with various Attio objects:

### People Tools

- [search-people](./mcp-tools/people-tools.md#search-people): Search for people by name, email, or phone
- [get-person](./mcp-tools/people-tools.md#get-person): Get detailed information about a person
- [get-person-notes](./mcp-tools/people-tools.md#get-person-notes): Get notes for a person
- [create-person-note](./mcp-tools/people-tools.md#create-person-note): Create a note for a person

### Company Tools

- [search-companies](./mcp-tools/companies-tools.md#search-companies): Search for companies by name
- [get-company](./mcp-tools/companies-tools.md#get-company): Get detailed information about a company
- [get-company-notes](./mcp-tools/companies-tools.md#get-company-notes): Get notes for a company
- [create-company-note](./mcp-tools/companies-tools.md#create-company-note): Create a note for a company

### List Tools

- [list-lists](./mcp-tools/lists-tools.md#list-lists): Get all lists
- [get-list](./mcp-tools/lists-tools.md#get-list): Get details for a specific list
- [get-list-entries](./mcp-tools/lists-tools.md#get-list-entries): Get entries for a list
- [add-to-list](./mcp-tools/lists-tools.md#add-to-list): Add a record to a list
- [remove-from-list](./mcp-tools/lists-tools.md#remove-from-list): Remove a record from a list

## Core Features

### Enhanced Error Handling

The MCP server implements a comprehensive error handling system:

- **Error Categorization**: Different types of errors are categorized for better handling
- **Retry Logic**: Automatic retry with exponential backoff for transient errors
- **Validation**: Input validation to catch errors before they reach the API
- **Standardized Responses**: All errors return in a consistent format

For detailed information, see [Error Handling](./api/error-handling.md).

### Enhanced People Search

The `search-people` tool has been enhanced to search across multiple fields:

- **Name**: Matches partial names (first name, last name, or full name)
- **Email**: Matches complete or partial email addresses
- **Phone**: Matches complete or partial phone numbers

This makes it much easier to find people when you only have partial information.

### Response Formatting

All responses follow a standardized format for consistency:

```typescript
{
  content: [{ type: 'text', text: '...' }],
  isError: false,
  metadata: { ... }
}
```

This provides both human-readable text responses and structured metadata that can be used programmatically.

## Using with Claude

Here are some example prompts that Claude can use with the Attio MCP server:

- "Search for people named Sarah in Attio"
- "Find companies with 'tech' in the name"
- "Show me the details of person with ID person_01abcdef"
- "Add a note to company company_01abcdef about our latest meeting"
- "Show me all the lists in Attio"
- "Get the entries in the 'Sales Pipeline' list"
- "Add record company_05efghij to list list_01abcdef"
- "Remove entry entry_02ghijkl from list list_01abcdef"

## Development

### Building the Server

```bash
npm run build
```

For development with automatic rebuilding:

```bash
npm run build:watch
```

### Running Tests

```bash
npm test
```

To run a specific test:

```bash
npm test -- -t "test name pattern"
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run check
```

### Docker Development

```bash
docker-compose up -d
```

## API Reference

### Attio API Documentation

- [API Overview](./api/api-overview.md): Overview of the Attio API
- [People API](./api/people-api.md): Documentation for the People API
- [Companies API](./api/objects-api.md): Documentation for the Companies API
- [Lists API](./api/lists-api.md): Documentation for the Lists API
- [Notes API](./api/notes-api.md): Documentation for the Notes API

### MCP Tools Documentation

- [MCP API Overview](./mcp-api-overview.md): Overview of the MCP server
- [People Tools](./mcp-tools/people-tools.md): Documentation for People tools
- [Companies Tools](./mcp-tools/companies-tools.md): Documentation for Companies tools
- [Lists Tools](./mcp-tools/lists-tools.md): Documentation for Lists tools

### Core Concepts

- [Error Handling](./api/error-handling.md): Error handling system
- [Extending MCP](./api/extending-mcp.md): Extending the MCP server