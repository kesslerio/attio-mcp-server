# Attio MCP Integration Guide

This guide explains how to integrate the Attio MCP server with Claude to enable AI-assisted CRM interactions.

> **⚠️ Important**: If you encounter connection errors like "input_schema does not support oneOf, allOf, or anyOf at the top level", see the [MCP Schema Guidelines](../mcp-schema-guidelines.md).

## Prerequisites

- A valid Attio API key
- Claude desktop application or API access
- Node.js (v18 or higher) for running the MCP server

## Setup Steps

### 1. Install the Attio MCP Server

> ⚠️ **Note**: The npm package name is `attio-mcp` (not `attio-mcp-server`)

```sh
npm install attio-mcp
```

### 2. Configure Environment Variables

Create a `.env` file with your Attio API credentials:

```
ATTIO_API_KEY=your_api_key_here
```

### 3. Configure Claude Desktop

Add the following configuration to Claude Desktop:

```json
{
  "mcpServers": {
    "attio": {
      "command": "npx",
      "args": ["attio-mcp"],
      "env": {
        "ATTIO_API_KEY": "YOUR_ATTIO_API_KEY"
      }
    }
  }
}
```

### 4. Testing the Integration

To verify your setup, ask Claude a simple question about your Attio data:

```
Show me the most recent companies in our CRM
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your API key is correct
   - Check that the environment variables are properly loaded

2. **Connection Issues**
   - Ensure the MCP server is running
   - Check for network connectivity to Attio's API

3. **Rate Limiting**
   - The Attio API has rate limits that may affect performance
   - Consider implementing caching for frequently accessed data

## Best Practices

1. **Be Specific with Queries**
   - Provide Claude with specific search criteria
   - Reference records by name or URI when possible

2. **Leverage Conversation Context**
   - Claude remembers previously mentioned records
   - You can refer back to companies or people from earlier in the conversation

3. **Complex Workflows**
   - Break down complex tasks into smaller steps
   - Guide Claude through multi-step processes

## Using Docker

If you prefer to run the MCP server in Docker:

1. Pull the image:

   ```sh
   docker pull attio-mcp-server:latest
   ```

2. Run the container:

   ```sh
   docker run -p 3000:3000 \
     -e ATTIO_API_KEY=your_api_key_here \
     attio-mcp-server:latest
   ```

3. Configure Claude to use the containerized server:
   ```json
   {
     "mcpServers": {
       "attio": {
         "url": "http://localhost:3000"
       }
     }
   }
   ```

## Understanding the URI Scheme

Claude references Attio resources using the following URI format:

- Companies: `attio://companies/{company_id}`
- People: `attio://people/{person_id}`
- Lists: `attio://lists/{list_id}`

These URIs serve as persistent identifiers for records across conversations.

Resource IDs must be a single nonempty segment using letters, digits, `.`, `_`,
`~`, or `-`, and cannot be `.` or `..`. Paths, percent escapes, query strings,
and fragments are rejected.

`resources/read` returns JSON text and preserves the requested URI in
`contents[].uri`. Malformed, unsupported, or missing resources return a protocol
invalid-params error (`-32602`); the maintained SDK maps the internal legacy
resource-not-found code to this wire code for every supported protocol revision.
Access failures and upstream outages return a sanitized internal protocol error
(`-32603`). These are JSON-RPC errors, not tool `content`/`isError` results.
Resource errors do not include upstream response bodies or credentials.

`resources/list` currently queries companies, people, and lists. Every fetch must
succeed before it returns a catalog. Company and person queries are bounded to
20 records each: if either page is full, completeness is unproven and discovery
returns a protocol error instead of a partial catalog. Lists must carry confirmed
exhaustion from the list operation. A genuinely empty catalog still returns
`resources: []`. Discovery cursors, including an empty cursor, are unsupported
and rejected before an upstream request; no `nextCursor` is fabricated.

When discovery cannot establish a complete catalog, use `records_search` and
`lists_list` to find identifiers, then read an authorized URI directly. A listing
failure does not disable direct reads. This policy does not provide static,
CRM-independent resource discovery.

## Security Considerations

- Your Attio API key grants access to your CRM data
- Store API keys securely and never expose them in public code
- Consider using environment variables or a secrets manager
- Use Attio's permissions system to limit access as needed

## Claude Capabilities

When integrated with the Attio MCP server, Claude can:

1. **Search and Retrieve**
   - Find records by name, industry, email, etc.
   - Read detailed information about specific records

2. **Create and Update**
   - Add notes to records
   - Update record information

3. **List Management**
   - View list contents
   - Add/remove records from lists

4. **Data Analysis**
   - Summarize information across records
   - Generate insights from your CRM data

## Related Documentation

- [API Overview](./api-overview.md)
- [Companies API](./companies-api.md)
- [People API](./people-api.md)
- [Lists API](./lists-api.md)
