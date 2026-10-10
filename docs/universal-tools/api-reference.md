# Universal Tools API Reference

Complete reference for all 13 universal tools that consolidate 40+ resource-specific operations. Each tool works across multiple resource types using parameter-based routing.

> **📝 Field Mapping Update**: Enhanced with Issue #473 improvements including corrected field mappings, category validation, special character preservation, and response normalization. See [Field Mapping Guide](../api/field-mapping-improvements.md) for details.

## Resource Types

All universal tools use the `resource_type` parameter to specify the target resource:

```typescript
enum UniversalResourceType {
  COMPANIES = 'companies',
  PEOPLE = 'people',
  RECORDS = 'records',
  DEALS = 'deals',
  TASKS = 'tasks',
  LISTS = 'lists',
  NOTES = 'notes',
}
```

`records_search`, `records_search_advanced`, `records_search_by_timeframe`, `records_get_details`, `records_create`, `records_update`, and `records_delete` also accept custom object slugs discovered into the mapping configuration, such as `funds` or `investment_opportunities`.

## formatResult Architecture (Updated PR #483)

See the [formatter contract](developer-guide.md#formatresult-architecture-update-pr-483)
for companion prose formatting.

## Core Universal Tools (8 tools)

### 1. records.search

**Description**: Universal search across all resource types with flexible filtering and intelligent query parsing for multi-field lookups.

**Consolidates**: `search-companies`, `search-people`, `list-records`, `list-tasks`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'deals' | 'tasks' | '<custom_object_slug>', // Required
  query?: string,                    // Smart query string (names, emails, phones, domains)
  filters?: object,                  // Advanced filter conditions
  search_type?: 'basic' | 'content', // Search type (default: 'basic')
  fields?: string[],                 // Fields to search (content search only)
  match_type?: 'exact' | 'partial' | 'fuzzy', // Match type (default: 'partial')
  sort?: 'relevance' | 'created' | 'modified' | 'name', // Sort order (default: 'name')
  limit?: number,                    // Max results (1-100; record-query defaults vary)
  offset?: number,                   // Pagination offset (default: 0)
  cursor?: string                    // See Collection Continuation
}
```

**Examples**:

```typescript
// Basic search for companies
await client.callTool('records.search', {
  resource_type: 'companies',
  query: 'tech startup',
  limit: 20,
});

// Multi-field people lookup (name + email handled automatically)
await client.callTool('records.search', {
  resource_type: 'people',
  query: 'Alex Rivera alex.rivera@example.com',
});

// Phone number search (normalizes formatting + country code)
await client.callTool('records.search', {
  resource_type: 'people',
  query: '555-010-4477',
});

// Domain-aware company search (extracts domains from queries/emails)
await client.callTool('records.search', {
  resource_type: 'companies',
  query: 'examplecorp.com',
});

// Content search across multiple fields
await client.callTool('records.search', {
  resource_type: 'companies',
  query: 'artificial intelligence',
  search_type: 'content',
  sort: 'relevance',
});

// Search people with filters
await client.callTool('records.search', {
  resource_type: 'people',
  query: 'john',
  filters: {
    and: [{ attribute: 'industry', condition: 'equals', value: 'Technology' }],
  },
});

// Partial match content search
await client.callTool('records.search', {
  resource_type: 'companies',
  query: 'automat',
  search_type: 'content',
  match_type: 'partial',
});
```

### 2. records.get_details

**Description**: Get detailed information for any record type.

**Consolidates**: `get-company-details`, `get-person-details`, `records.get_details`, `get-task-details`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'deals' | 'tasks' | '<custom_object_slug>', // Required
  record_id: string,                 // Required - Record identifier
  fields?: string[]                  // Optional - Specific fields to include
}
```

**Examples**:

```typescript
// Get company details
await client.callTool('records.get_details', {
  resource_type: 'companies',
  record_id: 'comp_123',
});

// Get custom object details
await client.callTool('records.get_details', {
  resource_type: 'funds',
  record_id: 'fund_123',
});

// Get person details with specific fields
await client.callTool('records.get_details', {
  resource_type: 'people',
  record_id: 'person_456',
  fields: ['name', 'email', 'company'],
});
```

