# Attio MCP Universal Tools Reference

This document provides a comprehensive guide to the **13 Universal Tools** in the Attio MCP Server - a modern, streamlined replacement for the previous 40+ individual tools.

## 🎯 Universal Tools Overview

Universal tools provide consistent operations across all resource types (companies, people, tasks, records) using a single set of tools with `resource_type` parameters. This approach offers:

- **68% Tool Reduction**: From 40+ tools to 13 universal operations
- **Consistent API**: Same patterns across all resource types
- **Better Performance**: Fewer tools for AI systems to evaluate
- **Future-Proof**: Easy to add new resource types

## 📚 Quick Navigation

| Need to... | Use This Tool | Key Parameters |
|------------|---------------|----------------|
| **Search any resource** | `search-records` | `resource_type`, `query` |
| **Get record details** | `get-record-details` | `resource_type`, `record_id` |
| **Create new record** | `create-record` | `resource_type`, `record_data` |
| **Update existing record** | `update-record` | `resource_type`, `record_id`, `updates` |
| **Delete record** | `delete-record` | `resource_type`, `record_id` |
| **Complex searches** | `advanced-search` | `resource_type`, `filters` |
| **Cross-resource searches** | `search-by-relationship` | `resource_type`, `related_resource_type` |
| **Content-based searches** | `search-by-content` | `resource_type`, `content_query` |
| **Time-based searches** | `search-by-timeframe` | `resource_type`, `date_range` |
| **Bulk operations** | `batch-operations` | `operation_type`, `records` |
| **Get attributes** | `get-attributes` | `resource_type`, `record_id` |
| **Discover schema** | `discover-attributes` | `resource_type` |
| **Get specialized info** | `get-detailed-info` | `resource_type`, `record_id`, `info_type` |

## 🛠 Core Operations (8 Tools)

### 1. `search-records`
**Universal search across all resource types**

```typescript
{
  "name": "search-records",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "query": "search term",
    "limit": 20,
    "fields": ["name", "email"] // Optional: specific fields to search
  }
}
```

**Use Cases:**
- Find companies by name: `resource_type: "companies", query: "acme"`
- Find people by email: `resource_type: "people", query: "john@example.com"`
- Find tasks by title: `resource_type: "tasks", query: "follow up"`

### 2. `get-record-details`
**Get comprehensive information for any record type**

```typescript
{
  "name": "get-record-details",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "record_id": "record_123456",
    "include_relationships": true // Optional: include related records
  }
}
```

### 3. `create-record`
**Create new records of any supported type**

```typescript
{
  "name": "create-record",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "record_data": {
      "name": "New Company",
      "website": "https://example.com"
      // ... other attributes
    }
  }
}
```

### 4. `update-record`
**Update existing records**

```typescript
{
  "name": "update-record",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "record_id": "record_123456",
    "updates": {
      "name": "Updated Name",
      "status": "active"
    }
  }
}
```

### 5. `delete-record`
**Delete records safely**

```typescript
{
  "name": "delete-record",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "record_id": "record_123456",
    "force": false // Optional: bypass safety checks
  }
}
```

### 6. `get-attributes`
**Get all attributes for a specific record**

```typescript
{
  "name": "get-attributes",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "record_id": "record_123456",
    "attribute_names": ["name", "email"] // Optional: specific attributes
  }
}
```

### 7. `discover-attributes`
**Discover available attributes for a resource type**

```typescript
{
  "name": "discover-attributes",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "include_schema": true // Optional: include attribute schemas
  }
}
```

### 8. `get-detailed-info`
**Get specialized information (contact, business, social)**

```typescript
{
  "name": "get-detailed-info",
  "arguments": {
    "resource_type": "companies" | "people",
    "record_id": "record_123456",
    "info_type": "contact" | "business" | "social" | "all"
  }
}
```

## 🚀 Advanced Operations (5 Tools)

### 9. `advanced-search`
**Complex searches with sorting and advanced filtering**

```typescript
{
  "name": "advanced-search",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "filters": {
      "name": { "$contains": "tech" },
      "employees": { "$gte": 50 },
      "$or": [
        { "industry": "Technology" },
        { "industry": "Software" }
      ]
    },
    "sort": [{ "name": "asc" }],
    "limit": 50
  }
}
```

**Filter Operators:**
- `$contains`, `$starts_with`, `$ends_with` (text)
- `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte` (comparisons)
- `$in`, `$nin` (arrays)
- `$and`, `$or` (logical)

