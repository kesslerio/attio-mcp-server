# Attio API Overview

✅ **Current Status**: Attio MCP Server implements **32 total tools** - 21 universal tools + 11 list-specific tools

Attio provides a powerful REST API that allows developers to build applications that read and write information to and from Attio workspaces. The API exchanges JSON over HTTPS and provides comprehensive access to Attio's core functionality.

> **🚀 Universal Tools Available**: The MCP server provides Universal Tools that consolidate 40+ resource-specific operations into 21 powerful tools (using MCP-compliant `snake_case`, verb-first naming). List-specific operations are available through 11 dedicated list tools. This provides better performance, consistent APIs, and simplified integration.

## Understanding the Model Context Protocol (MCP)

The Attio MCP server acts as a bridge between Claude (or other AI assistants) and the Attio API. This integration allows Claude to interact with your CRM data without requiring you to manually copy and paste information.

### How MCP Works

1. **Request Flow**: When you ask Claude about Attio data, Claude sends a structured request to the Attio MCP server
2. **Authentication**: The MCP server authenticates with Attio using your API key
3. **Data Retrieval**: The server fetches the requested data from Attio's API
4. **Response**: Claude receives the data and presents it to you in a conversational format

### URI Scheme

The Attio MCP server uses a custom URI scheme to identify resources:

- Companies: `attio://companies/{company_id}`
- People: `attio://people/{person_id}`
- Lists: `attio://lists/{list_id}`
- Notes: `attio://notes/{note_id}`

Claude uses these URIs to reference specific records when performing operations.

### Available Tools

Claude can interact with Attio using **32 fully implemented tools** provided by the MCP server:

#### ✅ Core Universal Tools (8 tools)

- **`search_records`** - Universal search across companies, people, records, and tasks
- **`get_record_details`** - Retrieve detailed information for any record type
- **`create_record`** - Create new records across all resource types
- **`update_record`** - Update existing records with validation
- **`delete_record`** - Delete records across all resource types
- **`get_record_attributes`** - Get attribute definitions for resource types
- **`discover_record_attributes`** - Discover available attributes with examples
- **`get_record_info`** - Get specific info types (basic, contact, business, social)

#### ✅ Advanced Universal Tools (6 tools)

- **`search_records_advanced`** - Complex filtering with multiple conditions
- **`search_records_by_relationship`** - Cross-resource relationship searches
- **`search_records_by_content`** - Content-based searches (notes, activity)
- **`search_records_by_timeframe`** - Time-based searches with date ranges
- **`batch_records`** - Bulk operations for multiple records
- **`batch_search_records`** - Bulk search operations

#### ✅ Note Tools (2 tools)

- **`create_note`** - Create notes attached to any record type
- **`list_notes`** - List notes for specific records

#### ✅ Utility Tools (2 tools)

- **`get_record_attribute_options`** - Get valid options for select/status fields
- **`smithery_debug_config`** - Debug tool for configuration validation

#### ✅ Special Tools (3 tools)

- **`aaa-health-check`** - Health monitoring endpoint
- **`openai-search`** - OpenAI integration search
- **`openai-fetch`** - OpenAI integration fetch

#### 📋 Lists Tools (11 tools) - Separate Category

List-specific tools remain available as a separate category (not part of universal tools):

- `get-lists`, `get-list-details`, `get-list-entries`
- `filter-list-entries`, `advanced-filter-list-entries`
- `add-record-to-list`, `remove-record-from-list`, `update-list-entry`
- `filter-list-entries-by-parent`, `filter-list-entries-by-parent-id`
- `get-record-list-memberships`

These tools provide specialized list management capabilities beyond what universal tools offer. See [Lists API documentation](./lists.md) for details.

#### ⚠️ Legacy Tools (Deprecated)

Old tool names (e.g., `records_search`, `create-record`) are deprecated but work via backward-compatible aliases until v2.0.0 (Q1 2026). Migration to new MCP-compliant names is recommended.

**Current Tools**: All 32 tools (21 universal + 11 list-specific) are fully implemented and tested.

### Advanced Filtering Capabilities

The Attio MCP server provides multiple filtering methods:

- **Basic filtering**: Simple text-based searches for names, emails, etc.
- **Advanced filtering**: Complex filter conditions with multiple attributes and logic
- **Date and numeric filtering**: Filter by dates and numeric values with range support
- **Activity filtering**: Find records based on interaction history and activity
- **Relationship filtering**: Find records based on their relationships with other records

For details, see:

- [Advanced Filtering Guide](./advanced-filtering.md)
- [Date and Numeric Filtering](./date-numeric-filtering.md)
- [Activity and Historical Filtering](./activity-historical-filtering.md)
- [Relationship-Based Filtering](./relationship-filtering.md)

## Authentication

### API Keys

For personal or internal use, you can use API keys to authenticate:

```
Authorization: Bearer your_api_key_here
```

### OAuth 2.0

For multi-workspace applications, Attio supports OAuth 2.0:

- **Authorization Endpoint**: `https://app.attio.com/authorize`
- **Token Endpoint**: `https://app.attio.com/oauth/token`

Required scopes vary by endpoint and are documented in the reference documentation.

## Core Concepts

### Objects and Lists

Attio's data model is built around Objects (like Companies, People) and Lists that organize records.

- Objects define the structure of your data (schema)
- Lists provide views and organization of records
- Records are instances of objects with specific attribute values

### Standard Objects

Attio includes several standard objects:

- Companies
- People
- Opportunities
- Tasks
- Notes
- Workspaces
- Users

### API Endpoints

The API is organized into functional areas:

- **Objects**: Create, read, update, delete objects and their attributes
- **Lists**: Manage lists and list entries
- **Records**: Create, read, update, delete records
- **People**: Manage person records
- **Tasks**: Manage tasks and assignments
- **Notes**: Create and manage notes attached to records
- **Users**: Manage workspace users and permissions
- **Webhooks**: Subscribe to real-time events

## Base URL

All API requests should be directed to:

```
https://api.attio.com/v2/
```

## Rate Limits

The Attio API imposes rate limits to ensure stability. Current limits are:

- 100 requests per minute per API key
- 1,000 requests per hour per API key

## Response Format

All responses are in JSON format. A typical successful response includes:

```json
{
  "data": {},
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 100
  }
}
```

## Error Handling

Error responses include a status code, error type, and error message:

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "The requested resource was not found"
  }
}
```

Common error status codes:

- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Pagination

API endpoints that return lists of items support pagination with the following parameters:

- `page`: The page number to retrieve (starting at 1)
- `pageSize`: The number of items per page (default 25, max 100)

## References

For detailed information about specific endpoints, refer to the following documentation:

- [Tasks API Documentation](./tasks-api.md)
- [Objects API Documentation](./objects-api.md)
- [Lists API Documentation](./lists-api.md)
- [Records API Documentation](./records-api.md)
- [People API Documentation](./people-api.md)
- [Notes API Documentation](./notes-api.md)
