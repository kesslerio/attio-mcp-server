# Claude Desktop MCP Configuration Guide

## Prerequisites

1. Attio API key from [Attio settings](https://app.attio.com/settings)
2. Node.js 16+ installed
3. Claude Desktop app

## Configuration Steps

### 1. Environment Setup

Create a `.env` file in the project root with your API key:
```
ATTIO_API_KEY=your-api-key-here
```

### 2. Claude Desktop Configuration

1. Open Claude Desktop settings
2. Go to Developer → Model Context Protocol
3. Click "Add Server"
4. Configure with these settings:

```json
{
  "mcpServers": {
    "attio": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/attio-mcp-server",
      "env": {
        "ATTIO_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Important**: Replace `/path/to/attio-mcp-server` with your actual installation path.

### 3. Build the Server

```bash
cd /path/to/attio-mcp-server
npm install
npm run build
```

### 4. Verify Configuration

1. Restart Claude Desktop
2. Look for "attio" in the available tools list
3. Test with a simple command like `list-companies`

## Common Issues

### Error: ATTIO_API_KEY environment variable not found
- Ensure the API key is correctly set in Claude Desktop configuration
- Check that the `env` object includes your API key

### Cannot find module errors
- Run `npm install` and `npm run build` before starting
- Ensure the `cwd` path is correct in Claude Desktop config

### Permission errors
- Check file permissions on the project directory
- Ensure Node.js has execution permissions

## Testing Your Setup

After configuration, test with these commands in Claude Desktop:

1. List companies: "Show me all companies"
2. Search: "Find companies in California"
3. Update: "Update company X with new services"

## Best Practices

1. Keep your API key secure - never commit it to git
2. Use environment variables for configuration
3. Test with read operations first
4. Always verify updates before executing

## Need Help?

- Check the [main documentation](../README.md)
- Review the [API documentation](./api/api-overview.md)
- Report issues at [GitHub](https://github.com/kesslerio/attio-mcp-server/issues)