# Universal Tools Troubleshooting Guide

Common issues, solutions, and frequently asked questions for the universal tools system.

## Common Errors and Solutions

### 1. Parameter Validation Errors

#### Error: "Missing required parameter: resource_type"

**Cause**: The `resource_type` parameter is required for all universal tools.

**Solution**:
```typescript
// ❌ Wrong - missing resource_type
await client.callTool('search-records', {
  query: 'tech startup'
});

// ✅ Correct - includes resource_type
await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'tech startup'
});
```

#### Error: "Invalid resource type: 'invalid_type'"

**Cause**: The provided resource type is not supported.

**Valid resource types**:
- `companies`
- `people`
- `records`
- `tasks`

**Solution**:
```typescript
// ❌ Wrong - invalid resource type
await client.callTool('search-records', {
  resource_type: 'contacts',  // Invalid
  query: 'john'
});

// ✅ Correct - valid resource type
await client.callTool('search-records', {
  resource_type: 'people',    // Valid
  query: 'john'
});
```

### 2. Date and Time Errors

#### Error: "Invalid operator: $greater_than_or_equals"

**Cause**: Using deprecated date operators that are no longer supported by the Attio API.

> ⚠️ **BREAKING CHANGE**: Date operators were changed in PR #367 for Attio API compatibility.

**Solution**: Use the new date operators:
```typescript
// ❌ Wrong - deprecated operators (will cause API errors)
{
  filters: {
    and: [
      { 
        attribute: 'created_at', 
        condition: FilterConditionType.GREATER_THAN_OR_EQUALS, 
        value: '2024-01-01' 
      }
    ]
  }
}

// ✅ Correct - new operators (Attio API compatible)
{
  filters: {
    and: [
      { 
        attribute: 'created_at', 
        condition: FilterConditionType.AFTER, 
        value: '2024-01-01T00:00:00Z' 
      }
    ]
  }
}
```

**Complete Date Operator Migration Table**:

| ❌ Old (Deprecated) | ✅ New (Required) | Use Case | Example |
|-------------------|-------------------|----------|---------|
| `GREATER_THAN_OR_EQUALS` | `AFTER` | Records created on or after date | Created after Jan 1, 2024 |
| `LESS_THAN_OR_EQUALS` | `BEFORE` | Records created on or before date | Created before Dec 31, 2024 |
| `GREATER_THAN` | `AFTER` | Records created after date | Created after yesterday |
| `LESS_THAN` | `BEFORE` | Records created before date | Created before today |

**Migration Examples by Tool**:

```typescript
// search-by-timeframe tool
// ❌ OLD (will fail)
{
  resource_type: 'companies',
  timeframe_type: 'created',
  date_range: {
    condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
    start_date: '2024-01-01'
  }
}

// ✅ NEW (correct)
{
  resource_type: 'companies', 
  timeframe_type: 'created',
  date_range: {
    condition: FilterConditionType.AFTER,
    start_date: '2024-01-01T00:00:00Z'
  }
}

// advanced-search tool with date filters
// ❌ OLD (will fail)
{
  resource_type: 'people',
  filters: {
    and: [
      { 
        attribute: 'last_contacted', 
        condition: FilterConditionType.LESS_THAN_OR_EQUALS, 
        value: '2024-06-01' 
      }
    ]
  }
}

// ✅ NEW (correct)
{
  resource_type: 'people',
  filters: {
    and: [
      { 
        attribute: 'last_contacted', 
        condition: FilterConditionType.BEFORE, 
        value: '2024-06-01T23:59:59Z' 
      }
    ]
  }
}
```

#### Error: "Invalid date preset: 'last_30_days'"

**Cause**: Using an invalid date preset value.

> ⚠️ **BREAKING CHANGE**: Only specific preset values are supported by the Attio API.

**Complete Valid Date Presets List**:

