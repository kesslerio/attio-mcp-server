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

**Solution**: Use the new date operators:
```typescript
// ❌ Wrong - deprecated operators
{
  filters: {
    and: [
      { attribute: 'created_at', condition: 'greater_than_or_equals', value: '2024-01-01' }
    ]
  }
}

// ✅ Correct - new operators
{
  filters: {
    and: [
      { attribute: 'created_at', condition: 'after', value: '2024-01-01T00:00:00Z' }
    ]
  }
}
```

**Operator Migration Table**:
| Old Operator | New Operator |
|--------------|--------------|
| `greater_than_or_equals` | `after` |
| `less_than_or_equals` | `before` |
| `greater_than` | `after` |
| `less_than` | `before` |

#### Error: "Invalid date preset: 'last_30_days'"

**Cause**: Using an invalid date preset value.

**Valid date presets**:
```typescript
'today', 'yesterday', 'this_week', 'last_week', 
'this_month', 'last_month', 'this_quarter', 'last_quarter', 
'this_year', 'last_year'
```

**Solution**:
```typescript
// ❌ Wrong - invalid preset
{
  timeframe_type: 'created',
  preset: 'last_30_days'  // Invalid
}

// ✅ Correct - valid preset
{
  timeframe_type: 'created',
  preset: 'last_month'    // Valid
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

### 6. Record Not Found Errors

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