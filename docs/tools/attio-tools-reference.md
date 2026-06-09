# Attio MCP Universal Tools Reference

This document provides a comprehensive guide to the **13 Universal Tools** in the Attio MCP Server - a modern, streamlined replacement for the previous 40+ individual tools.

## 🎯 Universal Tools Overview

Universal tools provide consistent operations across all resource types (companies, people, tasks, records) using a single set of tools with `resource_type` parameters. This approach offers:

- **68% Tool Reduction**: From 40+ tools to 13 universal operations
- **Consistent API**: Same patterns across all resource types
- **Better Performance**: Fewer tools for AI systems to evaluate
- **Future-Proof**: Easy to add new resource types

## 📚 Quick Navigation

| Need to...                  | Use This Tool                    | Key Parameters                                  |
| --------------------------- | -------------------------------- | ----------------------------------------------- |
| **Search any resource**     | `search_records`                 | `resource_type`, `query`                        |
| **Get record details**      | `get_record_details`             | `resource_type`, `record_id`                    |
| **Create new record**       | `create_record`                  | `resource_type`, `record_data`                  |
| **Update existing record**  | `update_record`                  | `resource_type`, `record_id`, `record_data`     |
| **Delete record**           | `delete_record`                  | `resource_type`, `record_id`                    |
| **Complex searches**        | `search_records_advanced`        | `resource_type`, `filters`                      |
| **Cross-resource searches** | `search_records_by_relationship` | `relationship_type`, `source_id`                |
| **Content-based searches**  | `search_records_by_content`      | `resource_type`, `content_type`, `search_query` |
| **Time-based searches**     | `search_records_by_timeframe`    | `resource_type`, `date_range`                   |
| **Bulk operations**         | `batch_records`                  | `operation_type`, `records`                     |
| **Get attributes**          | `get_record_attributes`          | `resource_type`, `record_id`                    |
| **Discover schema**         | `discover_record_attributes`     | `resource_type`                                 |
| **Get specialized info**    | `get_record_info`                | `resource_type`, `record_id`, `info_type`       |

## 🛠 Core Operations (8 Tools)

### 1. `search_records`

**Universal search across all resource types**

```typescript
{
  "name": "search_records",
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

### 2. `get_record_details`

**Get comprehensive information for any record type**

```typescript
{
  "name": "get_record_details",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "record_id": "record_123456",
    "include_relationships": true // Optional: include related records
  }
}
```

### 3. `create_record`

**Create new records of any supported type**

```typescript
{
  "name": "create_record",
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

### 4. `update_record`

**Update existing records**

```typescript
{
  "name": "update_record",
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

### 5. `delete_record`

**Delete records safely**

```typescript
{
  "name": "delete_record",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "record_id": "record_123456",
    "force": false // Optional: bypass safety checks
  }
}
```

### 6. `get_record_attributes`

**Get all attributes for a specific record**

```typescript
{
  "name": "get_record_attributes",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "record_id": "record_123456",
    "attribute_names": ["name", "email"] // Optional: specific attributes
  }
}
```

### 7. `discover_record_attributes`

**Discover available attributes for a resource type**

```typescript
{
  "name": "discover_record_attributes",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "include_schema": true // Optional: include attribute schemas
  }
}
```

### 8. `get_record_info`

**Get specialized information (contact, business, social)**

```typescript
{
  "name": "get_record_info",
  "arguments": {
    "resource_type": "companies" | "people",
    "record_id": "record_123456",
    "info_type": "contact" | "business" | "social" | "all"
  }
}
```

## 🚀 Advanced Operations (5 Tools)

### 9. `search_records_advanced`

**Complex searches with sorting and advanced filtering**

```typescript
{
  "name": "search_records_advanced",
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

### 10. `search_records_by_relationship`

**Cross-resource relationship searches**

```typescript
{
  "name": "search_records_by_relationship",
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

### 11. `search_records_by_content`

**Content-based searches (notes, activity)**

```typescript
{
  "name": "search_records_by_content",
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

### 12. `search_records_by_timeframe`

**Time-based searches with date ranges**

```typescript
{
  "name": "search_records_by_timeframe",
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

### 13. `batch_records`

**Bulk operations on multiple records**

```typescript
{
  "name": "batch_records",
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

- **Basic search**: Use `search_records`
- **Get details**: Use `get_record_details`
- **CRUD operations**: Use `create_record`, `update_record`, `delete_record`

### For Complex Searches

- **Multi-criteria**: Use `search_records_advanced`
- **Cross-resource**: Use `search_records_by_relationship`
- **Content-based**: Use `search_records_by_content`
- **Time-based**: Use `search_records_by_timeframe`

### For Bulk Operations

- **Multiple records**: Use `batch_records`
- **Schema discovery**: Use `discover_record_attributes`
- **Specialized info**: Use `get_record_info`

## 🔄 Migration from Individual Tools

All previous individual tools have been consolidated:

| Old Pattern                 | New Universal Pattern                                       |
| --------------------------- | ----------------------------------------------------------- |
| `search-companies`          | `search_records` with `resource_type: "companies"`          |
| `search-people`             | `search_records` with `resource_type: "people"`             |
| `get-company-details`       | `get_record_details` with `resource_type: "companies"`      |
| `create-person`             | `create_record` with `resource_type: "people"`              |
| `advanced-search-companies` | `search_records_advanced` with `resource_type: "companies"` |

**Complete Migration Guide**: See [Migration Guide](../universal-tools/migration-guide.md) for all 40+ tool mappings.

## 🚀 Best Practices

1. **Start with Basic Tools**: Use `search_records` and `get_record_details` for most operations
2. **Use Appropriate Resource Types**: Always specify the correct `resource_type`
3. **Leverage Advanced Search**: Use `search_records_advanced` for complex filtering
4. **Batch for Efficiency**: Use `batch_records` for multiple records
5. **Discover Schema**: Use `discover_record_attributes` to understand available fields
6. **Handle Errors**: All tools include comprehensive error handling

## 🔗 Additional Resources

- [Universal Tools Overview](../universal-tools/README.md)
- [Complete API Reference](../universal-tools/api-reference.md)
- [Migration Guide](../universal-tools/migration-guide.md)
- [User Guide](../universal-tools/user-guide.md)
- [Developer Guide](../universal-tools/developer-guide.md)
- [Troubleshooting](../universal-tools/troubleshooting.md)

---

_This reference reflects the universal tools consolidation completed in Issue #352. All functionality from previous 40+ individual tools is preserved and improved in this universal system._