| ✅ Valid Preset | Description | Example Date Range |
|----------------|-------------|-------------------|
| `today` | Current day | Today 00:00 - 23:59 |
| `yesterday` | Previous day | Yesterday 00:00 - 23:59 |
| `this_week` | Current week (Mon-Sun) | This Monday - This Sunday |
| `last_week` | Previous week | Last Monday - Last Sunday |
| `this_month` | Current month | Month start - Month end |
| `last_month` | Previous month | Last month start - Last month end |
| `this_quarter` | Current quarter (Q1/Q2/Q3/Q4) | Quarter start - Quarter end |
| `last_quarter` | Previous quarter | Last quarter start - Last quarter end |
| `this_year` | Current year | Jan 1 - Dec 31 current year |
| `last_year` | Previous year | Jan 1 - Dec 31 previous year |

**❌ Common Invalid Presets** (will cause errors):
- `last_30_days` → Use `last_month` instead
- `last_7_days` → Use `last_week` instead  
- `past_week` → Use `last_week` instead
- `past_month` → Use `last_month` instead
- `this_quarter` → Use `this_quarter` (already valid)
- `current_year` → Use `this_year` instead

**Solution Examples**:
```typescript
// ❌ Wrong - invalid preset
{
  resource_type: 'companies',
  timeframe_type: 'created',
  preset: 'last_30_days'  // Invalid - will throw error
}

// ✅ Correct - valid preset
{
  resource_type: 'companies',
  timeframe_type: 'created', 
  preset: 'last_month'     // Valid - covers similar timeframe
}

// ❌ Wrong - another invalid preset
{
  resource_type: 'people',
  timeframe_type: 'modified',
  preset: 'past_week'      // Invalid
}

// ✅ Correct - valid preset
{
  resource_type: 'people',
  timeframe_type: 'modified',
  preset: 'last_week'      // Valid
}

// For custom date ranges, use explicit dates instead of presets
{
  resource_type: 'companies',
  timeframe_type: 'created',
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-01-30T23:59:59Z'  // Custom 30-day range
}
```

**Migration Guide for Common Invalid Presets**:

```typescript
// Convert common invalid presets to valid alternatives
const presetMigrationMap = {
  'last_30_days': 'last_month',
  'last_7_days': 'last_week', 
  'past_week': 'last_week',
  'past_month': 'last_month',
  'current_year': 'this_year',
  'current_month': 'this_month',
  'current_week': 'this_week'
};

// Usage in migration
function migratePreset(oldPreset: string): string {
  return presetMigrationMap[oldPreset] || oldPreset;
}
```

### 3. Query and Search Errors

#### Error: "Search query cannot be empty"

**Cause**: Providing an empty string or undefined value for search queries.

**Solution**:
```typescript
// ❌ Wrong - empty query
await client.callTool('search-records', {
  resource_type: 'companies',
  query: ''  // Empty string not allowed
});

await client.callTool('search-by-content', {
  resource_type: 'people',
  content_type: 'notes',
  search_query: ''  // Empty string not allowed
});

// ✅ Correct - meaningful query
await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'technology startup'  // Meaningful search term
});

await client.callTool('search-by-content', {
  resource_type: 'people',
  content_type: 'notes',
  search_query: 'quarterly review'  // Specific search term
});
```

#### Error: "No results found"

**Cause**: Search criteria too restrictive or no matching records exist.

**Debugging steps**:

1. **Broaden the search**:
```typescript
// Try broader search terms
await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'tech'  // Broader than 'technology startup fintech AI'
});
```

2. **Remove filters temporarily**:
```typescript
// Search without filters first
await client.callTool('advanced-search', {
  resource_type: 'companies',
  query: 'technology'
  // Remove filters temporarily
});
```

3. **Check resource type**:
```typescript
// Make sure you're searching the right resource type
await client.callTool('search-records', {
  resource_type: 'people',  // Maybe it's people, not companies
  query: 'john doe'
});
```

### 4. Batch Operation Errors

#### Error: "Batch size exceeds maximum allowed (50)"

