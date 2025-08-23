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
  TASKS = 'tasks',
  LISTS = 'lists',
  NOTES = 'notes'
}
```

## formatResult Architecture (Updated PR #483)

**IMPORTANT**: All universal tools now use consistent `formatResult` functions that always return strings. This eliminates dual-mode behavior and improves performance by 89.7%.

### Consistent formatResult Contract
```typescript
// All formatResult functions follow this pattern
formatResult: (data: AttioRecord | AttioRecord[], resourceType?: UniversalResourceType): string

// Performance optimized with:
// - No environment-dependent behavior
// - Type-safe Record<string, unknown> patterns  
// - Memory-efficient string templates
// - 59% ESLint warning reduction (957→395)
```

## Core Universal Tools (8 tools)

### 1. search-records

**Description**: Universal search across all resource types with flexible filtering.

**Consolidates**: `search-companies`, `search-people`, `list-records`, `list-tasks`

**Schema**:
```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  query?: string,                    // Search query string
  filters?: object,                  // Advanced filter conditions
  search_type?: 'basic' | 'content', // Search type (default: 'basic')
  fields?: string[],                 // Fields to search (content search only)
  match_type?: 'exact' | 'partial' | 'fuzzy', // Match type (default: 'partial')
  sort?: 'relevance' | 'created' | 'modified' | 'name', // Sort order (default: 'name')
  limit?: number,                    // Max results (1-100, default: 10)
  offset?: number                    // Pagination offset (default: 0)
}
```

**Examples**:
```typescript
// Basic search for companies
await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'tech startup',
  limit: 20
});

// Content search across multiple fields
await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'artificial intelligence',
  search_type: 'content',
  sort: 'relevance'
});

// Search people with filters
await client.callTool('search-records', {
  resource_type: 'people',
  query: 'john',
  filters: {
    and: [
      { attribute: 'industry', condition: 'equals', value: 'Technology' }
    ]
  }
});

// Partial match content search
await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'automat',
  search_type: 'content',
  match_type: 'partial'
});
```

### 2. get-record-details

**Description**: Get detailed information for any record type.

**Consolidates**: `get-company-details`, `get-person-details`, `get-record-details`, `get-task-details`

**Schema**:
```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  record_id: string,                 // Required - Record identifier
  fields?: string[]                  // Optional - Specific fields to include
}
```

**Examples**:
```typescript
// Get company details
await client.callTool('get-record-details', {
  resource_type: 'companies',
  record_id: 'comp_123'
});

// Get person details with specific fields
await client.callTool('get-record-details', {
  resource_type: 'people',
  record_id: 'person_456',
  fields: ['name', 'email', 'company']
});
```

### 3. create-record

**Description**: Create a new record of any supported type.

**Consolidates**: `create-company`, `create-person`, `create-record`, `create-task`

**Schema**:
```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  record_data: object,               // Required - Record creation data
  return_details?: boolean           // Optional - Return full record details
}
```

**Examples**:
```typescript
// Create company
await client.callTool('create-record', {
  resource_type: 'companies',
  record_data: {
    name: 'Acme Corp',
    website: 'https://acme.com',
    industry: 'Technology'
  }
});

// Create person
await client.callTool('create-record', {
  resource_type: 'people',
  record_data: {
    name: 'John Doe',
    email: 'john@acme.com',
    title: 'CEO'
  },
  return_details: true
});
```

### 4. update-record

**Description**: Update an existing record of any supported type.

**Consolidates**: `update-company`, `update-person`, `update-record`, `update-task`

**Schema**:
```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  record_id: string,                 // Required - Record identifier
  record_data: object,               // Required - Update data
  return_details?: boolean           // Optional - Return full record details
}
```

**Examples**:
```typescript
// Update company
await client.callTool('update-record', {
  resource_type: 'companies',
  record_id: 'comp_123',
  record_data: {
    industry: 'Fintech',
    employee_count: 50
  }
});
```

### 5. delete-record

**Description**: Delete a record of any supported type.

**Consolidates**: `delete-company`, `delete-person`, `delete-record`, `delete-task`

**Schema**:
```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  record_id: string                  // Required - Record identifier
}
```

**Examples**:
```typescript
// Delete company
await client.callTool('delete-record', {
  resource_type: 'companies',
  record_id: 'comp_123'
});
```

### 6. get-attributes

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
await client.callTool('get-attributes', {
  resource_type: 'companies'
});

// Get specific record attributes
await client.callTool('get-attributes', {
  resource_type: 'people',
  record_id: 'person_456',
  fields: ['name', 'email', 'company']
});
```

### 7. discover-attributes

**Description**: Discover available attributes for any resource type.

**Consolidates**: `discover-company-attributes`, `discover-person-attributes`, `discover-record-attributes`

**Schema**:
```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks' // Required
}
```

**Examples**:
```typescript
// Discover company attributes
await client.callTool('discover-attributes', {
  resource_type: 'companies'
});
```

### 8. get-detailed-info

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
await client.callTool('get-detailed-info', {
  resource_type: 'companies',
  record_id: 'comp_123',
  info_type: 'contact'
});

