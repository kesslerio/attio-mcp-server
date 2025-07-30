# Universal Tools Migration Guide

This guide helps you migrate from deprecated resource-specific tools to the new universal tool system. The universal tools consolidate 40+ individual tools into 13 powerful operations while maintaining full functionality.

## Migration Overview

### What Changed?

- **Tool Count**: Reduced from 40+ tools to 13 universal operations (68% reduction)
- **Parameter Structure**: Added `resource_type` parameter to specify target resource
- **Naming**: Simplified tool names (e.g., `search-companies` → `search-records`)
- **Date Operators**: Updated for Attio API compatibility

### Benefits

- **Consistent API**: Same patterns across all resource types
- **Better Performance**: Fewer tools for AI systems to evaluate
- **Future-Proof**: Easy to add new resource types without new tools

## Complete Tool Migration Reference

### Company Tools → Universal Equivalents

| Deprecated Tool | Universal Tool | Resource Type | Additional Parameters |
|----------------|----------------|---------------|---------------------|
| `search-companies` | `search-records` | `companies` | - |
| `get-company-details` | `get-record-details` | `companies` | - |
| `create-company` | `create-record` | `companies` | - |
| `update-company` | `update-record` | `companies` | - |
| `delete-company` | `delete-record` | `companies` | - |
| `get-company-attributes` | `get-attributes` | `companies` | - |
| `discover-company-attributes` | `discover-attributes` | `companies` | - |
| `get-company-basic-info` | `get-detailed-info` | `companies` | `info_type: 'basic'` |
| `get-company-contact-info` | `get-detailed-info` | `companies` | `info_type: 'contact'` |
| `get-company-business-info` | `get-detailed-info` | `companies` | `info_type: 'business'` |
| `get-company-social-info` | `get-detailed-info` | `companies` | `info_type: 'social'` |
| `advanced-search-companies` | `advanced-search` | `companies` | - |
| `search-companies-by-notes` | `search-by-content` | `companies` | `content_type: 'notes'` |
| `search-companies-by-people` | `search-by-relationship` | `companies` | `relationship_type: 'people_to_company'` |

### People Tools → Universal Equivalents

| Deprecated Tool | Universal Tool | Resource Type | Additional Parameters |
|----------------|----------------|---------------|---------------------|
| `search-people` | `search-records` | `people` | - |
| `get-person-details` | `get-record-details` | `people` | - |
| `create-person` | `create-record` | `people` | - |
| `advanced-search-people` | `advanced-search` | `people` | - |
| `search-people-by-company` | `search-by-relationship` | `people` | `relationship_type: 'company_to_people'` |
| `search-people-by-activity` | `search-by-content` | `people` | `content_type: 'activity'` |
| `search-people-by-notes` | `search-by-content` | `people` | `content_type: 'notes'` |
| `search-people-by-creation-date` | `search-by-timeframe` | `people` | `timeframe_type: 'created'` |
| `search-people-by-modification-date` | `search-by-timeframe` | `people` | `timeframe_type: 'modified'` |
| `search-people-by-last-interaction` | `search-by-timeframe` | `people` | `timeframe_type: 'last_interaction'` |

### Record Tools → Universal Equivalents

| Deprecated Tool | Universal Tool | Resource Type | Additional Parameters |
|----------------|----------------|---------------|---------------------|
| `create-record` | `create-record` | `records` | Already universal |
| `get-record` | `get-record-details` | `records` | - |
| `update-record` | `update-record` | `records` | Already universal |
| `delete-record` | `delete-record` | `records` | Already universal |
| `list-records` | `search-records` | `records` | - |
| `batch-create-records` | `batch-operations` | `records` | `operation_type: 'create'` |
| `batch-update-records` | `batch-operations` | `records` | `operation_type: 'update'` |

### Task Tools → Universal Equivalents

| Deprecated Tool | Universal Tool | Resource Type | Additional Parameters |
|----------------|----------------|---------------|---------------------|
| `create-task` | `create-record` | `tasks` | - |
| `update-task` | `update-record` | `tasks` | - |
| `delete-task` | `delete-record` | `tasks` | - |
| `list-tasks` | `search-records` | `tasks` | - |

### Batch Tools → Universal Equivalents

| Deprecated Tool | Universal Tool | Resource Type | Additional Parameters |
|----------------|----------------|---------------|---------------------|
| `batch-create-companies` | `batch-operations` | `companies` | `operation_type: 'create'` |
| `batch-update-companies` | `batch-operations` | `companies` | `operation_type: 'update'` |
| `batch-delete-companies` | `batch-operations` | `companies` | `operation_type: 'delete'` |
| `batch-search-companies` | `batch-operations` | `companies` | `operation_type: 'search'` |
| `batch-get-company-details` | `batch-operations` | `companies` | `operation_type: 'get'` |