**Cause**: Trying to process more than 50 records in a single batch operation.

**Solution**: Split into smaller batches:
```typescript
// ❌ Wrong - too many records
await client.callTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'create',
  records: arrayOf100Records  // Too many
});

// ✅ Correct - split into batches
const batchSize = 25;
const batches = chunkArray(records, batchSize);

for (const batch of batches) {
  await client.callTool('batch-operations', {
    resource_type: 'companies',
    operation_type: 'create', 
    records: batch
  });
  
  // Optional: Add delay between batches
  await new Promise(resolve => setTimeout(resolve, 100));
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

#### Error: "Operation type 'invalid_op' not supported"

**Cause**: Using an invalid operation type for batch operations.

**Valid operation types**:
- `create` - Create multiple records
- `update` - Update multiple records  
- `delete` - Delete multiple records
- `search` - Search with multiple queries
- `get` - Get details for multiple records

**Solution**:
```typescript
// ❌ Wrong - invalid operation type
await client.callTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'duplicate',  // Invalid
  record_ids: ['comp_1', 'comp_2']
});

// ✅ Correct - valid operation type
await client.callTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'get',        // Valid
  record_ids: ['comp_1', 'comp_2']
});
```

### 5. Relationship Search Errors

#### Error: "Invalid relationship type: 'invalid_relationship'"

**Cause**: Using an unsupported relationship type.

**Valid relationship types**:
- `company_to_people` - Find people at a company
- `people_to_company` - Find companies associated with a person
- `person_to_tasks` - Find tasks assigned to a person
- `company_to_tasks` - Find tasks related to a company

**Solution**:
```typescript
// ❌ Wrong - invalid relationship type
await client.callTool('search-by-relationship', {
  relationship_type: 'company_to_contacts',  // Invalid
  source_id: 'comp_123'
});

// ✅ Correct - valid relationship type
await client.callTool('search-by-relationship', {
  relationship_type: 'company_to_people',    // Valid
  source_id: 'comp_123'
});
```

### 6. Universal Tool Validation Rules

Each universal tool has specific validation requirements. Understanding these rules helps prevent common errors.

#### Core Tools Validation

**search-records**:
```typescript
{
  resource_type: string,    // Required: 'companies' | 'people' | 'records' | 'tasks'
  query?: string,           // Optional, but cannot be empty string if provided
  limit?: number,           // Optional: 1-100 (default: 10)
  offset?: number,          // Optional: >= 0 (default: 0)
  filters?: object          // Optional: valid filter object structure
}

// ❌ Invalid examples
{ resource_type: 'contacts' }        // Invalid resource_type
{ resource_type: 'companies', query: '' }  // Empty query not allowed
{ resource_type: 'people', limit: 0 }      // Limit must be >= 1
{ resource_type: 'tasks', limit: 150 }     // Limit must be <= 100
```

**get-record-details**:
```typescript
{
  resource_type: string,    // Required: 'companies' | 'people' | 'records' | 'tasks'
  record_id: string,        // Required: non-empty string
  fields?: string[]         // Optional: array of valid field names
}

// ❌ Invalid examples
{ resource_type: 'companies' }              // Missing record_id
{ resource_type: 'people', record_id: '' }  // Empty record_id
{ resource_type: 'tasks', record_id: 'task_123', fields: [] }  // Empty fields array
```

**create-record**:
```typescript
{
  resource_type: string,    // Required: 'companies' | 'people' | 'records' | 'tasks'
  record_data: object,      // Required: non-empty object with valid attributes
  return_details?: boolean  // Optional: true/false (default: false)
}

// ❌ Invalid examples
{ resource_type: 'companies', record_data: {} }    // Empty record_data
{ resource_type: 'people' }                        // Missing record_data
```

**update-record**:
```typescript
{
  resource_type: string,    // Required: 'companies' | 'people' | 'records' | 'tasks'
  record_id: string,        // Required: non-empty string
  updates: object,          // Required: non-empty object with valid attributes
  return_details?: boolean  // Optional: true/false (default: false)
}