### 3. records_create

**Description**: Create a new record of any supported type.

**Consolidates**: `create-company`, `create-person`, `create-record`, `create-task`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'deals' | 'tasks' | '<custom_object_slug>', // Required
  record_data: object,               // Required - Record creation data
  return_details?: boolean           // Optional - Return full record details
}
```

**Examples**:

```typescript
// Create company
await client.callTool('records_create', {
  resource_type: 'companies',
  record_data: {
    name: 'Acme Corp',
    website: 'https://acme.com',
    industry: 'Technology',
  },
});

// Create person
await client.callTool('records_create', {
  resource_type: 'people',
  record_data: {
    name: 'John Doe',
    email: 'john@acme.com',
    title: 'CEO',
  },
  return_details: true,
});

// Create a custom object record
await client.callTool('records_create', {
  resource_type: 'funds',
  record_data: {
    name: 'Fund I',
    stage: 'Active',
  },
});
```

### 4. records_update

**Description**: Update an existing record of any supported type.

**Consolidates**: `update-company`, `update-person`, `update-record`, `update-task`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'deals' | 'tasks' | '<custom_object_slug>', // Required
  record_id: string,                 // Required - Record identifier
  record_data: object,               // Required - Update data
  return_details?: boolean           // Optional - Return full record details
}
```

**Examples**:

```typescript
// Update company
await client.callTool('records_update', {
  resource_type: 'companies',
  record_id: 'comp_123',
  record_data: {
    industry: 'Fintech',
    employee_count: 50,
  },
});

// Update a custom object record
await client.callTool('records_update', {
  resource_type: 'funds',
  record_id: 'fund_123',
  record_data: {
    stage: 'Closed',
  },
});
```

### 5. records_delete

**Description**: Delete a record of any supported type.

**Consolidates**: `delete-company`, `delete-person`, `delete-record`, `delete-task`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'deals' | 'tasks' | '<custom_object_slug>', // Required
  record_id: string                  // Required - Record identifier
}
```

**Examples**:

```typescript
// Delete company
await client.callTool('records_delete', {
  resource_type: 'companies',
  record_id: 'comp_123',
});

// Delete a custom object record
await client.callTool('records_delete', {
  resource_type: 'funds',
  record_id: 'fund_123',
});
```

### 6. records.get_attributes

**Description**: Get attributes for any resource type.

**Consolidates**: `get-company-attributes`, `get-person-attributes`, `get-record-attributes`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  record_id?: string,                // Optional - Specific record
  categories?: string[],             // Optional - Attribute categories
  fields?: string[]                  // Optional - Specific fields
}
```

**Examples**:

```typescript
// Get all company attributes
await client.callTool('records.get_attributes', {
  resource_type: 'companies',
});

// Get specific record attributes
await client.callTool('records.get_attributes', {
  resource_type: 'people',
  record_id: 'person_456',
  fields: ['name', 'email', 'company'],
});
```

### 7. records.discover_attributes

**Description**: Discover available attributes for any resource type.

**Consolidates**: `discover-company-attributes`, `discover-person-attributes`, `discover-record-attributes`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks'; // Required
}
```

**Examples**:

```typescript
// Discover company attributes
await client.callTool('records.discover_attributes', {
  resource_type: 'companies',
});
```

### 8. records.get_info

**Description**: Get specific types of detailed information (contact, business, social).

**Consolidates**: `get-company-basic-info`, `get-company-contact-info`, `get-company-business-info`, `get-company-social-info`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  record_id: string,                 // Required - Record identifier
  info_type: 'contact' | 'business' | 'social' | 'basic' | 'custom' // Required
}
```

**Examples**:

```typescript
// Get company contact info
await client.callTool('records.get_info', {
  resource_type: 'companies',
  record_id: 'comp_123',
  info_type: 'contact',
});

// Get company business info
await client.callTool('records.get_info', {
  resource_type: 'companies',
  record_id: 'comp_123',
  info_type: 'business',
});
```

## Advanced Universal Tools (5 tools)

### 9. records.search_advanced

