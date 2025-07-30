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

## Visual Migration Comparison

### 🎯 Quick Before/After Reference

<table>
<tr>
<th>❌ Before (Deprecated)</th>
<th>✅ After (Universal)</th>
<th>Key Changes</th>
</tr>

<tr>
<td>

```typescript
// 40+ individual tools
search-companies
search-people  
get-company-details
get-person-details
create-company
create-person
// ... 34+ more tools
```

</td>
<td>

```typescript
// 13 universal tools
search-records
get-record-details
create-record
update-record
delete-record
advanced-search
// ... 7 more tools
```

</td>
<td>

- **68% tool reduction**
- **Consistent naming**
- **Parameter-based routing**
- **Same functionality**

</td>
</tr>

<tr>
<td>

```typescript
// Resource-specific parameters
await callTool('search-companies', {
  query: 'tech',
  limit: 10
});

await callTool('search-people', {
  query: 'john',
  limit: 10
});
```

</td>
<td>

```typescript
// Universal with resource_type
await callTool('search-records', {
  resource_type: 'companies',
  query: 'tech',
  limit: 10
});

await callTool('search-records', {
  resource_type: 'people', 
  query: 'john',
  limit: 10
});
```

</td>
<td>

- **Add `resource_type`**
- **Single tool for all resources**
- **Consistent API patterns**
- **Same search functionality**

</td>
</tr>

<tr>
<td>

```typescript
// Different tools for similar operations
await callTool('get-company-basic-info', {
  record_id: 'comp_123'
});

await callTool('get-company-contact-info', {
  record_id: 'comp_123'
});

await callTool('get-company-social-info', {
  record_id: 'comp_123'
});
```

</td>
<td>

```typescript
// Single tool with info_type parameter
await callTool('get-detailed-info', {
  resource_type: 'companies',
  record_id: 'comp_123',
  info_type: 'basic'
});

await callTool('get-detailed-info', {
  resource_type: 'companies', 
  record_id: 'comp_123',
  info_type: 'contact'
});

await callTool('get-detailed-info', {
  resource_type: 'companies',
  record_id: 'comp_123', 
  info_type: 'social'
});
```

</td>
<td>

- **Single tool replaces 3+**
- **Consistent parameters**
- **Add `info_type` parameter**
- **Same data returned**

</td>
</tr>

<tr>
<td>

```typescript
// Old date operators (fail with API)
await callTool('advanced-search-companies', {
  filters: {
    and: [{
      attribute: 'created_at',
      condition: 'greater_than_or_equals',
      value: '2024-01-01'
    }]
  }
});
```

</td>
<td>

```typescript
// New date operators (API compatible)
await callTool('advanced-search', {
  resource_type: 'companies',
  filters: {
    and: [{
      attribute: 'created_at', 
      condition: FilterConditionType.AFTER,
      value: '2024-01-01T00:00:00Z'
    }]
  }
});
```

</td>
<td>

- **Updated date operators**
- **ISO 8601 timestamps**
- **FilterConditionType enum**
- **API compatibility**

</td>
</tr>

<tr>
<td>

```typescript
// Batch operations per resource
await callTool('batch-create-companies', {
  companies: [
    { name: 'Company 1' },
    { name: 'Company 2' }
  ]
});

await callTool('batch-create-people', {
  people: [
    { name: 'Person 1' },
    { name: 'Person 2' }
  ]
});
```

</td>
<td>

```typescript
// Universal batch operations
await callTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'create',
  records: [
    { name: 'Company 1' },
    { name: 'Company 2' }
  ]
});

await callTool('batch-operations', {
  resource_type: 'people',
  operation_type: 'create',
  records: [
    { name: 'Person 1' },
    { name: 'Person 2' }
  ]
});
```

</td>
<td>

- **Single batch tool**
- **Add `operation_type`**
- **Consistent `records` parameter**
- **Same batch processing**

</td>
</tr>

</table>

## Step-by-Step Migration Examples

### Example 1: Basic Company Search