// ❌ Invalid examples
{ resource_type: 'companies', record_id: 'comp_123', updates: {} }  // Empty updates
{ resource_type: 'people', updates: { name: 'John' } }              // Missing record_id
```

**delete-record**:
```typescript
{
  resource_type: string,    // Required: 'companies' | 'people' | 'records' | 'tasks'
  record_id: string,        // Required: non-empty string
  force?: boolean           // Optional: true/false (default: false)
}

// ❌ Invalid examples
{ resource_type: 'companies' }              // Missing record_id
{ resource_type: 'people', record_id: '' }  // Empty record_id
```

#### Advanced Tools Validation

**advanced-search**:
```typescript
{
  resource_type: string,    // Required: 'companies' | 'people' | 'records' | 'tasks'
  query?: string,           // Optional, but cannot be empty string if provided
  filters?: object,         // Optional: complex filter structure
  sort_by?: string,         // Optional: valid field name
  sort_order?: string,      // Optional: 'asc' | 'desc' (default: 'asc')
  limit?: number,           // Optional: 1-100 (default: 10)
  offset?: number           // Optional: >= 0 (default: 0)
}

// ❌ Invalid examples
{ resource_type: 'companies', sort_order: 'ascending' }  // Invalid sort_order
{ resource_type: 'people', filters: 'invalid' }         // Filters must be object
```

**search-by-relationship**:
```typescript
{
  resource_type: string,         // Required: 'companies' | 'people' | 'records' | 'tasks'
  related_resource_type: string, // Required: different from resource_type
  relationship_filter?: object,  // Optional: filter for related records
  include_related?: boolean      // Optional: true/false (default: false)
}

// ❌ Invalid examples
{ resource_type: 'companies', related_resource_type: 'companies' }  // Same types
{ resource_type: 'people' }                                        // Missing related_resource_type
```

**search-by-content**:
```typescript
{
  resource_type: string,    // Required: 'companies' | 'people' (records/tasks not supported)
  content_type: string,     // Required: 'notes' | 'activities' | 'comments'
  search_query: string,     // Required: non-empty search string
  date_range?: object       // Optional: date range for content
}

// ❌ Invalid examples
{ resource_type: 'records', content_type: 'notes' }     // Records not supported
{ resource_type: 'companies', search_query: '' }        // Empty search_query
{ resource_type: 'people', content_type: 'messages' }   // Invalid content_type
```

**search-by-timeframe**:
```typescript
{
  resource_type: string,     // Required: 'companies' | 'people' | 'records' | 'tasks'
  timeframe_type: string,    // Required: 'created' | 'modified' | 'last_contacted'
  date_range?: object,       // Optional: explicit date range
  preset?: string            // Optional: valid preset (see date presets section)
}

// Must provide either date_range OR preset, not both
// ❌ Invalid examples
{ resource_type: 'companies' }                    // Missing timeframe_type
{ resource_type: 'people', timeframe_type: 'invalid' }  // Invalid timeframe_type
{ resource_type: 'tasks', timeframe_type: 'created', preset: 'last_30_days' }  // Invalid preset
```

**batch-operations**:
```typescript
{
  resource_type: string,    // Required: 'companies' | 'people' | 'records' | 'tasks'
  operation_type: string,   // Required: 'create' | 'update' | 'delete' | 'get' | 'search'
  records?: array,          // Required for create/update/delete: 1-50 items
  record_ids?: string[],    // Required for get/delete: 1-50 IDs
  query?: string,           // Required for search: non-empty string
  limit?: number            // Optional for search: 1-50 (default: 10)
}

