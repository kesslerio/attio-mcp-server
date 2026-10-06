# Migration Guide

This guide covers three major migrations:

1. **Resource-first tool names** - one advertised catalog; prior default names stay call-only through v2.x
2. **Legacy Tools → Universal Tools** (#1022) - Resource-specific tools consolidation
3. **List Tools Consolidation** (#1059) - List-specific tools reduced from 11 → 4 tools

---

## Migration 1: Resource-first tool names

**Status**: Prior default-catalog names are call-only aliases through v2.x
**Removal**: v3.0.0
**Effective**: Current version

### Overview

`tools/list`, CLI discovery, and the schema linter advertise one resource-first catalog. `search`, `fetch`, and `aaa-health-check` are unchanged.

A prior default name still calls that same tool:

- Resolution only renames the tool. Arguments and `resource_type` stay as the caller sent them.
- Alias names are not `tools/list` entries and are not suggested in tool descriptions or prompts.
- Mode checks run after resolution, on the canonical name. In search-only mode the allowlist is `search`, `fetch`, and `aaa-health-check`. A prior name cannot reach a hidden write.
- `MCP_DISABLE_TOOL_ALIASES=true` makes every prior name fail. Canonical names keep working.

These names fail immediately. They are not aliases:

`search-records`, `get-record-details`, `get-attributes`, `discover-attributes`, `get-detailed-info`, `get-record-interactions`, `advanced-search`, `search-by-relationship`, `search-by-content`, `search-by-timeframe`, `batch-operations`, `batch-search`, `create-record`, `update-record`, `delete-record`, `create-note`, `list-notes`, `smithery-debug-config`, `records_search_batch`

The map below is the only migration map. It is defined in `src/constants/tool-names.ts`.

### Prior name to canonical name

| Prior name (call-only until v3.0.0) | Canonical name |
| --- | --- |
| `search_records` | `records_search` |
| `get_record_details` | `records_get_details` |
| `create_record` | `records_create` |
| `update_record` | `records_update` |
| `upsert_record` | `records_upsert` |
| `delete_record` | `records_delete` |
| `merge_records` | `records_merge` |
| `create_company` | `companies_create` |
| `update_company` | `companies_update` |
| `create_deal` | `deals_create` |
| `update_deal` | `deals_update` |
| `get_record_attributes` | `records_get_attributes` |
| `discover_record_attributes` | `records_discover_attributes` |
| `get_record_attribute_options` | `records_get_attribute_options` |
| `get_record_info` | `records_get_info` |
| `get_record_interactions` | `records_get_interactions` |
| `create_note` | `notes_create` |
| `list_notes` | `notes_list` |
| `search_records_advanced` | `records_search_advanced` |
| `search_records_by_relationship` | `records_search_by_relationship` |
| `search_records_by_content` | `records_search_by_content` |
| `search_records_by_timeframe` | `records_search_by_timeframe` |
| `batch_records` | `records_batch` |
| `batch_search_records` | `records_batch_search` |
| `get-lists` | `lists_list` |
| `get-record-list-memberships` | `records_get_list_memberships` |
| `get-list-details` | `lists_get` |
| `get-list-entries` | `list_entries_list` |
| `filter-list-entries` | `list_entries_filter` |
| `advanced-filter-list-entries` | `list_entries_filter_advanced` |
| `add-record-to-list` | `list_entries_add` |
| `remove-record-from-list` | `list_entries_remove` |
| `update-list-entry` | `list_entries_update` |
| `manage-list-entry` | `list_entries_manage` |
| `filter-list-entries-by-parent` | `list_entries_filter_by_parent` |
| `filter-list-entries-by-parent-id` | `list_entries_filter_by_parent_id` |
| `create-list` | `lists_create` |
| `update-list-configuration` | `lists_update_configuration` |
| `list-workspace-members` | `workspace_members_list` |
| `search-workspace-members` | `workspace_members_search` |
| `get-workspace-member` | `workspace_members_get` |
| `smithery_debug_config` | `diagnostics_get` |

### Examples

Search:

```json
{ "tool": "records_search", "params": { "resource_type": "companies" } }
```

The prior name `search_records` calls the same tool with the same arguments. `search-records` does not resolve.

Create:

```json
{ "tool": "records_create", "params": { "resource_type": "people", "record_data": {} } }
```

`create_record` is the call-only alias. `create-record` fails.

### Checking a client

1. Take tool names from `tools/list` or `attio-discover tools`.
2. If a saved client still sends a prior name from the table, leave the arguments unchanged.
3. Set `MCP_DISABLE_TOOL_ALIASES=true` to confirm the client no longer depends on prior names.
4. Treat any name in the removed list as a hard failure.

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
| Search records      | `records_search`             | `search-companies`, `search-people`, `list-tasks`    |
| Get details         | `records_get_details`         | `get-company-details`, `get-person-details`          |
| Create record       | `records_create`              | `create-company`, `create-person`, `create-task`     |
| Update record       | `records_update`              | `update-company`, `update-task`                      |
| Delete record       | `records_delete`              | `delete-company`, `delete-task`                      |
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
| Batch search           | `records_batch_search`           | `batch-search-companies`                                               |

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

**Universal (MCP-compliant)**:

```json
{
  "tool": "records_create",
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
  "tool": "records_update",
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
  "tool": "records_batch",
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
| `search-companies`            | `records_search`                 | `companies`   |
| `get-company-details`         | `records_get_details`             | `companies`   |
| `create-company`              | `records_create`                  | `companies`   |
| `update-company`              | `records_update`                  | `companies`   |
| `delete-company`              | `records_delete`                  | `companies`   |
| `get-company-attributes`      | `records_get_attributes`          | `companies`   |
| `discover-company-attributes` | `records_discover_attributes`     | `companies`   |
| `get-company-basic-info`      | `records_get_info`                | `companies`   |
| `get-company-contact-info`    | `records_get_info`                | `companies`   |
| `get-company-business-info`   | `records_get_info`                | `companies`   |
| `get-company-social-info`     | `records_get_info`                | `companies`   |
| `advanced-search-companies`   | `records_search_advanced`        | `companies`   |
| `search-companies-by-notes`   | `records_search_by_content`      | `companies`   |
| `search-companies-by-people`  | `records_search_by_relationship` | `companies`   |
| `batch-create-companies`      | `records_batch`                  | `companies`   |
| `batch-update-companies`      | `records_batch`                  | `companies`   |
| `batch-delete-companies`      | `records_batch`                  | `companies`   |
| `batch-search-companies`      | `records_batch_search`           | `companies`   |
| `batch-get-company-details`   | `records_batch`                  | `companies`   |

### People Tools

| Legacy Tool                          | Universal Tool                   | Resource Type |
| ------------------------------------ | -------------------------------- | ------------- |
| `search-people`                      | `records_search`                 | `people`      |
| `get-person-details`                 | `records_get_details`             | `people`      |
| `create-person`                      | `records_create`                  | `people`      |
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
| `create-task` | `records_create`  | `tasks`       |
| `update-task` | `records_update`  | `tasks`       |
| `delete-task` | `records_delete`  | `tasks`       |
| `list-tasks`  | `records_search` | `tasks`       |

### Record Tools

| Legacy Tool            | Universal Tool       | Resource Type |
| ---------------------- | -------------------- | ------------- |
| `get-record`           | `records_get_details` | (any)         |
| `list-records`         | `records_search`     | (any)         |
| `batch-create-records` | `records_batch`      | (any)         |
| `batch-update-records` | `records_batch`      | (any)         |

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

- `list_entries_filter` enhanced with 4 auto-detected modes
- Deprecated: `advanced-filter-list-entries`, `filter-list-entries-by-parent`, `filter-list-entries-by-parent-id`

**Entry Management** (3 → 1):

- `list_entries_manage` enhanced with 3 auto-detected modes
- Deprecated: `add-record-to-list`, `remove-record-from-list`, `update-list-entry`

**List Discovery** (2 → Universal):

- Migrated to universal tools: `records_search`, `records_get_details`
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
    "condition": "equals",
    "value": "Technology"
  }
}
```

**New (consolidated)**:

```json
{
  "tool": "list_entries_filter",
  "params": {
    "listId": "list_deals",
    "parentObjectType": "companies",
    "parentAttributeSlug": "industry",
    "condition": "equals",
    "value": "Technology"
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
  "tool": "list_entries_manage",
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

---

## Migration 4: Structured Results for Lists, Members, Diagnostics, and Connectors

Tool names and input arguments are unchanged. Clients that parsed list, member,
or diagnostic responses directly from `content[0].text` must switch to
`structuredContent` or parse the envelope in that text block. The authoritative
[structured surface contract](./universal-tools/developer-guide.md#structured-surface-coverage-v2-boundary-d)
owns the success projections, connector compatibility exception, and cursor
limitations; boundary A in that guide owns error handling and prose opt-out.

### Updating a client

- For list collections, replace direct array indexing with `data[i]`; for list
  details and entry writes, unwrap `data` before reading native identifiers.
- For entry removals, replace checks for the bare boolean `true` with checks of
  `success` and the affected list/entry identifiers.
- For list configuration writes and previews, unwrap `data` before reading the
  normalized configuration.
- For workspace member collections and lookups, unwrap `data`. Replace matching
  the "Workspace member not found." string with handling the `NOT_FOUND` error.
- For health and diagnostics, unwrap `data` before reading the payload.
- Connector clients may keep parsing their existing successful text documents,
  or migrate search items and fetched records to `structuredContent.data`. Pass
  search identifiers to fetch unchanged. Handle failures through `isError` and
  the shared error envelope.

### Verifying a client

```bash
# Advertise the schemas your mode permits, then compare against your parser.
curl -s "$MCP_ENDPOINT" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq '.result.tools[] | select(.name | test("lists_|list_entries_|workspace_members_")) | {name, outputSchema}'
```

---

## Migration 5: Collection Continuation (U5)

Collection tools gain machine-readable pagination state. The envelope fields
`data` and `count` are unchanged; `next_cursor` may now carry a token, and a
`pagination` disclosure may accompany it.

### Before (phase one)

```json
{ "data": [], "count": 0, "next_cursor": null }
```

`next_cursor` was always null, and null said nothing about whether results
were withheld.

### Updating a client

Read [Collection Continuation](universal-tools/api-reference.md#collection-continuation-u5)
for supported query paths, bounded-result disclosures, cursor replay rules,
limits, and expiration. Clients consuming the old envelope must accept the
additional `pagination` field and a non-null `next_cursor` on supported paths.

### Verifying a client

```bash
# Confirm the cursor input and pagination-aware output schema are advertised.
curl -s "$MCP_ENDPOINT" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq '.result.tools[] | select(.name == "records_search") | {inputSchema: .inputSchema.properties.cursor, outputSchema: .outputSchema}'
```
