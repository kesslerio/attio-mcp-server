# Attio MCP Universal Tools Reference

This document provides a comprehensive guide to the **13 Universal Tools** in the Attio MCP Server - a modern, streamlined replacement for the previous 40+ individual tools.

## 🎯 Universal Tools Overview

Universal tools provide consistent operations across all resource types (companies, people, tasks, records) using a single set of tools with `resource_type` parameters. This approach offers:

- **68% Tool Reduction**: From 40+ tools to 13 universal operations
- **Consistent API**: Same patterns across all resource types
- **Better Performance**: Fewer tools for AI systems to evaluate
- **Future-Proof**: Easy to add new resource types

## 📚 Quick Navigation

| Need to...                      | Use This Tool                    | Key Parameters                                  |
| ------------------------------- | -------------------------------- | ----------------------------------------------- |
| **Search any resource**         | `records_search`                 | `resource_type`, `query`                        |
| **Get record details**          | `records_get_details`             | `resource_type`, `record_id`                    |
| **Create new record**           | `records_create`                  | `resource_type`, `record_data`                  |
| **Update existing record**      | `records_update`                  | `resource_type`, `record_id`, `record_data`     |
| **Idempotent create-or-update** | `records_upsert`                  | `resource_type`, `match`, `values`              |
| **Delete record**               | `records_delete`                  | `resource_type`, `record_id`                    |
| **Complex searches**            | `records_search_advanced`        | `resource_type`, `filters`                      |
| **Cross-resource searches**     | `records_search_by_relationship` | `relationship_type`, `source_id`                |
| **Content-based searches**      | `records_search_by_content`      | `resource_type`, `content_type`, `search_query` |
| **Time-based searches**         | `records_search_by_timeframe`    | `resource_type`, `start_date`, `end_date`       |
| **Bulk operations**             | `records_batch`                  | `operation_type`, `records`                     |
| **Get attributes**              | `records_get_attributes`          | `resource_type`, `record_id`                    |
| **Discover schema**             | `records_discover_attributes`     | `resource_type`                                 |
| **Get specialized info**        | `records_get_info`                | `resource_type`, `record_id`, `info_type`       |

## 🛠 Core Operations (8 Tools)

### 1. `records_search`

**Universal search across all resource types**

