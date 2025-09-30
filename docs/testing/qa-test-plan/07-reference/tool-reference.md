# Tool Reference Guide

> **Context:** Complete specification of all MCP tools with parameters and usage patterns  
> **Audience:** All testing personas for tool understanding and parameter reference  
> **Usage:** Reference during test planning and execution for accurate tool usage

## Tool Categories

### Core CRUD Operations (P0 Priority)

| Tool Name               | Purpose                  | Required Parameters                         | Optional Parameters          |
| ----------------------- | ------------------------ | ------------------------------------------- | ---------------------------- |
| **records.search**      | Find records by query    | `resource_type`, `query`                    | `limit`, `offset`, `filters` |
| **records.get_details** | Retrieve specific record | `resource_type`, `record_id`                | `fields`                     |
| **create-record**       | Create new record        | `resource_type`, `record_data`              | `return_details`             |
| **update-record**       | Modify existing record   | `resource_type`, `record_id`, `record_data` | `return_details`             |
| **delete-record**       | Remove record            | `resource_type`, `record_id`                | None                         |

### Schema & Discovery Tools (P1 Priority)

| Tool Name                   | Purpose                  | Required Parameters                       | Optional Parameters                         |
| --------------------------- | ------------------------ | ----------------------------------------- | ------------------------------------------- |
| **get-attributes**          | Get resource schema      | `resource_type`                           | `categories`                                |
| **discover-attributes**     | Dynamic schema discovery | `resource_type`                           | None                                        |
| **get-detailed-info**       | Get specific info types  | `resource_type`, `record_id`, `info_type` | None                                        |
| **records.search_advanced** | Complex filtering        | `resource_type`                           | `filters`, `sort_by`, `sort_order`, `limit` |

### Advanced Operations (P2 Priority)

| Tool Name                          | Purpose              | Required Parameters                             | Optional Parameters               |
| ---------------------------------- | -------------------- | ----------------------------------------------- | --------------------------------- |
| **records.search_by_relationship** | Find related records | `relationship_type`, `source_id`                | `target_resource_type`, `limit`   |
| **records.search_by_content**      | Content-based search | `resource_type`, `content_type`, `search_query` | `limit`                           |
| **records.search_by_timeframe**    | Date range filtering | `resource_type`, `timeframe_type`               | `start_date`, `end_date`, `limit` |
| **records.batch**                  | Bulk operations      | `resource_type`, `operation_type`               | `record_ids`, `operations`        |
| **records.search_batch**           | Parallel searches    | `resource_type`, `queries`                      | `limit`                           |

## Detailed Tool Specifications

### records.search

**Purpose:** Basic search functionality across all resource types

**Parameters:**

- `resource_type` (required): "companies", "people", "lists", "tasks", "deals", "records"
- `query` (required): Search query string
- `limit` (optional): Maximum results to return (default: 20)
- `offset` (optional): Skip first N results (default: 0)
- `filters` (optional): JSON array of filter objects

**Example Usage:**

```bash
mcp__attio__records.search resource_type="companies" query="technology" limit=10
```

**Response Format:**

- Returns array of matching records with basic field information
- Includes record IDs for use in other operations
- Supports pagination through limit/offset

---

### records.get_details

**Purpose:** Retrieve complete information for a specific record

**Parameters:**

- `resource_type` (required): Target resource type
- `record_id` (required): Unique identifier for the record
- `fields` (optional): Array of specific fields to retrieve

**Example Usage:**

```bash
mcp__attio__records.get_details resource_type="people" record_id="abc123" fields='["name","email","title"]'
```

**Response Format:**

- Returns complete record object with all available fields
- Field availability depends on resource type and permissions
- Null values returned for empty/unavailable fields

---

### create-record

**Purpose:** Create new records with specified data

**Parameters:**

- `resource_type` (required): Target resource type for creation
- `record_data` (required): JSON object with field values
- `return_details` (optional): Boolean to return full created record

**Example Usage:**

```bash
mcp__attio__create-record resource_type="companies" \
  record_data='{"name": "New Company", "domain": "example.com"}' \
  return_details=true
```

**Response Format:**

- Returns created record ID and optionally full record details
- Validates required fields before creation
- Returns field validation errors for invalid data

---

### update-record

**Purpose:** Modify existing record data

**Parameters:**

- `resource_type` (required): Target resource type
- `record_id` (required): ID of record to update
- `record_data` (required): JSON object with fields to update
- `return_details` (optional): Boolean to return updated record

**Example Usage:**

```bash
mcp__attio__update-record resource_type="people" record_id="abc123" \
  record_data='{"job_title": "Senior Manager"}' return_details=true
```

**Response Format:**