### 10. `search-by-relationship`
**Cross-resource relationship searches**

```typescript
{
  "name": "search-by-relationship",
  "arguments": {
    "resource_type": "people",
    "related_resource_type": "companies",
    "relationship_filter": {
      "company_name": { "$contains": "acme" }
    },
    "include_related": true
  }
}
```

### 11. `search-by-content`
**Content-based searches (notes, activity)**

```typescript
{
  "name": "search-by-content",
  "arguments": {
    "resource_type": "companies" | "people",
    "content_query": "quarterly review",
    "content_types": ["notes", "activities"],
    "date_range": {
      "start": "2023-01-01",
      "end": "2023-12-31"
    }
  }
}
```

### 12. `search-by-timeframe`
**Time-based searches with date ranges**

```typescript
{
  "name": "search-by-timeframe",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks",
    "date_field": "created_at" | "updated_at" | "last_contacted",
    "date_range": {
      "start": "2023-01-01",
      "end": "2023-12-31"
    },
    "relative_range": "last_30_days" // Alternative to absolute dates
  }
}
```

### 13. `batch-operations`
**Bulk operations on multiple records**

```typescript
{
  "name": "batch-operations",
  "arguments": {
    "operation_type": "create" | "update" | "delete" | "search",
    "resource_type": "companies" | "people" | "tasks" | "records",
    "records": [
      {
        "record_id": "record_123", // For update/delete
        "data": { ... } // For create/update
      }
    ],
    "batch_size": 10,
    "continue_on_error": true
  }
}
```

## 🎯 Resource Types

### Companies (`resource_type: "companies"`)
Common attributes: `name`, `website`, `industry`, `employees`, `revenue`, `address`

### People (`resource_type: "people"`)
Common attributes: `name`, `email`, `phone`, `job_title`, `company`, `linkedin_url`

### Tasks (`resource_type: "tasks"`)
Common attributes: `title`, `content`, `assignee`, `due_date`, `status`, `priority`

### Records (`resource_type: "records"`)
Generic records with custom attributes defined in your Attio workspace

## 📊 Tool Selection Guide

### For Simple Operations
- **Basic search**: Use `search-records`
- **Get details**: Use `get-record-details`
- **CRUD operations**: Use `create-record`, `update-record`, `delete-record`

### For Complex Searches
- **Multi-criteria**: Use `advanced-search`
- **Cross-resource**: Use `search-by-relationship`
- **Content-based**: Use `search-by-content`
- **Time-based**: Use `search-by-timeframe`

### For Bulk Operations
- **Multiple records**: Use `batch-operations`
- **Schema discovery**: Use `discover-attributes`
- **Specialized info**: Use `get-detailed-info`

## 🔄 Migration from Individual Tools

All previous individual tools have been consolidated:

| Old Pattern | New Universal Pattern |
|-------------|----------------------|
| `search-companies` | `search-records` with `resource_type: "companies"` |
| `search-people` | `search-records` with `resource_type: "people"` |
| `get-company-details` | `get-record-details` with `resource_type: "companies"` |
| `create-person` | `create-record` with `resource_type: "people"` |
| `advanced-search-companies` | `advanced-search` with `resource_type: "companies"` |

**Complete Migration Guide**: See [Migration Guide](../universal-tools/migration-guide.md) for all 40+ tool mappings.

## 🚀 Best Practices

1. **Start with Basic Tools**: Use `search-records` and `get-record-details` for most operations
2. **Use Appropriate Resource Types**: Always specify the correct `resource_type`
3. **Leverage Advanced Search**: Use `advanced-search` for complex filtering
4. **Batch for Efficiency**: Use `batch-operations` for multiple records
5. **Discover Schema**: Use `discover-attributes` to understand available fields
6. **Handle Errors**: All tools include comprehensive error handling

## 🔗 Additional Resources

- [Universal Tools Overview](../universal-tools/README.md)
- [Complete API Reference](../universal-tools/api-reference.md)
- [Migration Guide](../universal-tools/migration-guide.md)
- [User Guide](../universal-tools/user-guide.md)
- [Developer Guide](../universal-tools/developer-guide.md)
- [Troubleshooting](../universal-tools/troubleshooting.md)

---

*This reference reflects the universal tools consolidation completed in Issue #352. All functionality from previous 40+ individual tools is preserved and improved in this universal system.*