**Description**: Nested attribute filtering for companies, people, deals, records, and configured custom objects. Basic task/list routes ignore filters; notes use only parent-object and parent-record filters, not nested groups. `sort_by` and `sort_order` are accepted but ignored; results use provider order. Timeframe routes reject modified/updated searches for people and companies and do not combine attribute filters or text queries.

**Consolidates**: `records.search_advanced-companies`, `records.search_advanced-people`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  query?: string,                    // Search query string
  filters?: object,                  // Advanced filter conditions
  sort_by?: string,                  // Accepted but ignored
  sort_order?: 'asc' | 'desc',      // Accepted but ignored
  limit?: number,                    // Max results (1-100; see Collection Continuation defaults)
  offset?: number,                   // Pagination offset (default: 0)
  cursor?: string                    // See Collection Continuation
}
```

**Examples**:

```typescript
// Advanced company search
await client.callTool('records.search_advanced', {
  resource_type: 'companies',
  query: 'technology',
  filters: {
    and: [
      { attribute: 'employee_count', condition: 'greater_than', value: 100 },
    ],
  },
  limit: 25,
});
```

### 10. records.search_by_relationship

**Description**: Cross-resource relationship searches.

**Consolidates**: `search-companies-by-people`, `search-people-by-company`

**Schema**:

```typescript
{
  relationship_type: 'company_to_people' | 'people_to_company' | 'person_to_tasks' | 'company_to_tasks', // Required
  source_id: string,                 // Required - Source record ID
  target_resource_type?: 'companies' | 'people' | 'records' | 'tasks', // Optional
  limit?: number,                    // Max results (1-100, default: 10)
  offset?: number                    // Pagination offset (default: 0)
}
```

**Examples**:

```typescript
// Find people at a company
await client.callTool('records.search_by_relationship', {
  relationship_type: 'company_to_people',
  source_id: 'comp_123',
  limit: 50,
});

// Find companies associated with a person
await client.callTool('records.search_by_relationship', {
  relationship_type: 'people_to_company',
  source_id: 'person_456',
});
```

### 11. records.search_by_content

**Description**: Content-based searches (notes, activity, interactions).

**Consolidates**: `search-companies-by-notes`, `search-people-by-notes`, `search-people-by-activity`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  content_type: 'notes' | 'activity' | 'interactions',        // Required
  search_query: string,              // Required - Cannot be empty
  limit?: number,                    // Max results (1-100, default: 10)
  offset?: number                    // Pagination offset (default: 0)
}
```

**Examples**:

```typescript
// Search companies by notes
await client.callTool('records.search_by_content', {
  resource_type: 'companies',
  content_type: 'notes',
  search_query: 'quarterly review',
});

// Search people by activity
await client.callTool('records.search_by_content', {
  resource_type: 'people',
  content_type: 'activity',
  search_query: 'demo scheduled',
});
```

### 12. records.search_by_timeframe

**Description**: Time-based searches with date ranges. Supports natural language date expressions (v0.2.1+).

**Consolidates**: `search-people-by-creation-date`, `search-people-by-modification-date`, `search-people-by-last-interaction`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  timeframe_type: 'created' | 'modified' | 'last_interaction', // Required
  start_date?: string,               // ISO 8601 or relative date (e.g., "last 7 days")
  end_date?: string,                 // ISO 8601 or relative date (e.g., "yesterday")
  preset?: string,                   // Date preset or relative expression (e.g., "this_month", "last 30 days")
  limit?: number,                    // Max results (1-100; see Collection Continuation defaults)
  offset?: number,                   // Pagination offset (default: 0)
  cursor?: string                    // See Collection Continuation
}
```

`modified` remains part of the public vocabulary for backward compatibility, but Attio does not expose a live filterable modified timestamp for people or companies. Those requests now fail explicitly instead of returning a false empty result.

**Supported Date Formats** (v0.2.1+):

- ISO 8601: `'2024-01-01T00:00:00Z'`
- Relative expressions: `'today'`, `'yesterday'`, `'this week'`, `'last week'`, `'this month'`, `'last month'`, `'this year'`, `'last year'`
- Dynamic ranges: `'last N days'`, `'last N weeks'`, `'last N months'`

**Examples**:

```typescript
// Search people created in January 2024 (ISO format)
await client.callTool('records.search_by_timeframe', {
  resource_type: 'people',
  timeframe_type: 'created',
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-01-31T23:59:59Z',
});