// ❌ Invalid examples
{ resource_type: 'companies', operation_type: 'duplicate' }  // Invalid operation_type
{ resource_type: 'people', operation_type: 'create' }        // Missing records
{ resource_type: 'tasks', operation_type: 'search' }         // Missing query
{ resource_type: 'companies', operation_type: 'create', records: [] }  // Empty records
{ resource_type: 'people', operation_type: 'get', record_ids: ['p1', 'p2', ...51_items] }  // Too many IDs
```

#### Common Validation Errors

**Resource Type Validation**:
```typescript
// Valid resource types only
const VALID_RESOURCE_TYPES = ['companies', 'people', 'records', 'tasks'];

// ❌ Common mistakes
'company'    // Should be 'companies' (plural)
'person'     // Should be 'people' (plural)
'contact'    // Should be 'people'
'record'     // Should be 'records' (plural)
'task'       // Should be 'tasks' (plural)
```

**String Parameter Validation**:
```typescript
// String parameters cannot be empty if provided
// ❌ Invalid
{ query: '' }         // Empty string not allowed
{ search_query: '' }  // Empty string not allowed
{ record_id: '' }     // Empty string not allowed

// ✅ Valid
{ query: 'technology' }        // Non-empty string
{ search_query: 'meeting' }    // Non-empty string
{ record_id: 'comp_123' }      // Non-empty string
// Or omit optional string parameters entirely
{ /* no query parameter */ }  // Valid for optional parameters
```

**Array Parameter Validation**:
```typescript
// Arrays cannot be empty if provided
// ❌ Invalid
{ fields: [] }         // Empty array not allowed
{ records: [] }        // Empty array not allowed
{ record_ids: [] }     // Empty array not allowed

// ✅ Valid
{ fields: ['name', 'email'] }     // Non-empty array
{ records: [{ name: 'Test' }] }   // Non-empty array
{ record_ids: ['comp_123'] }      // Non-empty array
// Or omit optional array parameters entirely
{ /* no fields parameter */ }    // Valid for optional parameters
```

**Numeric Parameter Validation**:
```typescript
// Numeric limits and ranges
// ❌ Invalid
{ limit: 0 }      // Must be >= 1
{ limit: 101 }    // Must be <= 100
{ offset: -1 }    // Must be >= 0

// ✅ Valid
{ limit: 25 }     // 1-100 range
{ offset: 0 }     // >= 0
{ offset: 50 }    // Any positive number
```

### 7. Record Not Found Errors

#### Error: "Record not found: comp_123"

**Cause**: The specified record ID doesn't exist or you don't have access to it.

**Debugging steps**:

1. **Verify the record ID**:
```typescript
// Search for the record first
const searchResults = await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'company name',
  limit: 1
});

if (searchResults.length > 0) {
  const correctId = searchResults[0].id.record_id;
  console.log('Correct ID:', correctId);
}
```

2. **Check resource type**:
```typescript
// Make sure you're using the right resource type
await client.callTool('get-record-details', {
  resource_type: 'people',  // Maybe it's a person, not a company
  record_id: 'person_123'
});
```

3. **Verify access permissions**:
```typescript
// Try a broader search to see if you have access to the list
const allRecords = await client.callTool('search-records', {
  resource_type: 'companies',
  limit: 5
});
console.log('Available records:', allRecords.length);
```

## Migration Issues

### Problem: "Tool 'search-companies' not found"

**Cause**: Using deprecated tool names after migration to universal tools.

**Solution**: Use the migration table to find the universal equivalent:

```typescript
// ❌ Wrong - deprecated tool
await client.callTool('search-companies', {
  query: 'tech startup'
});

// ✅ Correct - universal tool
await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'tech startup'
});
```

### Problem: "Missing parameters after migration"

**Cause**: Not adding the required `resource_type` parameter during migration.

**Solution**: Always add `resource_type` when migrating:

```typescript
// Old tool call
await client.callTool('get-company-basic-info', {
  record_id: 'comp_123'
});