<table>
<tr>
<th width="50%">❌ Before (Deprecated)</th>
<th width="50%">✅ After (Universal)</th>
</tr>
<tr>
<td>

```typescript
await client.callTool('search-companies', {
  query: 'tech startup',
  limit: 10
});
```

</td>
<td>

```typescript
await client.callTool('search-records', {
  resource_type: 'companies',
  query: 'tech startup',
  limit: 10
});
```

</td>
</tr>
<tr>
<td colspan="2">

**Migration Steps:**
1. Change tool name: `search-companies` → `search-records`
2. Add parameter: `resource_type: 'companies'`
3. Keep all other parameters the same

</td>
</tr>
</table>

### Example 2: Advanced People Search with Filters

<table>
<tr>
<th width="50%">❌ Before (Deprecated)</th>
<th width="50%">✅ After (Universal)</th>
</tr>
<tr>
<td>

```typescript
await client.callTool('advanced-search-people', {
  filters: {
    and: [
      { 
        attribute: 'job_title', 
        condition: 'contains', 
        value: 'Manager' 
      },
      { 
        attribute: 'created_at', 
        condition: 'greater_than_or_equals', 
        value: '2024-01-01' 
      }
    ]
  },
  limit: 25
});
```

</td>
<td>

```typescript
await client.callTool('advanced-search', {
  resource_type: 'people',
  filters: {
    and: [
      { 
        attribute: 'job_title', 
        condition: FilterConditionType.CONTAINS, 
        value: 'Manager' 
      },
      { 
        attribute: 'created_at', 
        condition: FilterConditionType.AFTER, 
        value: '2024-01-01T00:00:00Z' 
      }
    ]
  },
  limit: 25
});
```

</td>
</tr>
<tr>
<td colspan="2">

**Migration Steps:**
1. Change tool name: `advanced-search-people` → `advanced-search`
2. Add parameter: `resource_type: 'people'`
3. Update date operator: `greater_than_or_equals` → `FilterConditionType.AFTER`
4. Use ISO 8601 timestamp: `2024-01-01` → `2024-01-01T00:00:00Z`
5. Use enum for conditions: `'contains'` → `FilterConditionType.CONTAINS`

</td>
</tr>
</table>

### Example 3: Company Information Retrieval

<table>
<tr>
<th width="50%">❌ Before (Deprecated)</th>
<th width="50%">✅ After (Universal)</th>
</tr>
<tr>
<td>

```typescript
// Multiple tool calls for different info types
const basic = await client.callTool('get-company-basic-info', {
  record_id: 'comp_123'
});

const contact = await client.callTool('get-company-contact-info', {
  record_id: 'comp_123'
});

const business = await client.callTool('get-company-business-info', {
  record_id: 'comp_123'
});
```

</td>
<td>

```typescript
// Single tool with info_type parameter
const basic = await client.callTool('get-detailed-info', {
  resource_type: 'companies',
  record_id: 'comp_123',
  info_type: 'basic'
});

const contact = await client.callTool('get-detailed-info', {
  resource_type: 'companies', 
  record_id: 'comp_123',
  info_type: 'contact'
});

const business = await client.callTool('get-detailed-info', {
  resource_type: 'companies',
  record_id: 'comp_123', 
  info_type: 'business'
});
```

</td>
</tr>
<tr>
<td colspan="2">

**Migration Steps:**
1. Replace all info tools: `get-company-*-info` → `get-detailed-info`
2. Add parameter: `resource_type: 'companies'`
3. Add parameter: `info_type` with appropriate value (`'basic'`, `'contact'`, `'business'`, `'social'`)
4. Keep `record_id` parameter the same

</td>
</tr>
</table>

### Example 4: Batch Company Operations

<table>
<tr>
<th width="50%">❌ Before (Deprecated)</th>
<th width="50%">✅ After (Universal)</th>
</tr>
<tr>
<td>

```typescript
// Create multiple companies
await client.callTool('batch-create-companies', {
  companies: [
    { 
      name: 'TechCorp Inc.', 
      website: 'techcorp.com',
      industry: 'Technology' 
    },
    { 
      name: 'DataSoft LLC', 
      website: 'datasoft.io',
      industry: 'Software' 
    }
  ]
});

// Get multiple company details
await client.callTool('batch-get-company-details', {
  company_ids: ['comp_123', 'comp_456']
});
```

