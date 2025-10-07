# MCP Tool Modes Architecture

## Overview

The Attio MCP Server supports two distinct tool modes to accommodate different ChatGPT integration scenarios. This document explains the architecture, implementation details, and deployment considerations for tool mode filtering.

**Related Issue**: [#869](https://github.com/kesslerio/attio-mcp-server/issues/869) - ChatGPT tool discovery fix

---

## Tool Modes

### Full Mode (Default)

**Exposes**: All 33 universal tools
**Required**: ChatGPT Pro/Team/Enterprise/Edu with Developer Mode enabled
**Configuration**: `ATTIO_MCP_TOOL_MODE` unset or explicitly set to `"full"`

#### Tool Catalog (33 tools)

- **Core Operations** (8): `records_search`, `records_get_details`, `create-record`, `update-record`, `delete-record`, `records_discover_attributes`, `records_get_attributes`, `records_get_info`
- **Advanced Search** (4): `records_search_advanced`, `records_search_by_relationship`, `records_search_by_content`, `records_search_by_timeframe`
- **Batch Operations** (1): `records_search_batch`
- **List Management** (12): `get-lists`, `get-list-details`, `get-list-entries`, `filter-list-entries`, `advanced-filter-list-entries`, `add-record-to-list`, `remove-record-from-list`, `update-list-entry`, `filter-list-entries-by-parent`, `filter-list-entries-by-parent-id`, `get-record-list-memberships`, `list-workspace-members`
- **Workspace** (3): `list-workspace-members`, `search-workspace-members`, `get-workspace-member`
- **Notes** (2): `create-note`, `list-notes`
- **OpenAI Compatibility** (2): `search`, `fetch`
- **Health** (1): `aaa-health-check`

### Search-Only Mode

**Exposes**: 3 tools (`search`, `fetch`, `aaa-health-check`)
**Required**: Any ChatGPT account (no Developer Mode needed)
**Configuration**: `ATTIO_MCP_TOOL_MODE="search"`

#### Why Search-Only Mode Exists

**Problem**: Non-Developer Mode ChatGPT requires both `search` and `fetch` tools to install an MCP server, but **only allows those tools to execute**. Other tools are visible but silently ignored.

**Solution**: Search-only mode explicitly filters the tool catalog to prevent misleading UX where users see 33 tools but can only use 3.

**OpenAI Requirements**:

- MCP servers **must** expose `search` and `fetch` tools to install on non-Developer Mode ChatGPT
- ChatGPT silently **ignores** all other tools (no error, just doesn't call them)
- Developer Mode removes this restriction

**Reference**: [OpenAI Community Discussion](https://community.openai.com/t/chatgpt-only-uses-search-tool-in-mcp-server/1358796)

---

## Implementation

### Configuration Flow

```typescript
// 1. User configures in Smithery dashboard or smithery.yaml
exampleConfig: ATTIO_MCP_TOOL_MODE: 'full'; // or 'search'

// 2. Smithery passes config to server entry point
export default function createServer({ config }) {
  const toolMode = config?.ATTIO_MCP_TOOL_MODE || 'full';

  // 3. Set or delete environment variable
  if (toolMode === 'full') {
    delete process.env.ATTIO_MCP_TOOL_MODE; // Unset = full mode
  } else {
    process.env.ATTIO_MCP_TOOL_MODE = 'search';
  }
}

// 4. Tool filtering at discovery time
export function filterAllowedTools<T extends { name: string }>(
  tools: T[]
): T[] {
  if (!isSearchOnlyMode()) return tools; // Full mode

  // Search-only mode
  const SEARCH_ONLY_TOOLS = new Set(['search', 'fetch', 'aaa-health-check']);
  return tools.filter((tool) => SEARCH_ONLY_TOOLS.has(tool.name));
}
```

### File Locations

| File                             | Purpose                                                             |
| -------------------------------- | ------------------------------------------------------------------- |
| `src/smithery.ts`                | Entry point for Smithery deployments; reads config and sets env var |
| `src/config/tool-mode.ts`        | Core filtering logic (`isSearchOnlyMode()`, `filterAllowedTools()`) |
| `src/utils/mcp-discovery.ts`     | Applies tool filtering when building tool catalog                   |
| `src/handlers/tools/registry.ts` | Uses filtered tools for MCP tool registration                       |
| `smithery.yaml`                  | User-facing configuration with inline documentation                 |

---

## Deployment Scenarios

### Scenario 1: ChatGPT Developer Mode (Recommended)

**User Profile**: Pro/Team/Enterprise user with Developer Mode enabled

**Configuration**:

```yaml
exampleConfig:
  ATTIO_MCP_TOOL_MODE: 'full'
```

**Result**:

- ✅ All 33 tools available
- ✅ Write operations (`create-record`, `update-record`) trigger approval prompts
- ✅ Read operations (`records_search`, `get-list-details`) auto-approved
- ✅ Full Attio CRM functionality

**Testing**:

```bash
# In ChatGPT, verify tool count
"List all available Attio tools"
# Should see ~33 tools with descriptions
```

### Scenario 2: ChatGPT Without Developer Mode

**User Profile**: Standard ChatGPT user or Plus without Developer Mode

**Configuration**:

```yaml
exampleConfig:
  ATTIO_MCP_TOOL_MODE: 'search'
```

**Result**:

- ✅ 3 tools visible (`search`, `fetch`, `aaa-health-check`)
- ✅ Clear user expectations (no misleading tool catalog)
- ❌ No write operations available
- ⚠️ Limited functionality (read-only search/retrieval)

**Testing**:

```bash
# In ChatGPT, verify tool count
"List all available Attio tools"
# Should see exactly 3 tools: search, fetch, aaa-health-check
```

### Scenario 3: Developer Mode Accidentally Disabled (Issue #869)

**Problem**: User expects full tools but only sees `search` and `fetch`

**Root Cause**: Either:

1. `ATTIO_MCP_TOOL_MODE` was explicitly set to `"search"` in configuration
2. Smithery deployment defaulted to search-only mode (pre-v1.1.1 bug)

**Solution**:

1. Check Smithery configuration: ensure `ATTIO_MCP_TOOL_MODE: 'full'` (or unset)
2. Redeploy server (v1.1.1+ enforces full mode by default)
3. Reconnect in ChatGPT

**Verification**:

```bash
# Check effective tool mode
"What tools do you have access to from Attio?"
# Should list ~33 tools if Developer Mode is enabled
```

---

## Troubleshooting

### "ChatGPT only sees search and fetch tools"

**Symptoms**:

- ChatGPT Developer Mode enabled
- Only 3 tools visible: `search`, `fetch`, `aaa-health-check`
- Write operations don't appear in tool catalog

**Diagnosis**:

```yaml
# Check Smithery configuration
exampleConfig:
  ATTIO_MCP_TOOL_MODE: 'search' # ← WRONG for Developer Mode
```

**Fix**:

```yaml
# Update to full mode
exampleConfig:
  ATTIO_MCP_TOOL_MODE: 'full' # ← CORRECT
```

**Redeploy**: Push changes to Smithery, wait for deployment, reconnect in ChatGPT

### "ChatGPT ignores write tools even though I see them"

**Symptoms**:

- All 33 tools visible in ChatGPT tool list
- ChatGPT only calls `search` and `fetch` tools
- Write operations are mentioned but never executed

**Diagnosis**: **Developer Mode is NOT enabled** despite tool visibility

**Explanation**:

- Pre-v1.1.1: ChatGPT would always show all tools even without Developer Mode
- ChatGPT silently filtered tool calls client-side (only search/fetch worked)
- Post-v1.1.1: Server-side filtering prevents this misleading UX

**Fix**:

1. Enable Developer Mode in ChatGPT settings (`Settings → Connectors → Advanced → Developer Mode`)
2. Or switch to search-only mode if Developer Mode is unavailable:
   ```yaml
   exampleConfig:
     ATTIO_MCP_TOOL_MODE: 'search'
   ```

### "Server deployed but tool count is wrong"

**Verification Steps**:

1. **Check server version**:

   ```bash
   # Call health-check tool
   "Check Attio server health"
   # Response should include version: 1.1.1 or later
   ```

2. **Check effective tool mode**:

   ```typescript
   // In server logs (Smithery deployment logs)
   // Look for: "Tool mode: full" or "Tool mode: search"
   ```

3. **Verify Smithery configuration**:
   - Open Smithery dashboard
   - Navigate to server settings
   - Confirm `ATTIO_MCP_TOOL_MODE` value

4. **Force redeploy**:
   ```bash
   # Make a trivial change to trigger redeployment
   git commit --allow-empty -m "chore: trigger Smithery redeploy"
   git push origin main
   ```

---

## Testing

### Unit Tests

**File**: `test/config/tool-mode.test.ts`

```typescript
describe('Tool Mode Filtering', () => {
  it('exposes 33+ tools in full mode', () => {
    delete process.env.ATTIO_MCP_TOOL_MODE;
    const tools = flattenToolDefinitions();
    expect(tools.length).toBeGreaterThanOrEqual(30);
  });

  it('exposes exactly 3 tools in search-only mode', () => {
    process.env.ATTIO_MCP_TOOL_MODE = 'search';
    const tools = flattenToolDefinitions();
    expect(tools.length).toBe(3);
    expect(tools.map((t) => t.name)).toEqual([
      'search',
      'fetch',
      'aaa-health-check',
    ]);
  });
});
```

### Integration Tests

**File**: `test/integration/smithery-tool-mode.test.ts`

```typescript
describe('Smithery Tool Mode Configuration', () => {
  it('applies user config to environment', () => {
    const server = createServer({ config: { ATTIO_MCP_TOOL_MODE: 'search' } });
    expect(process.env.ATTIO_MCP_TOOL_MODE).toBe('search');
  });

  it('defaults to full mode when config is empty', () => {
    const server = createServer({ config: {} });
    expect(process.env.ATTIO_MCP_TOOL_MODE).toBeUndefined();
  });
});
```

### End-to-End Tests

**Manual Verification** (requires real ChatGPT account):

1. Deploy with `ATTIO_MCP_TOOL_MODE: 'full'`
2. Connect in ChatGPT with Developer Mode enabled
3. Verify tool count: `"List all Attio tools"` → Should see 30+ tools
4. Test write operation: `"Create a test company in Attio"` → Should trigger approval prompt
5. Verify approval: Accept → Company created successfully

---

## Migration Guide

### Upgrading from v1.0.0-v1.1.0 to v1.1.1+

**What Changed**:

- v1.0.0-v1.1.0: Tool mode was silently set to `'search'` during Smithery deployment
- v1.1.1+: Tool mode explicitly defaults to `'full'` unless configured otherwise

**Action Required**:

**For Developer Mode Users** (no action needed):

- Server now defaults to full mode (all 33 tools)
- Redeploy will automatically fix Issue #869

**For Non-Developer Mode Users** (must configure):

- Explicitly set `ATTIO_MCP_TOOL_MODE: 'search'` in Smithery configuration
- Prevents misleading UX where 33 tools are shown but only 3 work

**Configuration Example**:

```yaml
# smithery.yaml or Smithery dashboard
exampleConfig:
  ATTIO_API_KEY: 'your-key'
  ATTIO_MCP_TOOL_MODE: 'search' # ← Add this for non-Developer Mode
```

### Updating Local Development

**Claude Desktop** (local development):

```json
// .claude/config.json
{
  "servers": {
    "attio": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "ATTIO_API_KEY": "your-key",
        "ATTIO_MCP_TOOL_MODE": "full" // Optional, defaults to full
      }
    }
  }
}
```

**Smithery Development** (ngrok tunnel):

```bash
# Full mode (default)
npm run dev

# Search-only mode
ATTIO_MCP_TOOL_MODE=search npm run dev
```

---

## Related Documentation

- [ChatGPT Developer Mode Integration](../chatgpt-developer-mode.md) - Complete setup guide
- [Troubleshooting Guide](../../TROUBLESHOOTING.md) - Common tool mode issues
- [Smithery Deployment Guide](../deployment/smithery-cli-setup.md) - Deployment best practices
- [Universal Tools API Reference](../universal-tools/api-reference.md) - Full tool catalog

---

## Changelog

- **v1.1.1** (2025-10-06): Added configurable tool mode with explicit defaults (Issue #869)
- **v1.0.0** (2025-09-27): Initial tool mode filtering support (Issue #766)