// Search people created in the last 30 days (natural language)
await client.callTool('records.search_by_timeframe', {
  resource_type: 'people',
  timeframe_type: 'created',
  preset: 'last 30 days',
});

// Search companies with interactions after January 1, 2024
await client.callTool('records.search_by_timeframe', {
  resource_type: 'companies',
  timeframe_type: 'last_interaction',
  start_date: '2024-01-01T00:00:00Z',
});

// Search companies by last interaction using relative dates
await client.callTool('records.search_by_timeframe', {
  resource_type: 'companies',
  timeframe_type: 'last_interaction',
  start_date: 'last 7 days',
  end_date: 'today',
});
```

### 13. records.batch

**Description**: Bulk operations on multiple records.

**Consolidates**: `batch-create-companies`, `batch-update-companies`, `batch-delete-companies`, `records.search_batch-companies`, `batch-get-company-details`, `batch-create-records`, `batch-update-records`

**Schema**:

```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  operation_type: 'create' | 'update' | 'delete' | 'search' | 'get', // Required
  records?: Array<object>,           // For create/update operations
  record_ids?: string[],             // For get/delete operations
  query?: string,                    // For search operations (required, cannot be empty)
  limit?: number,                    // Max results (1-50, default: 10)
  offset?: number                    // Pagination offset (default: 0)
}
```

**Examples**:

```typescript
// Batch create companies
await client.callTool('records.batch', {
  resource_type: 'companies',
  operation_type: 'create',
  records: [
    { name: 'Company A', website: 'https://companya.com' },
    { name: 'Company B', website: 'https://companyb.com' },
  ],
});

// Batch get company details
await client.callTool('records.batch', {
  resource_type: 'companies',
  operation_type: 'get',
  record_ids: ['comp_123', 'comp_456', 'comp_789'],
});