</td>
<td>

```typescript
// Create multiple companies
await client.callTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'create',
  records: [
    { 
      name: 'TechCorp Inc.', 
      website: 'techcorp.com',
      industry: 'Technology' 
    },
    { 
      name: 'DataSoft LLC', 
      website: 'datasoft.io',
      industry: 'Software' 
    }
  ]
});

// Get multiple company details
await client.callTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'get',
  record_ids: ['comp_123', 'comp_456']
});
```

</td>
</tr>
<tr>
<td colspan="2">

**Migration Steps:**
1. Replace all batch tools: `batch-*-companies` → `batch-operations`
2. Add parameter: `resource_type: 'companies'`
3. Add parameter: `operation_type` (`'create'`, `'update'`, `'delete'`, `'get'`, `'search'`)
4. Rename data parameter: `companies` → `records`
5. Rename ID parameter: `company_ids` → `record_ids`

</td>
</tr>
</table>

### Example 5: Date-Based Searches

<table>
<tr>
<th width="50%">❌ Before (Deprecated)</th>
<th width="50%">✅ After (Universal)</th>
</tr>
<tr>
<td>

```typescript
// Search people by creation date
await client.callTool('search-people-by-creation-date', {
  dateRange: {
    start: '2024-01-01',
    end: '2024-01-31'
  }
});

// Search companies by modification date
await client.callTool('search-companies-by-modification-date', {
  preset: 'last_30_days'  // Invalid preset!
});
```

</td>
<td>

```typescript
// Search people by creation date
await client.callTool('search-by-timeframe', {
  resource_type: 'people',
  timeframe_type: 'created',
  date_range: {
    start_date: '2024-01-01T00:00:00Z',
    end_date: '2024-01-31T23:59:59Z'
  }
});

// Search companies by modification date
await client.callTool('search-by-timeframe', {
  resource_type: 'companies',
  timeframe_type: 'modified',
  preset: 'last_month'  // Valid preset!
});
```

</td>
</tr>
<tr>
<td colspan="2">

**Migration Steps:**
1. Replace date-specific tools: `search-*-by-*-date` → `search-by-timeframe`
2. Add parameter: `resource_type` (appropriate resource type)
3. Add parameter: `timeframe_type` (`'created'`, `'modified'`, `'last_contacted'`)
4. Update date format: `'2024-01-01'` → `'2024-01-01T00:00:00Z'`
5. Use valid presets: `'last_30_days'` → `'last_month'`

</td>
</tr>
</table>

### Example 6: Content and Relationship Searches

<table>
<tr>
<th width="50%">❌ Before (Deprecated)</th>
<th width="50%">✅ After (Universal)</th>
</tr>
<tr>
<td>

```typescript
// Search companies by notes
await client.callTool('search-companies-by-notes', {
  searchText: 'quarterly review'
});

// Search people by company
await client.callTool('search-people-by-company', {
  company_id: 'comp_123'
});
```

</td>
<td>

```typescript
// Search companies by notes
await client.callTool('search-by-content', {
  resource_type: 'companies',
  content_type: 'notes',
  search_query: 'quarterly review'
});

// Search people by company
await client.callTool('search-by-relationship', {
  resource_type: 'people',
  related_resource_type: 'companies',
  relationship_filter: {
    record_id: 'comp_123'
  }
});
```

</td>
</tr>
<tr>
<td colspan="2">

**Migration Steps:**
1. Content searches: `search-*-by-notes` → `search-by-content`
2. Add parameters: `resource_type`, `content_type: 'notes'`
3. Rename parameter: `searchText` → `search_query`
4. Relationship searches: `search-*-by-*` → `search-by-relationship` 
5. Add parameters: `resource_type`, `related_resource_type`
6. Wrap ID in filter: `company_id` → `relationship_filter: { record_id }`

</td>
</tr>
</table>
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