# Migration Guide: Legacy Tools → Universal Tools

**Status**: Legacy tools deprecated (Q1 2026 removal target)
**Issue**: #1022
**Effective**: v1.3.7

## Overview

Legacy resource-specific tools (86 tools) are being consolidated into universal tools (20 tools) for better consistency, maintainability, and user experience.

### Why Universal Tools?

- **Consistency**: Single API for all resource types
- **Simplicity**: 65% reduction in tool count (86 → 20 tools)
- **Maintainability**: One implementation, fewer edge cases
- **Better Error Messages**: Standardized error handling across resources

### Timeline

- **Now**: Legacy tools deprecated, accessible via `DISABLE_UNIVERSAL_TOOLS=true`
- **Q1 2026**: Legacy tools removed in v2.0.0

## Quick Reference

### Core Universal Tools

| Operation           | Universal Tool                | Legacy Equivalents                                   |
| ------------------- | ----------------------------- | ---------------------------------------------------- |
| Search records      | `records_search`              | `search-companies`, `search-people`, `list-tasks`    |
| Get details         | `records_get_details`         | `get-company-details`, `get-person-details`          |
| Create record       | `create-record`               | `create-company`, `create-person`, `create-task`     |
| Update record       | `update-record`               | `update-company`, `update-task`                      |
| Delete record       | `delete-record`               | `delete-company`, `delete-task`                      |
| Get attributes      | `records_get_attributes`      | `get-company-attributes`                             |
| Discover attributes | `records_discover_attributes` | `discover-company-attributes`                        |
| Get detailed info   | `records_get_info`            | `get-company-basic-info`, `get-company-contact-info` |

### Advanced Universal Tools

| Operation              | Universal Tool                   | Legacy Equivalents                                                     |
| ---------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| Advanced search        | `records_search_advanced`        | `advanced-search-companies`, `advanced-search-people`                  |
| Search by relationship | `records_search_by_relationship` | `search-companies-by-people`, `search-people-by-company`               |
| Search by content      | `records_search_by_content`      | `search-companies-by-notes`, `search-people-by-notes`                  |
| Search by timeframe    | `records_search_by_timeframe`    | `search-people-by-creation-date`, `search-people-by-modification-date` |
| Batch operations       | `records_batch`                  | `batch-create-companies`, `batch-update-companies`                     |
| Batch search           | `records_search_batch`           | `batch-search-companies`                                               |

## Migration Examples

### Example 1: Search Companies → Search Records

**Legacy**:

```json
{
  "tool": "search-companies",
  "params": {
    "query": "Acme Corp"
  }
}
```

**Universal**:

```json
{
  "tool": "records_search",
  "params": {
    "resource_type": "companies",
    "query": "Acme Corp"
  }
}
```

### Example 2: Create Person → Create Record

**Legacy**:

```json
{
  "tool": "create-person",
  "params": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Universal**:

```json
{
  "tool": "create-record",
  "params": {
    "resource_type": "people",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Example 3: Update Task → Update Record

**Legacy**:

```json
{
  "tool": "update-task",
  "params": {
    "task_id": "abc-123",
    "content": "Updated task description"
  }
}
```

**Universal**:

```json
{
  "tool": "update-record",
  "params": {
    "resource_type": "tasks",
    "record_id": "abc-123",
    "attributes": {
      "content": "Updated task description"
    }
  }
}
```

### Example 4: Batch Operations

**Legacy**:

```json
{
  "tool": "batch-create-companies",
  "params": {
    "companies": [...]
  }
}
```

**Universal**:

```json
{
  "tool": "records_batch",
  "params": {
    "resource_type": "companies",
    "operation": "create",
    "records": [...]
  }
}
```

## Complete Mapping Table

### Company Tools

| Legacy Tool                   | Universal Tool                   | Resource Type |
| ----------------------------- | -------------------------------- | ------------- |
| `search-companies`            | `records_search`                 | `companies`   |
| `get-company-details`         | `records_get_details`            | `companies`   |
| `create-company`              | `create-record`                  | `companies`   |
| `update-company`              | `update-record`                  | `companies`   |
| `delete-company`              | `delete-record`                  | `companies`   |
| `get-company-attributes`      | `records_get_attributes`         | `companies`   |
| `discover-company-attributes` | `records_discover_attributes`    | `companies`   |
| `get-company-basic-info`      | `records_get_info`               | `companies`   |
| `get-company-contact-info`    | `records_get_info`               | `companies`   |
| `get-company-business-info`   | `records_get_info`               | `companies`   |
| `get-company-social-info`     | `records_get_info`               | `companies`   |
| `advanced-search-companies`   | `records_search_advanced`        | `companies`   |
| `search-companies-by-notes`   | `records_search_by_content`      | `companies`   |
| `search-companies-by-people`  | `records_search_by_relationship` | `companies`   |
| `batch-create-companies`      | `records_batch`                  | `companies`   |
| `batch-update-companies`      | `records_batch`                  | `companies`   |
| `batch-delete-companies`      | `records_batch`                  | `companies`   |
| `batch-search-companies`      | `records_search_batch`           | `companies`   |
| `batch-get-company-details`   | `records_batch`                  | `companies`   |

### People Tools

| Legacy Tool                          | Universal Tool                   | Resource Type |
| ------------------------------------ | -------------------------------- | ------------- |
| `search-people`                      | `records_search`                 | `people`      |
| `get-person-details`                 | `records_get_details`            | `people`      |
| `create-person`                      | `create-record`                  | `people`      |
| `advanced-search-people`             | `records_search_advanced`        | `people`      |
| `search-people-by-company`           | `records_search_by_relationship` | `people`      |
| `search-people-by-activity`          | `records_search_by_content`      | `people`      |
| `search-people-by-notes`             | `records_search_by_content`      | `people`      |
| `search-people-by-creation-date`     | `records_search_by_timeframe`    | `people`      |
| `search-people-by-modification-date` | `records_search_by_timeframe`    | `people`      |
| `search-people-by-last-interaction`  | `records_search_by_timeframe`    | `people`      |

### Task Tools

| Legacy Tool   | Universal Tool   | Resource Type |
| ------------- | ---------------- | ------------- |
| `create-task` | `create-record`  | `tasks`       |
| `update-task` | `update-record`  | `tasks`       |
| `delete-task` | `delete-record`  | `tasks`       |
| `list-tasks`  | `records_search` | `tasks`       |

### Record Tools

| Legacy Tool            | Universal Tool        | Resource Type |
| ---------------------- | --------------------- | ------------- |
| `get-record`           | `records_get_details` | (any)         |
| `list-records`         | `records_search`      | (any)         |
| `batch-create-records` | `records_batch`       | (any)         |
| `batch-update-records` | `records_batch`       | (any)         |

## Parameter Transformations

### Common Parameter Changes

| Legacy Parameter     | Universal Parameter | Notes                           |
| -------------------- | ------------------- | ------------------------------- |
| `company_id`         | `record_id`         | Unified identifier              |
| `person_id`          | `record_id`         | Unified identifier              |
| `task_id`            | `record_id`         | Unified identifier              |
| Top-level attributes | `attributes` object | Nested structure                |
| N/A                  | `resource_type`     | **Required** in universal tools |

### Attributes Nesting

Legacy tools accepted attributes at the top level:

```json
{
  "name": "Acme Corp",
  "domain": "acme.com"
}
```

Universal tools require attributes in an `attributes` object:

```json
{
  "resource_type": "companies",
  "attributes": {
    "name": "Acme Corp",
    "domain": "acme.com"
  }
}
```

## Testing Your Migration

### 1. Enable Legacy Tools (temporary)

```bash
DISABLE_UNIVERSAL_TOOLS=true npm run dev
```

### 2. Run Side-by-Side Tests

Test both legacy and universal tools with the same data to verify identical results.

### 3. Switch to Universal Tools

Remove `DISABLE_UNIVERSAL_TOOLS` to use universal tools by default.

### 4. Verify No Warnings

Run your application - you should see NO deprecation warnings.

## Need Help?

- **Documentation**: See `test/legacy/README.md` for test examples
- **Tool Aliases**: Automatic aliasing available via `MCP_DISABLE_TOOL_ALIASES=false`
- **Issues**: Report migration issues at https://github.com/kesslerio/attio-mcp-server/issues

## Related Documentation

- [Universal Tool API Reference](../README.md#universal-tools)
- [Legacy Test Files](../test/legacy/README.md)
- [Tool Configuration](../src/handlers/tool-configs/universal/index.ts)