// Batch search companies
await client.callTool('records.batch', {
  resource_type: 'companies',
  operation_type: 'search',
  query: 'technology startup',
  limit: 50,
});
```

## Collection Continuation (U5)

Collection tools return a `{ data, count, next_cursor, pagination? }`
envelope. `count` measures this response. `next_cursor` is an opaque,
versioned token sealed with authenticated encryption under an ephemeral server
key; it is bound to the effective credential scope, the canonical operation,
the resource, the query shape (filters, sorts, projections), and the page size.
Tokens expire after 30 minutes, become invalid when the server restarts, and
grant no permission: verification uses the caller's current credential scope
before any Attio request, and Attio still authorizes that request. Tokens are
bounded to 512 characters. A non-null token is the continuation signal. A null
token means exhaustion only when `pagination.supported` is true and
`pagination.truncated` is false.

**Supported continuation** (offset-backed query paths): `records_search`,
`records_search_advanced`, `records_search_by_timeframe`, `notes_list`, and
`list_entries_list`. Supported record query and list-entry paths fetch one lookahead item ahead of the returned page; notes use bounded offset lookahead and preserve native cursors when provided,
so a token is only issued on reliable continuation evidence and a returned
page never drops the sentinel item — the next page refetches it. Relative date
queries bind their resolved dates; replay is rejected when the relative range
resolves to different dates.

**Bounded families** (finite or ranked) return `next_cursor: null` plus
`pagination: { supported: false, truncated: <boolean> }`. `truncated: true`
means results were withheld or upstream completeness could not be established;
`truncated: false` affirms no bounded results were withheld. On these families
null never proves the upstream dataset was complete. Caps are documented per
tool: `records_search` caps pages at 100 items; companies, deals, and custom
objects default to 20, people to 100, and generic records and relationship/timeframe
query routes within `records_search` to 10. `records_search_by_timeframe` and
`notes_list` default to 20; notes accept up to 100 per returned page.
`list_entries_list` defaults to 20. `lists_list`
and `workspace_members_list` return their complete directory inventories;
ranked text/content searches and task/list/note aggregates do not support continuation;
attribute metadata inventories are finite per object. Task searches disclose slices
of the upstream inventory capped at 500 tasks. At the record offset cap of 10000,
further results return no cursor and `truncated: true`.

Continuation rules:

- Pass the sealed token back as `cursor` on the next call; never combine
  `cursor` with `offset` (the request is rejected before any API call).
- Reuse the token only for the same query: same resource, filters, sorts, projections, and
  page size. A mismatch fails with the stable `INVALID_CURSOR` code before any
  Attio request. Start again from a fresh first page after this error.
- Offset pagination is a live view, not a snapshot: concurrent writes can
  shift or repeat items across pages. Deduplicate by record identifier when
  your consumer needs stability.
- Tokens carry no raw credentials or filter values — only keyed fingerprints —
  and a token issued under one tenant's credentials fails under another's.

## Capability Discovery: `capabilities_get` (U7)

The permitted capability manifest answers "what can this server do" without a
trial call. It is a projection of the same registry `tools/list` reads, so the
names and schemas can never disagree with the advertised surface.

```json
// tools/call capabilities_get -> structuredContent.data
{
  "schemaVersion": 1,
  "mode": "full",
  "toolCount": 46,
  "authorization": {
    "enforcedAt": "call-time",
    "publishesCredentialGrants": false,
    "note": "Entries describe configured functionality..."
  },
  "tools": [
    {
      "name": "records_search",
      "description": "Search across companies, people, deals, tasks, and records. ...",
      "inputSchema": { "type": "object", "properties": { "...": {} } },
      "outputSchema": { "$schema": "http://json-schema.org/draft-07/schema#" },
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "operation": {
        "action": "search",
        "resourceTypes": ["companies", "people", "deals", "tasks", "lists", "records", "notes"],
        "customObjectSlugs": true,
        "authRequired": true,
        "readOnly": true,
        "destructive": false,
        "idempotent": true,
        "pagination": { "kind": "cursor", "supported": false, "cap": 100 }
      },
      "guidance": {
        "capability": "Find records across any supported object type.",
        "boundaries": "create or modify records, or return more than one page per call.",
        "constraints": "Continuation is conditional on route; defaults vary by resource ...",
        "recovery": "If attributes are unknown or a page is empty, discover searchable fields.",
        "alternatives": ["records_search_advanced", "records_get_details", "search"],
        "summary": "Find records across any supported object type. Never ..."
      }
    }
  ]
}
```

Reading the fields:

| Field | What a selector can rely on |
| --- | --- |
| `operation.action` | `read`, `search`, `metadata`, `diagnostic`, `write`, `merge`, or `batch`. |
| `operation.resourceTypes` | Canonical object slugs. `customObjectSlugs: true` means discovered slugs such as `funds` are accepted. |
| `operation.readOnly` | Whether the operation can change workspace state. Mixed batches are `false`. |
| `operation.destructive` / `idempotent` | Whether a repeat is safe, and whether the operation is irreversible. |
| `operation.authRequired` | `false` only for the static probes (`aaa-health-check`, `diagnostics_get`, `capabilities_get`). |
| `operation.pagination` | `kind` is `none`, `offset`, `cursor`, or `page`; `cap` is the documented page limit. `supported: false` is conservative when support depends on the route; consult guidance and response pagination. |
| `guidance` | Capability, boundaries, limits, recovery, and the catalog names that serve the same need. |

Schema documents are carried as data, so the manifest stays finite even where a
tool's output schema describes the same envelope the manifest itself uses.

**Modes.** `capabilities_get` is advertised in full mode only. In
`ATTIO_MCP_TOOL_MODE=search`, the permitted set is `search`, `fetch`, and
`aaa-health-check`, and `aaa-health-check` returns that set as
`data.capabilities`, projected to its operation sections with
`projection.schemaSource: "tools/list"`. Names and facts cover only the permitted
set; schema documents come from `tools/list`. In full mode the schema source is
`capabilities_get`, which accepts no selectors and publishes the complete manifest.

**What it is not.** It publishes configured functionality, never what a
particular credential may do, and it never lists workspace objects. Reads and
writes enforce authorization the same way whether or not a tool was advertised.

## Parameter Validation Rules

### Required Parameters

- All tools require `resource_type`
- Record operations require `record_id`
- Create/update operations require `record_data`
- Content searches require non-empty `search_query`

### Date Operators ⚠️

Use correct operators for date filtering:

**✅ Correct**:

```typescript
{
  condition: 'after';
} // Instead of greater_than_or_equals
{
  condition: 'before';
} // Instead of less_than_or_equals
```

**❌ Incorrect**:

```typescript
{
  condition: 'greater_than_or_equals';
} // Will cause API errors
{
  condition: 'less_than_or_equals';
} // Will cause API errors
```

### Valid Date Presets

```typescript
('today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'this_quarter',
  'last_quarter',
  'this_year',
  'last_year');