// Migrated tool call - add resource_type AND info_type
await client.callTool('get-detailed-info', {
  resource_type: 'companies',  // Required
  record_id: 'comp_123',
  info_type: 'basic'          // Required for detailed info
});
```

### Problem: "Parameters don't work the same way"

**Cause**: Some parameters have changed during migration.

**Common parameter changes**:

| Deprecated Tool | Old Parameter | Universal Tool | New Parameters |
|----------------|---------------|----------------|----------------|
| `get-company-contact-info` | `record_id` | `get-detailed-info` | `resource_type: 'companies'`<br>`record_id`<br>`info_type: 'contact'` |
| `search-people-by-company` | `company_id` | `search-by-relationship` | `relationship_type: 'company_to_people'`<br>`source_id` |
| `batch-create-companies` | `companies` | `batch-operations` | `resource_type: 'companies'`<br>`operation_type: 'create'`<br>`records` |

## Performance Issues

### Problem: "Searches are too slow"

**Solutions**:

1. **Use specific queries**:
```typescript
// ❌ Slow - too broad
{ query: 'company' }

// ✅ Fast - specific
{ query: 'technology startup San Francisco' }
```

2. **Add filters to narrow results**:
```typescript
await client.callTool('advanced-search', {
  resource_type: 'companies',
  query: 'technology',
  filters: {
    and: [
      { attribute: 'employee_count', condition: 'between', value: [10, 100] },
      { attribute: 'country', condition: 'equals', value: 'United States' }
    ]
  }
});
```

3. **Use smaller limits**:
```typescript
// ❌ Slow - large result set
{ limit: 100 }

// ✅ Fast - smaller result set
{ limit: 25 }
```

4. **Specify fields for record details**:
```typescript
await client.callTool('get-record-details', {
  resource_type: 'companies',
  record_id: 'comp_123',
  fields: ['name', 'website', 'industry']  // Only get needed fields
});
```

### Problem: "Batch operations timing out"

**Solutions**:

1. **Reduce batch size**:
```typescript
// ❌ Too large - may timeout
const batchSize = 50;

// ✅ Optimal size
const batchSize = 20;
```

2. **Add delays between batches**:
```typescript
for (const batch of batches) {
  await processBatch(batch);
  
  // Add delay to respect rate limits
  await new Promise(resolve => setTimeout(resolve, 500));
}
```

3. **Use error isolation**:
```typescript
// Process with error isolation
const results = await processInParallel(
  records,
  async (record) => {
    try {
      return await processRecord(record);
    } catch (error) {
      console.warn(`Failed to process record ${record.id}:`, error);
      return { success: false, error: error.message, record };
    }
  }
);
```

## Authentication and Authorization Issues

### Problem: "API key not found or invalid"

**Cause**: Missing or incorrect ATTIO_API_KEY environment variable.

**Solution**:
```bash
# Set the environment variable
export ATTIO_API_KEY=your_actual_api_key_here

# Verify it's set
echo $ATTIO_API_KEY
```

### Problem: "Insufficient permissions for resource"

**Cause**: Your API key doesn't have access to the specified resource type.

**Solution**: 
1. Check your Attio account permissions
2. Verify the resource type exists in your workspace
3. Try a different resource type to test access

## Debugging Strategies

### Enable Debug Logging

```typescript
// Add debug logging to your tool calls
console.log('Calling universal tool:', toolName, params);

try {
  const result = await client.callTool(toolName, params);
  console.log('Tool result:', result);
  return result;
} catch (error) {
  console.error('Tool error:', error.message);
  console.error('Tool params:', params);
  throw error;
}
```

### Validate Parameters Before Calling

```typescript
function validateUniversalParams(toolName: string, params: any): void {
  // Check required resource_type
  if (!params.resource_type) {
    throw new Error(`${toolName}: resource_type is required`);
  }
  
  const validResourceTypes = ['companies', 'people', 'records', 'tasks'];
  if (!validResourceTypes.includes(params.resource_type)) {
    throw new Error(`${toolName}: invalid resource_type "${params.resource_type}"`);
  }
  
  // Check for empty query strings
  if ('query' in params && params.query === '') {
    throw new Error(`${toolName}: query cannot be empty string`);
  }
  
  if ('search_query' in params && params.search_query === '') {
    throw new Error(`${toolName}: search_query cannot be empty string`);
  }
  
  // Check batch size limits
  if ('records' in params && Array.isArray(params.records) && params.records.length > 50) {
    throw new Error(`${toolName}: batch size (${params.records.length}) exceeds limit (50)`);
  }
}

