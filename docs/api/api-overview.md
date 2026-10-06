# Attio API Overview

✅ **Current Status**: Attio MCP Server implements **41 total tools** - 26 universal/OpenAI tools + 12 list tools + 3 workspace member tools

Attio provides a powerful REST API that allows developers to build applications that read and write information to and from Attio workspaces. The API exchanges JSON over HTTPS and provides comprehensive access to Attio's core functionality.

> **🚀 Universal Tools Available**: The MCP server provides Universal Tools that consolidate 40+ resource-specific operations into one resource-first catalog (`records_search`, `records_create`, and the other names in `src/constants/tool-names.ts`). List and workspace-member tools use the same vocabulary. `search`, `fetch`, and `aaa-health-check` are unchanged.

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

Claude can interact with Attio using **41 fully implemented tools** provided by the MCP server:

#### ✅ Core Universal Tools (13 tools)

- **`records_search`** - Universal search across companies, people, records, and tasks
- **`records_get_details`** - Retrieve detailed information for any record type
- **`companies_create`** - Create companies without selecting `resource_type`
- **`companies_update`** - Update companies without selecting `resource_type`
- **`deals_create`** - Create deals without selecting `resource_type`
- **`deals_update`** - Update deals without selecting `resource_type`
- **`records_create`** - Create new records across all resource types
- **`records_update`** - Update existing records with validation
- **`records_delete`** - Delete records across all resource types
- **`records_get_attributes`** - Get attribute definitions for resource types
- **`records_discover_attributes`** - Discover available attributes with examples
- **`records_get_info`** - Get specific info types (basic, contact, business, social)
- **`records_get_interactions`** - Get interaction metadata for people and companies

#### ✅ Advanced Universal Tools (6 tools)

- **`records_search_advanced`** - Complex filtering with multiple conditions
- **`records_search_by_relationship`** - Cross-resource relationship searches
- **`records_search_by_content`** - Content-based searches (notes, activity)
- **`records_search_by_timeframe`** - Time-based searches with date ranges
- **`records_batch`** - Bulk operations for multiple records
- **`records_batch_search`** - Bulk search operations

#### ✅ Note Tools (2 tools)

- **`notes_create`** - Create notes attached to any record type
- **`notes_list`** - List notes for specific records

#### ✅ Utility Tools (2 tools)

- **`records_get_attribute_options`** - Get valid options for select/status fields
- **`diagnostics_get`** - Debug tool for configuration validation

#### ✅ Special Tools (3 tools)

- **`aaa-health-check`** - Health monitoring endpoint
- **`openai-search`** - OpenAI integration search
- **`openai-fetch`** - OpenAI integration fetch

#### 📋 Lists Tools (12 tools) - Always Exposed

List-specific tools are always exposed alongside universal tools (Issue #470 - "Lists are relationship containers"):

- `lists_list`, `lists_get`, `list_entries_list`
- `list_entries_filter`, `list_entries_filter_advanced`
- `list_entries_add`, `list_entries_remove`, `list_entries_update`, `list_entries_manage`
- `list_entries_filter_by_parent`, `list_entries_filter_by_parent_id`
- `records_get_list_memberships`

These tools provide specialized list management capabilities beyond what universal tools offer. See [Lists API documentation](./lists.md) for details.

#### 👥 Workspace Member Tools (3 tools) - Always Exposed

Workspace member tools are always exposed for user discovery (Issue #684):

- `workspace_members_list` - Get all workspace members
- `workspace_members_search` - Search workspace members by name or email
- `workspace_members_get` - Get specific workspace member details

#### ⚠️ Legacy Tools (Deprecated)

Prior default-catalog names (for example `search_records` and `get-lists`) still call the canonical tool through v2.x. They are omitted from `tools/list`, they do not change arguments, and `MCP_DISABLE_TOOL_ALIASES=true` makes them fail. Historical names such as `create-record` and `search-records` do not resolve. See [MIGRATION-GUIDE.md](../MIGRATION-GUIDE.md).

**Current Tools**: All 41 tools (26 universal/OpenAI + 12 list + 3 workspace member) are fully implemented and tested.

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