// ❌ Invalid: 'last_30_days'
```

### Batch Operation Limits

- Maximum 50 records per batch operation
- Built-in rate limiting with 100ms delays
- Maximum 5 concurrent requests
- Error isolation - individual failures don't stop the batch

### Query Requirements

- Search queries **cannot be empty strings**
- Use meaningful search terms
- Content searches require specific, non-generic queries

## Error Handling

### Common Error Types

1. **Invalid Resource Type**

   ```
   Error: Invalid resource type: 'invalid_type'
   ```

2. **Missing Required Parameters**

   ```
   Error: Missing required parameter: record_id
   ```

3. **Invalid Date Operators**

   ```
   Error: Invalid operator: $greater_than_or_equals
   ```

4. **Empty Query Strings**

   ```
   Error: Search query cannot be empty
   ```

5. **Invalid Date Presets**
   ```
   Error: Invalid date preset: "last_30_days"
   ```

### Error Response Format

See the authoritative [structured-results contract](developer-guide.md#structured-results-v2-boundary-a)
for execution-error envelopes and protocol-error semantics.

## Testing and Mock Data

### Test Environment Behavior

When running in test environment (`NODE_ENV=test` or `VITEST=true`), the universal tools automatically use mock data instead of making real API calls:

```typescript
// Automatic mock data injection in test environment
await client.callTool('records_create', {
  resource_type: 'tasks',
  data: { content: 'Test task' },
});
// Returns: Mock task with proper Attio field format

// Special mock IDs trigger error scenarios
await client.callTool('records.get_details', {
  resource_type: 'tasks',
  record_id: 'mock-error-not-found',
});
// Returns: Error with "Record not found" message
```

### Mock Data Format

Mock data follows the Attio field format with dual access patterns:

```typescript
{
  id: {
    record_id: 'mock-task-123',
    task_id: 'mock-task-123',      // Resource-specific ID
    workspace_id: 'mock-workspace'
  },
  // Nested format (Attio API standard)
  values: {
    content: [{ value: 'Task content' }],
    status: [{ value: 'pending' }]
  },
  // Flattened format (backward compatibility)
  content: 'Task content',
  status: 'pending'
}
```

### Error Testing

Use special mock IDs to test error handling:

- `mock-error-not-found`: Triggers 404 not found error
- `mock-error-unauthorized`: Triggers 401 unauthorized error
- `mock-error-invalid`: Triggers 400 invalid request error

## Performance Guidelines

### Pagination

- Use `limit` and `offset` for large result sets
- See [Collection Continuation](#collection-continuation-u5) for limits and defaults
- For batch operations, maximum limit is 50

### Batch Operations

- Prefer batch operations for multiple records
- Built-in rate limiting prevents API throttling
- Error isolation ensures partial success handling

### Field Selection

- Use `fields` parameter to limit returned data
- Reduces response size and improves performance
- Especially important for record details

### Filtering

- Use `filters` for precise searches instead of broad queries
- Combine multiple conditions with `and`/`or` operators
- Date range filtering is optimized for performance

## Next Steps

- **Migrating?** → See [Migration Guide](migration-guide.md)
- **Need examples?** → Check [User Guide](user-guide.md)
- **Having issues?** → Visit [Troubleshooting](troubleshooting.md)
- **Want to extend?** → Review [Developer Guide](developer-guide.md)

## Structured universal read and batch results (v2 U3)

See the authoritative [structured universal reads and batches contract](developer-guide.md#structured-universal-reads-and-batches-v2-boundary-c)
for output schemas, per-family projections, ordered batch outcomes, and recovery
semantics.
