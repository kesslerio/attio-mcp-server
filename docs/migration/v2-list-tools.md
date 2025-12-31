# List Tools Consolidation Migration Guide

**Effective**: v1.5.0 (deprecation warnings)
**Removal**: v2.0.0 (Q1 2026)
**Issue**: #1059 (Epic), #1071 (Deprecation PR)

## Overview

The list tools have been consolidated from **11 tools → 4 tools** for better consistency and simpler API surface.

### What Changed?

**Tool Count Reduction**:

- **Filter Operations**: 5 → 1 (`filter-list-entries` with 4 modes)
- **Entry Management**: 3 → 1 (`manage-list-entry` with 3 modes)
- **List Discovery**: 2 → Universal tools (`search_records`, `get_record_details`)
- **Still Active**: 2 unchanged (`get-list-entries`, `get-record-list-memberships`)

### Benefits

- **Simpler API**: Learn 4 tools instead of 11
- **Auto-Mode Detection**: Tools detect operation from parameters
- **Consistent Patterns**: Unified parameter structure
- **Full Compatibility**: All existing calls work unchanged

### Timeline

| Version | Status   | Action                                          |
| ------- | -------- | ----------------------------------------------- |
| v1.4.0  | Released | Static deprecation notices in tool descriptions |
| v1.5.0  | Current  | Runtime deprecation warnings (this guide)       |
| v2.0.0  | Q1 2026  | Deprecated tools removed                        |

---

## Quick Reference: Deprecated Tools Mapping

### Filter Operations (PR #1074)

| Deprecated Tool                    | →   | New Tool              | Mode   | Parameters                                 |
| ---------------------------------- | --- | --------------------- | ------ | ------------------------------------------ |
| `filter-list-entries`              | ✓   | `filter-list-entries` | Mode 1 | `attributeSlug`, `filterValue` (unchanged) |
| `advanced-filter-list-entries`     | ⚠️  | `filter-list-entries` | Mode 2 | `filters` (AND/OR logic)                   |
| `filter-list-entries-by-parent`    | ⚠️  | `filter-list-entries` | Mode 3 | `parentObjectType`, `parentAttributeSlug`  |
| `filter-list-entries-by-parent-id` | ⚠️  | `filter-list-entries` | Mode 4 | `parentRecordId` (UUID)                    |

### Entry Management Operations (PR #1076)

| Deprecated Tool           | →   | New Tool            | Mode   | Parameters               |
| ------------------------- | --- | ------------------- | ------ | ------------------------ |
| `add-record-to-list`      | ⚠️  | `manage-list-entry` | Mode 1 | `recordId`, `objectType` |
| `remove-record-from-list` | ⚠️  | `manage-list-entry` | Mode 2 | `entryId`                |
| `update-list-entry`       | ⚠️  | `manage-list-entry` | Mode 3 | `entryId`, `attributes`  |

### List Discovery Operations (Universal Tools)

| Deprecated Tool    | →   | Universal Tool       | Parameters                                       |
| ------------------ | --- | -------------------- | ------------------------------------------------ |
| `get-lists`        | ⚠️  | `search_records`     | `resource_type: "lists"`                         |
| `get-list-details` | ⚠️  | `get_record_details` | `resource_type: "lists"`, `record_id: <list_id>` |

**Legend**: ✓ Active | ⚠️ Deprecated (removal v2.0.0)

---

## Detailed Migration Examples

### 1. Advanced Filtering (Mode 2)

**Before (deprecated)**:

```typescript
await client.callTool('advanced-filter-list-entries', {
  listId: 'list_abc123',
  filters: {
    and: [
      { attribute: 'deal_stage', operator: '$eq', value: 'Negotiation' },
      { attribute: 'deal_value', operator: '$gte', value: 50000 },
    ],
  },
  limit: 20,
});
```

**After (consolidated)**:

```typescript
await client.callTool('filter-list-entries', {
  listId: 'list_abc123',
  filters: {
    // Mode 2 auto-detected from 'filters' parameter
    and: [
      { attribute: 'deal_stage', operator: '$eq', value: 'Negotiation' },
      { attribute: 'deal_value', operator: '$gte', value: 50000 },
    ],
  },
  limit: 20,
});
```

**Migration Steps**:

1. Change tool name: `advanced-filter-list-entries` → `filter-list-entries`
2. Keep all parameters identical
3. Tool auto-detects Mode 2 from `filters` parameter

---

### 2. Filter by Parent Attribute (Mode 3)

**Before (deprecated)**:

```typescript
await client.callTool('filter-list-entries-by-parent', {
  listId: 'list_deals',
  parentObjectType: 'companies',
  parentAttributeSlug: 'industry',
  parentAttributeValue: 'Technology',
});
```

**After (consolidated)**:

```typescript
await client.callTool('filter-list-entries', {
  listId: 'list_deals',
  parentObjectType: 'companies', // Mode 3 auto-detected
  parentAttributeSlug: 'industry',
  parentAttributeValue: 'Technology',
});
```

**Migration Steps**:

1. Change tool name: `filter-list-entries-by-parent` → `filter-list-entries`
2. Keep all parameters identical
3. Tool auto-detects Mode 3 from `parentObjectType` + `parentAttributeSlug`

---

### 3. Filter by Parent UUID (Mode 4)

**Before (deprecated)**:

```typescript
await client.callTool('filter-list-entries-by-parent-id', {
  listId: 'list_deals',
  parentRecordId: 'company_xyz789',
});
```

**After (consolidated)**:

```typescript
await client.callTool('filter-list-entries', {
  listId: 'list_deals',
  parentRecordId: 'company_xyz789', // Mode 4 auto-detected
});
```

**Migration Steps**:

1. Change tool name: `filter-list-entries-by-parent-id` → `filter-list-entries`
2. Keep `parentRecordId` parameter identical
3. Tool auto-detects Mode 4 from `parentRecordId` UUID

---

### 4. Add Record to List (Mode 1)

**Before (deprecated)**:

```typescript
await client.callTool('add-record-to-list', {
  listId: 'list_abc123',
  recordId: 'company_xyz789',
  objectType: 'companies',
  initialValues: {
    deal_stage: 'Discovery',
    deal_value: 75000,
  },
});
```

**After (consolidated)**:

```typescript
await client.callTool('manage-list-entry', {
  listId: 'list_abc123',
  recordId: 'company_xyz789', // Mode 1 auto-detected from recordId
  objectType: 'companies',
  initialValues: {
    deal_stage: 'Discovery',
    deal_value: 75000,
  },
});
```

**Migration Steps**:

1. Change tool name: `add-record-to-list` → `manage-list-entry`
2. Keep all parameters identical
3. Tool auto-detects Mode 1 (Add) from `recordId` parameter

---

### 5. Remove Record from List (Mode 2)

**Before (deprecated)**:

```typescript
await client.callTool('remove-record-from-list', {
  listId: 'list_abc123',
  entryId: 'entry_def456',
});
```

**After (consolidated)**:

```typescript
await client.callTool('manage-list-entry', {
  listId: 'list_abc123',
  entryId: 'entry_def456', // Mode 2 auto-detected (no recordId, no attributes)
});
```

**Migration Steps**:

1. Change tool name: `remove-record-from-list` → `manage-list-entry`
2. Keep parameters identical
3. Tool auto-detects Mode 2 (Remove) from `entryId` alone

---

### 6. Update List Entry (Mode 3)

**Before (deprecated)**:

```typescript
await client.callTool('update-list-entry', {
  listId: 'list_abc123',
  entryId: 'entry_def456',
  attributes: {
    deal_stage: 'Negotiation',
    expected_close_date: '2025-03-15',
  },
});
```

**After (consolidated)**:

```typescript
await client.callTool('manage-list-entry', {
  listId: 'list_abc123',
  entryId: 'entry_def456', // Mode 3 auto-detected from entryId + attributes
  attributes: {
    deal_stage: 'Negotiation',
    expected_close_date: '2025-03-15',
  },
});
```

**Migration Steps**:

1. Change tool name: `update-list-entry` → `manage-list-entry`
2. Keep all parameters identical
3. Tool auto-detects Mode 3 (Update) from `entryId` + `attributes`

---

### 7. Get All Lists → Universal Search

**Before (deprecated)**:

```typescript
await client.callTool('get-lists', {
  limit: 20,
});
```

**After (universal tool)**:

```typescript
await client.callTool('search_records', {
  resource_type: 'lists',
  limit: 20,
});
```

**Migration Steps**:

1. Change tool name: `get-lists` → `search_records`
2. Add parameter: `resource_type: 'lists'`
3. Keep `limit` parameter

**Note**: Returns identical list format (not wrapped in `values` - see #1068)

---

### 8. Get List Details → Universal Get

**Before (deprecated)**:

```typescript
await client.callTool('get-list-details', {
  id: 'list_abc123',
});
```

**After (universal tool)**:

```typescript
await client.callTool('get_record_details', {
  resource_type: 'lists',
  record_id: 'list_abc123',
});
```

**Migration Steps**:

1. Change tool name: `get-list-details` → `get_record_details`
2. Add parameter: `resource_type: 'lists'`
3. Rename parameter: `id` → `record_id`

---

## Visual Comparison: Before & After

### Filter Operations (5 → 1)

```
❌ Before (5 tools)                    ✅ After (1 tool with modes)
├─ filter-list-entries               ├─ filter-list-entries
├─ advanced-filter-list-entries      │  ├─ Mode 1: Simple (attributeSlug detected)
├─ filter-list-entries-by-parent     │  ├─ Mode 2: Advanced (filters detected)
├─ filter-list-entries-by-parent-id  │  ├─ Mode 3: Parent Attr (parentObjectType detected)
└─ (4 different tools to learn)      │  └─ Mode 4: Parent UUID (parentRecordId detected)
                                      └─ (1 tool, auto-mode detection)
```

### Entry Management (3 → 1)

```
❌ Before (3 tools)                    ✅ After (1 tool with modes)
├─ add-record-to-list                ├─ manage-list-entry
├─ remove-record-from-list           │  ├─ Mode 1: Add (recordId detected)
├─ update-list-entry                 │  ├─ Mode 2: Remove (entryId only)
└─ (3 different tools to learn)      │  └─ Mode 3: Update (entryId + attributes)
                                      └─ (1 tool, auto-mode detection)
```

---

## Testing Your Migration

### 1. Search for Deprecated Tools

```bash
# Find deprecated tool usage in your codebase
rg "get-lists|get-list-details|advanced-filter-list-entries|filter-list-entries-by-parent|filter-list-entries-by-parent-id|add-record-to-list|remove-record-from-list|update-list-entry" --type ts
```

### 2. Run with Warnings Enabled

```bash
# Set log level to see deprecation warnings
MCP_LOG_LEVEL=WARN npm run dev
```

### 3. Verify No Warnings After Migration

After updating your code, run again and confirm no deprecation warnings appear.

### 4. Test Parity

Verify that migrated calls produce identical results:

- Same response structure
- Same data returned
- Same error behavior

---

## Breaking Changes

**None** - Full backward compatibility maintained through v1.x releases.

- All deprecated tools continue to work identically
- No parameter changes required for existing calls
- Runtime warnings provide migration guidance
- Breaking removal only in v2.0.0 (Q1 2026)

---

## FAQ

### Q: Do I need to migrate immediately?

**A**: No. Deprecated tools work identically in v1.x releases. Warnings help you prepare for v2.0.0 removal (Q1 2026).

### Q: Will my existing code break?

**A**: No. All deprecated tools maintain full backward compatibility until v2.0.0.

### Q: How do I silence the warnings?

**A**: Set `MCP_LOG_LEVEL=ERROR` to suppress WARN-level deprecation messages. Not recommended - warnings help identify code needing updates.

### Q: What if I'm using `get-lists` or `get-list-details`?

**A**: Migrate to universal tools (`search_records`, `get_record_details`) with `resource_type: "lists"`. See examples 7-8 above.

### Q: Are there any performance differences?

**A**: No. Consolidated tools use identical underlying APIs. Auto-mode detection adds negligible overhead (<1ms).

### Q: Can I mix old and new tools?

**A**: Yes, but not recommended. Choose one approach for consistency in your codebase.

### Q: What about tests using deprecated tools?

**A**: Update test files to use consolidated tools. Examples in `/test/e2e/suites/lists-management/`.

---

## Need Help?

- **Documentation**: See `/docs/mcp-tools/lists-tools.md` for complete API reference
- **Universal Tools**: See `/docs/universal-tools/migration-guide.md` for universal tool migrations
- **Issues**: Report problems at https://github.com/kesslerio/attio-mcp-server/issues
- **Examples**: Check `/test/e2e/suites/lists-management/` for working test code
