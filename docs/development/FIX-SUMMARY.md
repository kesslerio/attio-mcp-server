# MCP Server Issue Fixes

This document summarizes the fixes applied to resolve three critical issues in the Attio MCP server.

## Issues Fixed

### 1. OneOf/AllOf/AnyOf Schema Issue
**Problem**: "tools.16.custom.input_schema: input_schema does not support oneOf, allOf, or anyOf at the top level"

**Solution**: Removed `oneOf` constructs from tool input schemas in `src/handlers/tool-configs/companies.ts`:
- `get-company-details`: Removed `oneOf` and set `required: []`
- `get-company-notes`: Removed `oneOf` and set `required: []`
- `create-company-note`: Removed `oneOf` and kept only `required: ["content"]`

### 2. Auto-Discovery Logging Issue
**Problem**: "Unexpected token 'A', '[AUTO-DISCO'..." - auto-discovery logs breaking MCP protocol

**Solution**: Changed logging in `src/utils/auto-discovery.ts` to write to stderr instead of stdout:
```typescript
const log = {
  info: (msg: string) => process.stderr.write(`[AUTO-DISCOVERY] ${msg}\n`),
  warn: (msg: string) => process.stderr.write(`[AUTO-DISCOVERY] [WARN] ${msg}\n`),
  error: (msg: string, error?: any) => process.stderr.write(`[AUTO-DISCOVERY] [ERROR] ${msg}${error ? `: ${error}` : ''}\n`)
};
```

### 3. Directory Creation Error
**Problem**: "ENOENT: no such file or directory, mkdir 'config/mappings'"

**Solution**: Updated `writeMappingConfig` in `src/utils/config-loader.ts` to use async fs operations:
```typescript
try {
  await fs.promises.mkdir(dir, { recursive: true });
} catch (error: any) {
  // Ignore EEXIST errors as directory already exists
  if (error.code !== 'EEXIST') {
    throw error;
  }
}
```

## Testing

After applying these fixes:
1. Tool schemas no longer use oneOf/allOf/anyOf at the top level
2. Auto-discovery logs are sent to stderr, keeping stdout clean for MCP protocol
3. Directory creation is handled properly with async operations

These changes ensure the MCP server runs without the reported errors.