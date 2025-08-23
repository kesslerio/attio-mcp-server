# Legacy Test Files

This directory contains test files for deprecated/legacy tool names and functionality.

## Purpose

These tests have been moved from their original locations to separate legacy concerns from current active tests. They serve as:

1. **Historical reference** for deprecated tool functionality
2. **Migration validation** tools when needed
3. **Backward compatibility verification** during major refactors

## Directory Structure

- `manual/` - Manual test scripts for legacy tools like `create-company-note`, `search-people-by-company`, etc.
- `debug/` - Debug scripts for legacy tool functionality
- `mapping/` - Legacy attribute mapping validation tests  
- `objects/` - Legacy object-specific test scripts
- `integration/` - Legacy integration test scenarios
- `mcp/` - Legacy MCP protocol test simulations
- `handlers/` - Legacy handler trace tests

## Legacy Tools Tested

This directory contains tests for deprecated tool names including:

- `get-company-details` (now `get-record-details`)
- `search-companies` (now `search-records`)
- `search-people` (now `search-records`) 
- `create-company` (now `create-record`)
- `create-person` (now `create-record`)
- `update-company` (now `update-record`)
- `update-person` (now `update-record`)
- `create-company-note` (deprecated)
- `search-companies-by-domain` (deprecated)
- `advanced-search-companies` (now unified search)

## Running Legacy Tests

These tests can still be run individually for debugging or validation purposes:

```bash
# Run a specific legacy test
node test/legacy/manual/test-create-company-note.js

# Run legacy debug script
node test/legacy/debug/debug-search-companies.js
```

## Migration Notes

When updating legacy functionality:

1. Check corresponding tests in this directory first
2. Update or remove tests as functionality is fully migrated
3. Document any breaking changes or migration paths
4. Consider creating compatibility shims if needed

## Maintenance

These files are not part of the regular CI test suite but should be maintained for reference. Remove or archive files only when:

- The legacy functionality is completely removed
- No backward compatibility is needed
- Migration is fully complete and validated