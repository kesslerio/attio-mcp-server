# ChatGPT Connector Setup Guide

## Overview

The Attio MCP Server now includes OpenAI-compatible tools that enable ChatGPT and other OpenAI API clients to interact with your Attio CRM data. This feature provides search and fetch capabilities through a standard OpenAI tool interface.

## Features

- **Search Tool**: Search across all Attio objects (companies, people, lists, tasks)
- **Fetch Tool**: Get detailed information about specific records
- **SSE Transport**: Real-time communication using Server-Sent Events
- **Universal Tool Integration**: Leverages the powerful universal tools architecture
- **CORS Support**: Browser-based access enabled by default

## Quick Start

### 1. Enable SSE Transport

Set the environment variable to enable the ChatGPT connector:

```bash
export ENABLE_SSE_TRANSPORT=true
```

### 2. Start the Server

```bash
# With SSE enabled
ENABLE_SSE_TRANSPORT=true attio-mcp

# Or with custom port
ENABLE_SSE_TRANSPORT=true HEALTH_PORT=8080 attio-mcp
```

### 3. Verify OpenAI Endpoints

```bash
# List available tools
curl http://localhost:3000/openai/tools

# Search for records
curl -X POST http://localhost:3000/openai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search",
    "arguments": {
      "query": "technology companies"
    }
  }'

# Fetch specific record
curl -X POST http://localhost:3000/openai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "fetch",
    "arguments": {
      "id": "companies:abc123-def456"
    }
  }'
```

## Tool Specifications

### Search Tool

Searches across all Attio object types and returns results in OpenAI format.

**Arguments:**
- `query` (string, required): The search query

**Returns:**
```json
{
  "results": [
    {
      "id": "companies:abc123",
      "title": "Acme Corporation",
      "text": "Technology company founded in 2020",
      "url": "https://app.attio.com/objects/companies/abc123"
    }
  ]
}
```

### Fetch Tool

Retrieves detailed information about a specific record.

**Arguments:**
- `id` (string, required): The record ID (format: `resourceType:recordId`)

**Returns:**
```json
{
  "metadata": {
    "id": "companies:abc123",
    "type": "company",
    "created_at": "2024-01-15T10:30:00Z",
    "modified_at": "2024-03-20T14:45:00Z"
  },
  "title": "Acme Corporation",
  "content": "Founded: 2020\nIndustry: Technology\nWebsite: https://acme.com\nEmployees: 50-100"
}
```

## Integration with ChatGPT

### Custom GPT Configuration

1. Create a new Custom GPT in ChatGPT
2. Add the following action schema:

```yaml
openapi: 3.1.0
info:
  title: Attio CRM Tools
  version: 1.0.0
servers:
  - url: http://localhost:3000
paths:
  /openai/tools:
    get:
      summary: List available tools
      responses:
        '200':
          description: List of tools
          content:
            application/json:
              schema:
                type: object
                properties:
                  tools:
                    type: array
                    items:
                      type: object
  /openai/execute:
    post:
      summary: Execute a tool
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                tool:
                  type: string
                  enum: [search, fetch]
                arguments:
                  type: object
      responses:
        '200':
          description: Tool execution result
          content:
            application/json:
              schema:
                type: object
```

### Using with OpenAI API

```python
import openai

# Configure client to use local endpoint
client = openai.OpenAI(
    api_key="dummy-key",  # Not used by local server
    base_url="http://localhost:3000/openai"
)

# Search for records
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Find tech companies"}],
    tools=[{
        "type": "function",
        "function": {
            "name": "search",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"}
                },
                "required": ["query"]
            }
        }
    }]
)
```

## Configuration Options

### Environment Variables

- `ENABLE_SSE_TRANSPORT`: Enable SSE transport and OpenAI endpoints (default: false)
- `HEALTH_PORT`: Port for HTTP server (default: 3000)
- `SSE_ENABLE_CORS`: Enable CORS headers (default: true)
- `SSE_HEARTBEAT_INTERVAL`: Heartbeat interval in ms (default: 30000)
- `SSE_CONNECTION_TIMEOUT`: Connection timeout in ms (default: 300000)
- `SSE_RATE_LIMIT_PER_MINUTE`: Rate limit per minute (default: 100)
- `SSE_MAX_CONNECTIONS`: Maximum concurrent connections (default: 1000)
- `SSE_ALLOWED_ORIGINS`: Comma-separated allowed origins (default: *)

### Security Considerations

For production use:

1. **Enable Authentication**: Set `SSE_REQUIRE_AUTH=true`
2. **Restrict Origins**: Set `SSE_ALLOWED_ORIGINS` to specific domains
3. **Use HTTPS**: Deploy behind a reverse proxy with SSL
4. **Rate Limiting**: Adjust `SSE_RATE_LIMIT_PER_MINUTE` as needed

## Troubleshooting

### Common Issues

1. **"SSE transport disabled"**
   - Solution: Set `ENABLE_SSE_TRANSPORT=true`

2. **CORS errors in browser**
   - Solution: Ensure `SSE_ENABLE_CORS=true` (default)
   - Check `SSE_ALLOWED_ORIGINS` configuration

3. **Search returns no results**
   - Verify Attio API key is set correctly
   - Check that records exist in your workspace
   - Try broader search terms

4. **Connection timeouts**
   - Increase `SSE_CONNECTION_TIMEOUT`
   - Check network connectivity

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development ENABLE_SSE_TRANSPORT=true attio-mcp
```

This will show detailed request/response logs.

## Next Steps

- **Phase 3**: OAuth authentication flow for secure ChatGPT integration
- **Phase 4**: Additional tools (create, update, delete operations)
- **Phase 5**: Webhook support for real-time updates

For more information, see:
- [SSE Transport Documentation](./sse-transport.md)
- [Universal Tools API Reference](./universal-tools/api-reference.md)
- [Phase 2 Completion Details](./phase2-completion.md)