// Use before tool calls
validateUniversalParams('search-records', params);
const result = await client.callTool('search-records', params);
```

### Test with Simple Cases First

```typescript
// Start with the simplest possible case
const simpleResult = await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'test',
  limit: 1
});

console.log('Simple search worked:', simpleResult.length > 0);

// Then add complexity gradually
const complexResult = await client.callTool('advanced-search', {
  resource_type: 'companies',
  query: 'technology',
  filters: {
    and: [
      { attribute: 'employee_count', condition: 'greater_than', value: 10 }
    ]
  },
  sort_by: 'created_at',
  sort_order: 'desc',
  limit: 10
});
```

## Frequently Asked Questions

### Q: Why were the tools consolidated?

**A**: The consolidation reduces tool count from 40+ to 13 universal operations (68% reduction), which:
- Improves AI system performance (fewer tools to evaluate)
- Provides consistent APIs across resource types
- Simplifies maintenance and development
- Enables easier addition of new resource types

### Q: Are the old tools still available?

**A**: The deprecated tools are no longer available. You must migrate to universal tools using the [Migration Guide](migration-guide.md).

### Q: Can I add custom resource types?

**A**: Yes! See the [Developer Guide](developer-guide.md) for instructions on extending universal tools with new resource types.

### Q: What's the difference between `search-records` and `advanced-search`?

**A**: 
- `search-records`: Basic search with simple filtering
- `advanced-search`: Complex searches with sorting, advanced filters, and better performance optimization

### Q: Why can't I use empty query strings?

**A**: Empty queries can cause performance issues and return too many irrelevant results. Always provide meaningful search terms.

### Q: How do I handle large datasets?

**A**: Use pagination with `limit` and `offset` parameters, and consider batch operations for bulk processing with built-in rate limiting.

### Q: What happens if a batch operation partially fails?

**A**: Universal tools use error isolation - individual failures don't stop the entire batch. You'll get a result showing which operations succeeded and which failed.

### Q: Can I use universal tools with multiple resource types in one call?

**A**: No, each tool call works with one resource type. For cross-resource operations, make multiple calls or use the relationship search tools.

## Testing and Development Issues

### Problem: "Mock functions not working properly in tests"

**Cause**: Using incorrect mock patterns that don't properly resolve function imports.

> 📝 **From PR #367**: The correct testing pattern uses `importOriginal` for proper function resolution.

**Solution**: Use the `importOriginal` pattern:

```typescript
// ❌ Wrong - incorrect mock pattern
vi.mock('../../src/handlers/tool-configs/universal/core-operations.ts', () => ({
  searchRecords: vi.fn(),
  getRecordDetails: vi.fn()
}));

// ✅ Correct - importOriginal pattern
vi.mock('../../src/handlers/tool-configs/universal/core-operations.ts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchRecords: vi.fn(),
    getRecordDetails: vi.fn()
  };
});
```

**Complete Testing Template**:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Proper mock setup with importOriginal
vi.mock('../../src/handlers/tool-configs/universal/core-operations.ts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchRecords: vi.fn(),
    getRecordDetails: vi.fn(),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn()
  };
});

vi.mock('../../src/handlers/tool-configs/universal/advanced-operations.ts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    advancedSearch: vi.fn(),
    searchByRelationship: vi.fn(),
    searchByContent: vi.fn(),
    searchByTimeframe: vi.fn(),
    batchOperations: vi.fn()
  };
});

describe('Universal Tools Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle search-records properly', async () => {
    // Your test implementation
    const mockResult = { records: [], total: 0 };
    vi.mocked(searchRecords).mockResolvedValue(mockResult);
    
    const result = await callUniversalTool('search-records', {
      resource_type: 'companies',
      query: 'test query'
    });
    
    expect(result).toEqual(mockResult);
    expect(searchRecords).toHaveBeenCalledWith(
      'companies',
      'test query',
      expect.any(Object)
    );
  });
});
```