- Returns confirmation of update and optionally updated record
- Only updates specified fields, leaves others unchanged
- Validates field constraints before applying changes

---

### delete-record

**Purpose:** Remove records from the system

**Parameters:**

- `resource_type` (required): Target resource type
- `record_id` (required): ID of record to delete

**Example Usage:**

```bash
mcp__attio__delete-record resource_type="tasks" record_id="task123"
```

**Response Format:**

- Returns deletion confirmation
- Record becomes inaccessible after successful deletion
- Related data relationships may be affected

---

### get-attributes

**Purpose:** Retrieve schema information for resource types

**Parameters:**

- `resource_type` (required): Resource type to get schema for
- `categories` (optional): Array of specific attribute categories

**Example Usage:**

```bash
mcp__attio__get-attributes resource_type="companies" categories='["contact","business"]'
```

**Response Format:**

- Returns field definitions, types, and constraints
- Includes required vs optional field information
- Shows validation rules and format requirements

---

### records.search_advanced

**Purpose:** Execute complex searches with filtering and sorting

**Parameters:**

- `resource_type` (required): Target resource type
- `filters` (optional): Array of filter objects with field, operator, value
- `sort_by` (optional): Field name to sort by
- `sort_order` (optional): "asc" or "desc"
- `limit` (optional): Maximum results to return

**Example Usage:**

```bash
mcp__attio__records.search_advanced resource_type="people" \
  filters='[{"field": "job_title", "operator": "contains", "value": "Manager"}]' \
  sort_by="name" sort_order="asc" limit=25
```

**Available Operators:**

- `=`, `!=`: Exact match/not match
- `>`, `>=`, `<`, `<=`: Numeric/date comparisons
- `contains`, `starts_with`, `ends_with`: String matching
- `in`, `not_in`: Array membership
- `is_null`, `is_not_null`: Null checks

---

### records.batch

**Purpose:** Execute multiple operations efficiently in batches

**Parameters:**

- `resource_type` (required): Target resource type
- `operation_type` (required): "get", "create", "update", "delete"
- `record_ids` (for get/delete): Array of record IDs
- `operations` (for create/update): Array of operation objects

**Example Usage:**

```bash
# Batch get
mcp__attio__records.batch resource_type="companies" \
  operation_type="get" record_ids='["id1","id2","id3"]'

# Batch create
mcp__attio__records.batch resource_type="people" \
  operation_type="create" \
  operations='[
    {"data": {"name": "Person 1", "email": "p1@test.com"}},
    {"data": {"name": "Person 2", "email": "p2@test.com"}}
  ]'
```

**Response Format:**

- Returns array of results, one per operation
- Includes success/failure status for each operation
- Partial success possible - some operations may fail while others succeed

## Parameter Format Guidelines

### Resource Types

**Valid Values:** `"companies"`, `"people"`, `"lists"`, `"tasks"`, `"deals"`, `"records"`

**Usage:** Always use exact string values, case-sensitive

### Record Data Format

**JSON Structure:** Fields must match resource type schema

```json
{
  "field_name": "field_value",
  "array_field": ["value1", "value2"],
  "object_field": { "sub_field": "sub_value" }
}
```

### Filter Objects

**Structure:**

```json
{
  "field": "field_name",
  "operator": "comparison_operator",
  "value": "comparison_value"
}
```

### Date Formats

**ISO 8601:** `"2024-08-20T14:30:00Z"`  
**Date Only:** `"2024-08-20"`  
**Relative:** `"today"`, `"yesterday"`, `"last_week"`

## Common Usage Patterns

### Basic Workflow

1. **Discovery:** Use `get-attributes` to understand schema
2. **Search:** Use `records.search` to find existing data
3. **Details:** Use `records.get_details` for complete record info
4. **Modify:** Use `create-record` or `update-record` as needed
5. **Cleanup:** Use `delete-record` to remove test data

### Advanced Workflow

1. **Complex Search:** Use `records.search_advanced` with filters
2. **Relationship Discovery:** Use `records.search_by_relationship`
3. **Content Search:** Use `records.search_by_content` for text queries
4. **Batch Processing:** Use `records.batch` for efficiency

### Error Handling

- **Invalid Parameters:** Check parameter names and formats
- **Missing Records:** Verify record IDs exist with search first
- **Permission Errors:** Ensure API key has required permissions
- **Rate Limits:** Add delays between rapid operations

---

**Related Documentation:**

- [Reference: Resource Types Guide](./resource-types.md)
- [Reference: Quick Commands](./quick-commands.md)
- [Back: Reference Directory](./index.md)
- [Test Cases: Detailed Usage Examples](../04-test-cases/)