```typescript
{
  "name": "records_search",
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

### 2. `records_get_details`

**Get comprehensive information for any record type**

```typescript
{
  "name": "records_get_details",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "record_id": "record_123456",
    "include_relationships": true // Optional: include related records
  }
}
```

### 3. `records_create`

**Create new records of any supported type**

```typescript
{
  "name": "records_create",
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

### 4. `records_update`

**Update existing records**

```typescript
{
  "name": "records_update",
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

### 4b. `records_upsert`

**Create-or-update in one call (Issue #1191)**

Exact-matches one attribute, updates the single match, creates when missing, and aborts without writing when the match is ambiguous. Ideal for enrichment, dedupe, sync, and lead-capture workflows where search-then-write races create duplicates.

Person by email:

```typescript
{
  "name": "records_upsert",
  "arguments": {
    "resource_type": "people",
    "match": { "attribute": "email_addresses", "value": "jane@acme.com" },
    "values": { "name": "Jane Doe", "job_title": "VP Engineering" }
  }
}
```

Company by domain:

```typescript
{
  "name": "records_upsert",
  "arguments": {
    "resource_type": "companies",
    "match": { "attribute": "domains", "value": "acme.com" },
    "values": { "name": "Acme Corporation", "categories": ["Technology"] }
  }
}
```

Custom object by unique field, preview before writing:

```typescript
{
  "name": "records_upsert",
  "arguments": {
    "resource_type": "projects",
    "match": { "attribute": "project_code", "value": "PROJ-42" },
    "values": { "status": "active" },
    "dry_run": true
  }
}
```

Behavior notes:

- `action` in the result is one of `created`, `updated`, `noop`, `dry_run` (with `planned_action`), plus `record_id` and `changed_fields`.
- Match the attribute's real Attio slug — person emails live under `email_addresses` and company domains under `domains`; call `records_discover_attributes` if unsure. Match values are compared exactly (case-sensitive), so match the casing the record stores.
- Multiple matches → error listing the candidate record ids; nothing is written. Use `records_update` on the intended record.
- `create_if_missing: false` makes a no-match upsert fail instead of inserting.
- `record_id` (UUID) optionally targets a known record directly; upsert never creates with a caller-provided id, and the targeted record is also brought in line with the match pair so later match-based upserts find it.
- On create, the `match` pair fills any attribute `values` does not already set (`values` wins for the same attribute).
- Lookups that fail, return a truncated match set, or hand back an unrelated record abort with an error instead of falling through to create — a flaky lookup can never mint the duplicate this tool exists to prevent.
- Create-vs-update is not atomic (Attio has no uniqueness constraint). When a post-create re-check finds other records already on the match key, the result carries `concurrent_duplicates` with their ids for manual merge.

### 5. `records_delete`

**Delete records safely**

```typescript
{
  "name": "records_delete",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "record_id": "record_123456",
    "force": false // Optional: bypass safety checks
  }
}
```

### 6. `records_get_attributes`

**Get all attributes for a specific record**

```typescript
{
  "name": "records_get_attributes",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "record_id": "record_123456",
    "attribute_names": ["name", "email"] // Optional: specific attributes
  }
}
```

### 7. `records_discover_attributes`

**Discover available attributes for a resource type**

```typescript
{
  "name": "records_discover_attributes",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "include_schema": true // Optional: include attribute schemas
  }
}
```

### 8. `records_get_info`

**Get specialized information (contact, business, social)**

```typescript
{
  "name": "records_get_info",
  "arguments": {
    "resource_type": "companies" | "people",
    "record_id": "record_123456",
    "info_type": "contact" | "business" | "social" | "all"
  }
}
```

## 🚀 Advanced Operations (5 Tools)

### 9. `records_search_advanced`

**Complex searches with sorting and advanced filtering**

```typescript
{
  "name": "records_search_advanced",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks" | "records",
    "filters": {
      "filters": [
        {
          "attribute": { "slug": "name" },
          "condition": "contains",
          "value": "tech"
        },
        {
          "attribute": { "slug": "employees" },
          "condition": "gte",
          "value": 50
        }
      ],
      "matchAny": false
    },
    "sort": [{ "name": "asc" }],
    "limit": 50
  }
}
```

**Filter Operators:**

- `contains`, `starts_with`, `ends_with` (text)
- `equals`, `gt`, `gte`, `lt`, `lte` (comparisons)
- `is_empty`, `is_not_empty` (presence)
- `matchAny: true` for OR logic across filters

### 10. `records_search_by_relationship`

**Cross-resource relationship searches**

```typescript
{
  "name": "records_search_by_relationship",
  "arguments": {
    "relationship_type": "company_to_people",
    "source_id": "company_record_id",
    "target_resource_type": "people",
    "limit": 50
  }
}
```

### 11. `records_search_by_content`

**Content-based searches (notes, activity)**

```typescript
{
  "name": "records_search_by_content",
  "arguments": {
    "resource_type": "companies" | "people",
    "content_type": "notes" | "activity" | "interactions",
    "search_query": "quarterly review",
    "limit": 20
  }
}
```

### 12. `records_search_by_timeframe`

**Time-based searches with date ranges**

```typescript
{
  "name": "records_search_by_timeframe",
  "arguments": {
    "resource_type": "companies" | "people" | "tasks",
    "date_field": "created_at" | "updated_at" | "last_contacted",
    "start_date": "2023-01-01",
    "end_date": "2023-12-31"
  }
}
```

### 13. `records_batch`

**Bulk operations on multiple records**

```typescript
{
  "name": "records_batch",
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

- **Basic search**: Use `records_search`
- **Get details**: Use `records_get_details`
- **CRUD operations**: Use `records_create`, `records_update`, `records_delete`

### For Complex Searches

- **Multi-criteria**: Use `records_search_advanced`
- **Cross-resource**: Use `records_search_by_relationship`
- **Content-based**: Use `records_search_by_content`
- **Time-based**: Use `records_search_by_timeframe`

### For Bulk Operations

- **Multiple records**: Use `records_batch`
- **Schema discovery**: Use `records_discover_attributes`
- **Specialized info**: Use `records_get_info`

## 🔄 Migration from Individual Tools

All previous individual tools have been consolidated:

| Old Pattern                 | New Universal Pattern                                       |
| --------------------------- | ----------------------------------------------------------- |
| `search-companies`          | `records_search` with `resource_type: "companies"`          |
| `search-people`             | `records_search` with `resource_type: "people"`             |
| `get-company-details`       | `records_get_details` with `resource_type: "companies"`      |
| `create-person`             | `records_create` with `resource_type: "people"`              |
| `advanced-search-companies` | `records_search_advanced` with `resource_type: "companies"` |

**Complete Migration Guide**: See [Migration Guide](../universal-tools/migration-guide.md) for all 40+ tool mappings.

## 🚀 Best Practices

1. **Start with Basic Tools**: Use `records_search` and `records_get_details` for most operations
2. **Use Appropriate Resource Types**: Always specify the correct `resource_type`
3. **Leverage Advanced Search**: Use `records_search_advanced` for complex filtering
4. **Batch for Efficiency**: Use `records_batch` for multiple records
5. **Discover Schema**: Use `records_discover_attributes` to understand available fields
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
