# Claude Desktop Integration Guide

This guide provides instructions for integrating the Attio MCP server with Claude Desktop.

## Prerequisites

Before setting up the integration, ensure you have:

1. Claude Desktop installed on your system
2. Node.js and npm installed
3. The attio-mcp-server package installed or cloned from repository
4. A valid Attio API key

## Configuration

Add the following configuration to your Claude Desktop configuration file:

```json
{
  "mcp_servers": {
    "attio": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/path/to/attio-mcp-server",
      "env": {
        "ATTIO_API_KEY": "your_attio_api_key_here"
      }
    }
  }
}
```

Replace `/path/to/attio-mcp-server` with the actual path to your cloned repository.

### Configuration Location

The Claude Desktop configuration file is located at:

- macOS: `~/Library/Application Support/claude-desktop/config.json`
- Windows: `%APPDATA%\claude-desktop\config.json`
- Linux: `~/.config/claude-desktop/config.json`

## Verification

To verify the integration is working correctly:

1. Start Claude Desktop
2. In a conversation, try using one of the Attio tools with the command:

```
@attio search-companies "Company Name"
```

## Available Tools

The attio-mcp-server automatically exposes all available tools without requiring manual configuration. These include:

### Company Tools
- `search-companies`: Search for companies by name
- `read-company-details`: Get detailed information about a company
- `read-company-notes`: Retrieve notes for a company
- `create-company-note`: Add a new note to a company

### People Tools
- `search-people`: Search for people by name
- `read-person-details`: Get detailed information about a person
- `read-person-notes`: Retrieve notes for a person
- `create-person-note`: Add a new note to a person

### List Tools
- `get-lists`: Get lists from Attio
- `get-list-entries`: Get entries from a specific list
- `add-record-to-list`: Add a record to a list
- `remove-record-from-list`: Remove a record from a list

## Troubleshooting

If you encounter issues with the integration:

1. Check that the ATTIO_API_KEY environment variable is correctly set
2. Ensure the MCP server has been built using `npm run build`
3. Restart Claude Desktop after making configuration changes
4. Check Claude Desktop logs for any error messages

For additional help, please refer to the main [README.md](/README.md) file.