### Problem: "Tests failing with 'query cannot be empty' errors"

**Cause**: Test cases using empty strings for required query parameters.

**Solution**: Always provide meaningful query values in tests:

```typescript
// ❌ Wrong - empty query in tests
const testParams = {
  resource_type: 'companies',
  query: ''  // Will cause validation error
};

// ✅ Correct - meaningful query in tests
const testParams = {
  resource_type: 'companies', 
  query: 'Universal Test Company'  // Specific test query
};

// For batch operations
const batchParams = {
  resource_type: 'companies',
  operation_type: 'search',
  query: 'Universal Test',  // Required for search operations
  limit: 50
};

// For content searches
const contentParams = {
  resource_type: 'people',
  content_type: 'activity',
  search_query: 'test interaction'  // NOT empty string
};
```

### Problem: "Date filter tests failing with operator errors"

**Cause**: Tests using old date operators instead of new ones.

**Solution**: Update test cases with correct operators:

```typescript
// ❌ Wrong - old operators in tests
const testFilters = {
  and: [
    { 
      attribute: 'created_at', 
      condition: 'greater_than_or_equals',  // Old operator
      value: '2024-01-01' 
    }
  ]
};

// ✅ Correct - new operators in tests
const testFilters = {
  and: [
    { 
      attribute: 'created_at', 
      condition: FilterConditionType.AFTER,  // New operator
      value: '2024-01-01T00:00:00Z' 
    }
  ]
};
```

### Problem: "Mock responses don't match actual API responses"

**Cause**: Test mocks using outdated response formats.

**Solution**: Use realistic mock data that matches current API responses:

```typescript
// ✅ Realistic mock response structure
const mockApiResponse = {
  data: [
    {
      id: { record_id: 'comp_test123' },
      values: {
        name: [{ value: 'Test Company' }],
        website: [{ value: 'https://test.com' }],
        industry: [{ value: 'Technology' }]
      }
    }
  ],
  next_cursor: null
};

// Mock the tool response format
const mockToolResponse = {
  content: [{
    type: 'text',
    text: 'Found 1 company matching "test"...'
  }],
  isError: false,
  metadata: {
    items: mockApiResponse.data,
    pagination: {
      total: 1,
      hasMore: false
    }
  }
};
```

## Getting Additional Help

### Documentation Resources
- **[Migration Guide](migration-guide.md)** - Complete tool mapping and migration examples
- **[API Reference](api-reference.md)** - Detailed parameter schemas and examples  
- **[User Guide](user-guide.md)** - Best practices and common use cases
- **[Developer Guide](developer-guide.md)** - Extending and customizing universal tools

### Support Channels
- **GitHub Issues**: [Create an issue](https://github.com/kesslerio/attio-mcp-server/issues) for bugs or feature requests
- **Documentation Updates**: Submit PRs to improve this documentation
- **Community**: Check existing issues for similar problems and solutions

### Reporting Issues

When reporting issues, please include:

1. **Tool name and parameters** used
2. **Complete error message** 
3. **Expected behavior** vs actual behavior
4. **Environment details** (Node.js version, etc.)
5. **Minimal reproduction case**

Example issue report:
```markdown
## Issue: search-records returns empty results

**Tool Call:**
```typescript
await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'technology startup',
  limit: 10
});
```

**Error/Behavior:**
Returns empty array despite having technology companies in the workspace.

**Expected:**
Should return at least 3-5 technology companies.

**Environment:**
- Node.js 18.17.0
- Attio MCP Server v1.2.0
- API Key has full workspace access
```