// Get company business info
await client.callTool('get-detailed-info', {
  resource_type: 'companies',
  record_id: 'comp_123',
  info_type: 'business'
});
```

## Advanced Universal Tools (5 tools)

### 9. advanced-search

**Description**: Complex searches with sorting and advanced filtering.

**Consolidates**: `advanced-search-companies`, `advanced-search-people`

**Schema**:
```typescript
{
  resource_type: 'companies' | 'people' | 'records' | 'tasks', // Required
  query?: string,                    // Search query string
  filters?: object,                  // Advanced filter conditions
  sort_by?: string,                  // Field to sort by
  sort_order?: 'asc' | 'desc',      // Sort direction
  limit?: number,                    // Max results (1-100, default: 10)
  offset?: number                    // Pagination offset (default: 0)
}
```

**Examples**:
```typescript
// Advanced company search with sorting
await client.callTool('advanced-search', {
  resource_type: 'companies',
  query: 'technology',
  filters: {
    and: [
      { attribute: 'employee_count', condition: 'greater_than', value: 100 }
    ]
  },
  sort_by: 'created_at',
  sort_order: 'desc',
  limit: 25
});
```

### 10. search-by-relationship

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
await client.callTool('search-by-relationship', {
  relationship_type: 'company_to_people',
  source_id: 'comp_123',
  limit: 50
});

// Find companies associated with a person
await client.callTool('search-by-relationship', {
  relationship_type: 'people_to_company',
  source_id: 'person_456'
});
```

### 11. search-by-content

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
await client.callTool('search-by-content', {
  resource_type: 'companies',
  content_type: 'notes',
  search_query: 'quarterly review'
});

// Search people by activity
await client.callTool('search-by-content', {
  resource_type: 'people',
  content_type: 'activity',
  search_query: 'demo scheduled'
});
```

### 12. search-by-timeframe

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
  limit?: number,                    // Max results (1-100, default: 10)
  offset?: number                    // Pagination offset (default: 0)
}
```

**Supported Date Formats** (v0.2.1+):
- ISO 8601: `'2024-01-01T00:00:00Z'`
- Relative expressions: `'today'`, `'yesterday'`, `'this week'`, `'last week'`, `'this month'`, `'last month'`, `'this year'`, `'last year'`
- Dynamic ranges: `'last N days'`, `'last N weeks'`, `'last N months'`

**Examples**:
```typescript
// Search people created in January 2024 (ISO format)
await client.callTool('search-by-timeframe', {
  resource_type: 'people',
  timeframe_type: 'created',
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-01-31T23:59:59Z'
});

// Search people created in the last 30 days (natural language)
await client.callTool('search-by-timeframe', {
  resource_type: 'people',
  timeframe_type: 'created',
  preset: 'last 30 days'
});

// Search companies modified this month
await client.callTool('search-by-timeframe', {
  resource_type: 'companies',
  timeframe_type: 'modified',
  preset: 'this month'
});

// Search companies by last interaction using relative dates
await client.callTool('search-by-timeframe', {
  resource_type: 'companies',
  timeframe_type: 'last_interaction',
  start_date: 'last 7 days',
  end_date: 'today'
});
```

### 13. batch-operations

**Description**: Bulk operations on multiple records.

**Consolidates**: `batch-create-companies`, `batch-update-companies`, `batch-delete-companies`, `batch-search-companies`, `batch-get-company-details`, `batch-create-records`, `batch-update-records`

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
await client.callTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'create',
  records: [
    { name: 'Company A', website: 'https://companya.com' },
    { name: 'Company B', website: 'https://companyb.com' }
  ]
});

// Batch get company details
await client.callTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'get',
  record_ids: ['comp_123', 'comp_456', 'comp_789']
});

// Batch search companies
await client.callTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'search',
  query: 'technology startup',
  limit: 50
});
```

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
{ condition: 'after' }     // Instead of greater_than_or_equals
{ condition: 'before' }    // Instead of less_than_or_equals
```

**❌ Incorrect**:
```typescript
{ condition: 'greater_than_or_equals' }  // Will cause API errors
{ condition: 'less_than_or_equals' }     // Will cause API errors
```

### Valid Date Presets
```typescript
'today', 'yesterday', 'this_week', 'last_week', 
'this_month', 'last_month', 'this_quarter', 'last_quarter', 
'this_year', 'last_year'

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
```typescript
{
  error: string,           // Error message
  code: string,           // Error code
  resource_type?: string, // Resource type if applicable
  operation?: string      // Operation that failed
}
```

## Testing and Mock Data

### Test Environment Behavior

When running in test environment (`NODE_ENV=test` or `VITEST=true`), the universal tools automatically use mock data instead of making real API calls:

```typescript
// Automatic mock data injection in test environment
await client.callTool('create-record', {
  resource_type: 'tasks',
  data: { content: 'Test task' }
});
// Returns: Mock task with proper Attio field format

// Special mock IDs trigger error scenarios
await client.callTool('get-record-details', {
  resource_type: 'tasks',
  record_id: 'mock-error-not-found'
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
- Default limit is 10, maximum is 100
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