## Step-by-Step Migration Examples

### Example 1: Basic Company Search

**Before (deprecated)**:
```typescript
await client.callTool('search-companies', {
  query: 'tech startup',
  limit: 10
});
```

**After (universal)**:
```typescript
await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'tech startup',
  limit: 10
});
```

### Example 2: People Search by Company

**Before (deprecated)**:
```typescript
await client.callTool('search-people-by-company', {
  company_id: 'comp_123',
  limit: 20
});
```

**After (universal)**:
```typescript
await client.callTool('search-by-relationship', {
  relationship_type: 'company_to_people',
  source_id: 'comp_123',
  limit: 20
});
```

### Example 3: Company Info Retrieval

**Before (deprecated)**:
```typescript
await client.callTool('get-company-contact-info', {
  record_id: 'comp_123'
});
```

**After (universal)**:
```typescript
await client.callTool('get-detailed-info', {
  resource_type: 'companies',
  record_id: 'comp_123',
  info_type: 'contact'
});
```

### Example 4: Batch Company Creation

**Before (deprecated)**:
```typescript
await client.callTool('batch-create-companies', {
  companies: [
    { name: 'Company A', domain: 'companya.com' },
    { name: 'Company B', domain: 'companyb.com' }
  ]
});
```

**After (universal)**:
```typescript
await client.callTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'create',
  records: [
    { name: 'Company A', domain: 'companya.com' },
    { name: 'Company B', domain: 'companyb.com' }
  ]
});
```

### Example 5: Time-based People Search

**Before (deprecated)**:
```typescript
await client.callTool('search-people-by-creation-date', {
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-01-31T23:59:59Z'
});
```

**After (universal)**:
```typescript
await client.callTool('search-by-timeframe', {
  resource_type: 'people',
  timeframe_type: 'created',
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-01-31T23:59:59Z'
});
```

## Breaking Changes and Important Updates

### 1. Date Filtering Operators ⚠️

The date operators have changed for Attio API compatibility:

**❌ OLD (will cause API errors)**:
```typescript
{
  condition: 'greater_than_or_equals', // ❌ Invalid
  condition: 'less_than_or_equals'     // ❌ Invalid
}
```

**✅ NEW (correct)**:
```typescript
{
  condition: 'after',  // ✅ Use instead of greater_than_or_equals
  condition: 'before'  // ✅ Use instead of less_than_or_equals
}
```

### 2. Valid Date Presets

Only these date presets are valid:

**✅ Valid presets**:
```typescript
'today', 'yesterday', 'this_week', 'last_week', 
'this_month', 'last_month', 'this_quarter', 'last_quarter', 
'this_year', 'last_year'
```

**❌ Invalid preset**:
```typescript
'last_30_days'  // Will throw validation error
```

### 3. Query Parameter Requirements

- Universal tool queries **cannot be empty strings**
- Batch operations require meaningful search queries
- Use specific search terms, not empty or generic values

**❌ Invalid**:
```typescript
{
  resource_type: 'companies',
  query: ''  // Empty string not allowed
}
```

**✅ Valid**:
```typescript
{
  resource_type: 'companies',
  query: 'tech startup'  // Meaningful search term
}
```

## Migration Automation

### Using getMigrationParams Utility

The universal tools system includes a utility function to help with migration:

```typescript
import { getMigrationParams, getUniversalEquivalent } from './universal/index.js';

// Get the universal tool equivalent
const universalTool = getUniversalEquivalent('search-companies');
// Returns: 'search-records'

// Get migration parameters
const newParams = getMigrationParams('search-companies', {
  query: 'tech startup',
  limit: 10
});
// Returns: { resource_type: 'companies', query: 'tech startup', limit: 10 }
```

## Validation and Testing

### Testing Your Migration

1. **Parameter Validation**: Ensure all required parameters are included
2. **Resource Type**: Verify correct `resource_type` values
3. **Date Operators**: Use `after`/`before` instead of old operators
4. **Query Requirements**: Provide meaningful search queries

### Common Migration Errors

```typescript
// ❌ Missing resource_type
await client.callTool('search-records', {
  query: 'tech startup'  // Missing resource_type parameter
});

// ✅ Correct migration
await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'tech startup'
});
```

## Next Steps

1. **Update your tool calls** using the migration table above
2. **Test your changes** with the new universal tools
3. **Review the [API Reference](api-reference.md)** for detailed parameter schemas
4. **Check [Troubleshooting](troubleshooting.md)** if you encounter issues

## Need Help?

- **Common errors**: See [Troubleshooting](troubleshooting.md)
- **API details**: Check [API Reference](api-reference.md)
- **Usage examples**: Review [User Guide](user-guide.md)
- **Issues**: Create a GitHub issue for support