# Migration Guide

This guide covers three major migrations:

1. **MCP-Compliant Naming** (#1039) - Universal tools using `snake_case`, verb-first format
2. **Legacy Tools → Universal Tools** (#1022) - Resource-specific tools consolidation
3. **List Tools Consolidation** (#1059) - List-specific tools reduced from 11 → 4 tools

---

## Migration 1: MCP-Compliant Naming (#1039)

**Status**: Old tool names deprecated (Q1 2026 removal target)
**Issue**: #1039
**Effective**: Current version

### Overview

All universal tools have been renamed to follow MCP ecosystem standards:

- **Format**: `snake_case` (not kebab-case)
- **Pattern**: Verb-first (not noun-first)
- **Examples**: `search_records`, `get_record_details`, `create_record`

### Why MCP-Compliant Naming?

- **Ecosystem Alignment**: Matches Desktop Commander, SEP-986, and official MCP docs
- **Consistency**: All MCP servers use `snake_case`, verb-first pattern
- **Standards Compliance**: Follows de-facto MCP conventions (`get_weather`, `list_repos`, `read_file`)

### Complete Naming Migration Table

| Old Name (Deprecated)            | New Name (MCP-Compliant)         | Category           |
| -------------------------------- | -------------------------------- | ------------------ |
| `records_search`                 | `search_records`                 | Universal Search   |
| `records_get_details`            | `get_record_details`             | Universal Metadata |
| `records_get_attributes`         | `get_record_attributes`          | Universal Metadata |
| `records_discover_attributes`    | `discover_record_attributes`     | Universal Metadata |
| `records_get_attribute_options`  | `get_record_attribute_options`   | Universal Metadata |
| `records_get_info`               | `get_record_info`                | Universal Metadata |
| `records_search_advanced`        | `search_records_advanced`        | Advanced Search    |
| `records_search_by_relationship` | `search_records_by_relationship` | Advanced Search    |
| `records_search_by_content`      | `search_records_by_content`      | Advanced Search    |
| `records_search_by_timeframe`    | `search_records_by_timeframe`    | Advanced Search    |
| `records_batch`                  | `batch_records`                  | Batch Operations   |
| `records_search_batch`           | `batch_search_records`           | Batch Operations   |
| `create-record`                  | `create_record`                  | CRUD Operations    |
| `update-record`                  | `update_record`                  | CRUD Operations    |
| `delete-record`                  | `delete_record`                  | CRUD Operations    |
| `create-note`                    | `create_note`                    | Note Operations    |
| `list-notes`                     | `list_notes`                     | Note Operations    |
| `smithery-debug-config`          | `smithery_debug_config`          | Debug/Diagnostics  |

### Backward Compatibility

**Dual Alias Support**: Both old formats continue to work until v2.0.0:

- Old noun-verb snake_case (e.g., `records_search`, `records_get_details`)
- Old kebab-case (e.g., `create-record`, `update-record`)
- Both emit deprecation warnings pointing to new canonical names

### Migration Examples

#### Example 1: Search Records

**Old (deprecated)**:

```json
{ "tool": "records_search", "params": { "resource_type": "companies" } }
```

**New (MCP-compliant)**:

```json
{ "tool": "search_records", "params": { "resource_type": "companies" } }
```

#### Example 2: Create Record

**Old (deprecated)**:

```json
{ "tool": "create-record", "params": { "resource_type": "people" } }
```

**New (MCP-compliant)**:

```json
{ "tool": "create_record", "params": { "resource_type": "people" } }
```

#### Example 3: Get Record Details

**Old (deprecated)**:

```json
{
  "tool": "records_get_details",
  "params": { "resource_type": "companies", "record_id": "abc123" }
}
```

**New (MCP-compliant)**:

```json
{
  "tool": "get_record_details",
  "params": { "resource_type": "companies", "record_id": "abc123" }
}
```

### Testing Your Migration

1. **Find old tool names**: Search your codebase for deprecated patterns
2. **Replace systematically**: Use the table above for 1:1 replacements
3. **Verify no warnings**: Run your application and check logs for deprecation warnings
4. **Update tests**: Ensure test assertions use new canonical names

---

## Migration 2: Legacy Tools → Universal Tools (#1022)

**Status**: Legacy tools deprecated (Q1 2026 removal target)
**Issue**: #1022
**Effective**: v1.3.7

### Overview

Legacy resource-specific tools (86 tools) are being consolidated into universal tools (20 tools) for better consistency, maintainability, and user experience.

### Why Universal Tools?

- **Consistency**: Single API for all resource types
- **Simplicity**: 65% reduction in tool count (86 → 20 tools)
- **Maintainability**: One implementation, fewer edge cases
- **Better Error Messages**: Standardized error handling across resources

### Timeline

- **Now**: Legacy tools deprecated, accessible via `DISABLE_UNIVERSAL_TOOLS=true`
- **Q1 2026**: Legacy tools removed in v2.0.0

### Environment Variables

- **Default (no env var)**: Universal tools enabled ✓
- **`DISABLE_UNIVERSAL_TOOLS=true`**: Enables legacy tools (deprecated)

> **Note**: `DISABLE_UNIVERSAL_TOOLS` is a legacy flag name. Setting it to `true` **enables** legacy tools, not disables universal tools.

## Quick Reference

### Core Universal Tools

| Operation           | Universal Tool               | Legacy Equivalents                                   |
| ------------------- | ---------------------------- | ---------------------------------------------------- |
| Search records      | `search_records`             | `search-companies`, `search-people`, `list-tasks`    |
| Get details         | `get_record_details`         | `get-company-details`, `get-person-details`          |
| Create record       | `create_record`              | `create-company`, `create-person`, `create-task`     |
| Update record       | `update_record`              | `update-company`, `update-task`                      |
| Delete record       | `delete_record`              | `delete-company`, `delete-task`                      |
| Get attributes      | `get_record_attributes`      | `get-company-attributes`                             |
| Discover attributes | `discover_record_attributes` | `discover-company-attributes`                        |
| Get detailed info   | `get_record_info`            | `get-company-basic-info`, `get-company-contact-info` |

### Advanced Universal Tools

| Operation              | Universal Tool                   | Legacy Equivalents                                                     |
| ---------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| Advanced search        | `search_records_advanced`        | `advanced-search-companies`, `advanced-search-people`                  |
| Search by relationship | `search_records_by_relationship` | `search-companies-by-people`, `search-people-by-company`               |
| Search by content      | `search_records_by_content`      | `search-companies-by-notes`, `search-people-by-notes`                  |
| Search by timeframe    | `search_records_by_timeframe`    | `search-people-by-creation-date`, `search-people-by-modification-date` |
| Batch operations       | `batch_records`                  | `batch-create-companies`, `batch-update-companies`                     |
| Batch search           | `batch_search_records`           | `batch-search-companies`                                               |

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

**Universal (MCP-compliant)**:

```json
{
  "tool": "search_records",
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

**Universal (MCP-compliant)**:

```json
{
  "tool": "create_record",
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

**Universal (MCP-compliant)**:

```json
{
  "tool": "update_record",
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

**Universal (MCP-compliant)**:

```json
{
  "tool": "batch_records",
  "params": {
    "resource_type": "companies",
    "operation": "create",
    "records": [...]
  }
}
```

## Complete Mapping Table

> **Note**: This mapping table may lag behind code changes. Use tool discovery output or the source definitions in `src/handlers/tool-configs/universal/index.ts:deprecatedToolMappings` as the authoritative reference.

### Company Tools

| Legacy Tool                   | Universal Tool                   | Resource Type |
| ----------------------------- | -------------------------------- | ------------- |
| `search-companies`            | `search_records`                 | `companies`   |
| `get-company-details`         | `get_record_details`             | `companies`   |
| `create-company`              | `create_record`                  | `companies`   |
| `update-company`              | `update_record`                  | `companies`   |
| `delete-company`              | `delete_record`                  | `companies`   |
| `get-company-attributes`      | `get_record_attributes`          | `companies`   |
| `discover-company-attributes` | `discover_record_attributes`     | `companies`   |
| `get-company-basic-info`      | `get_record_info`                | `companies`   |
| `get-company-contact-info`    | `get_record_info`                | `companies`   |
| `get-company-business-info`   | `get_record_info`                | `companies`   |
| `get-company-social-info`     | `get_record_info`                | `companies`   |
| `advanced-search-companies`   | `search_records_advanced`        | `companies`   |
| `search-companies-by-notes`   | `search_records_by_content`      | `companies`   |
| `search-companies-by-people`  | `search_records_by_relationship` | `companies`   |
| `batch-create-companies`      | `batch_records`                  | `companies`   |
| `batch-update-companies`      | `batch_records`                  | `companies`   |
| `batch-delete-companies`      | `batch_records`                  | `companies`   |
| `batch-search-companies`      | `batch_search_records`           | `companies`   |
| `batch-get-company-details`   | `batch_records`                  | `companies`   |

### People Tools

| Legacy Tool                          | Universal Tool                   | Resource Type |
| ------------------------------------ | -------------------------------- | ------------- |
| `search-people`                      | `search_records`                 | `people`      |
| `get-person-details`                 | `get_record_details`             | `people`      |
| `create-person`                      | `create_record`                  | `people`      |
| `advanced-search-people`             | `search_records_advanced`        | `people`      |
| `search-people-by-company`           | `search_records_by_relationship` | `people`      |
| `search-people-by-activity`          | `search_records_by_content`      | `people`      |
| `search-people-by-notes`             | `search_records_by_content`      | `people`      |
| `search-people-by-creation-date`     | `search_records_by_timeframe`    | `people`      |
| `search-people-by-modification-date` | `search_records_by_timeframe`    | `people`      |
| `search-people-by-last-interaction`  | `search_records_by_timeframe`    | `people`      |

### Task Tools

| Legacy Tool   | Universal Tool   | Resource Type |
| ------------- | ---------------- | ------------- |
| `create-task` | `create_record`  | `tasks`       |
| `update-task` | `update_record`  | `tasks`       |
| `delete-task` | `delete_record`  | `tasks`       |
| `list-tasks`  | `search_records` | `tasks`       |

### Record Tools

| Legacy Tool            | Universal Tool       | Resource Type |
| ---------------------- | -------------------- | ------------- |
| `get-record`           | `get_record_details` | (any)         |
| `list-records`         | `search_records`     | (any)         |
| `batch-create-records` | `batch_records`      | (any)         |
| `batch-update-records` | `batch_records`      | (any)         |

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

---

## Migration 3: List Tools Consolidation (#1059)

**Status**: Deprecated (v1.5.0), removal Q1 2026
**Issue**: #1059 (Epic), #1071 (Deprecation PR)
**Effective**: v1.5.0

### Overview

List-specific tools consolidated from **11 → 4 tools** for simpler API surface and better consistency.

### What Changed?

**Filter Operations** (5 → 1):

- `filter-list-entries` enhanced with 4 auto-detected modes
- Deprecated: `advanced-filter-list-entries`, `filter-list-entries-by-parent`, `filter-list-entries-by-parent-id`

**Entry Management** (3 → 1):

- `manage-list-entry` enhanced with 3 auto-detected modes
- Deprecated: `add-record-to-list`, `remove-record-from-list`, `update-list-entry`

**List Discovery** (2 → Universal):

- Migrated to universal tools: `search_records`, `get_record_details`
- Deprecated: `get-lists`, `get-list-details`

### Quick Summary

- Filter operations: 5 → 1 tool
- Entry management: 3 → 1 tool
- List discovery: 2 → Universal tools
- **Full backward compatibility** until v2.0.0

See **[List Tools Migration Guide](./migration/v2-list-tools.md)** for complete migration examples.

### Example Migrations

#### Filter by Parent Attribute

**Old (deprecated)**:

```json
{
  "tool": "filter-list-entries-by-parent",
  "params": {
    "listId": "list_deals",
    "parentObjectType": "companies",
    "parentAttributeSlug": "industry",
    "parentAttributeValue": "Technology"
  }
}
```

**New (consolidated)**:

```json
{
  "tool": "filter-list-entries",
  "params": {
    "listId": "list_deals",
    "parentObjectType": "companies",
    "parentAttributeSlug": "industry",
    "parentAttributeValue": "Technology"
  }
}
```

#### Add Record to List

**Old (deprecated)**:

```json
{
  "tool": "add-record-to-list",
  "params": {
    "listId": "list_abc123",
    "recordId": "company_xyz789",
    "objectType": "companies"
  }
}
```

**New (consolidated)**:

```json
{
  "tool": "manage-list-entry",
  "params": {
    "listId": "list_abc123",
    "recordId": "company_xyz789",
    "objectType": "companies"
  }
}
```

### Need Help?

See the complete **[List Tools Migration Guide](./migration/v2-list-tools.md)** for:

- All 8 deprecated tools with before/after examples
- Auto-mode detection explanation
- Visual comparisons
- Testing instructions
- FAQ
