# Format Debug Scripts

Scripts for testing and validating `formatResult` function compliance and performance.

## Scripts

### `test-formatresult-compliance.js`

Tests formatResult functions across all universal tools to ensure:

- Always return string type (never objects or conditional types)
- Proper error handling with try/catch blocks
- Consistent performance characteristics
- Type safety compliance (Record<string, unknown> patterns)

**Usage:**

```bash
cd /path/to/attio-mcp-server
npm run build
node scripts/debug/format/test-formatresult-compliance.js
```

**What it checks:**

- String return type consistency
- Performance regression detection (89.7% improvement target)
- Memory efficiency validation (227KB reduction target)
- Error boundary handling

**Output:**

- ✅ Pass/fail status for each tool
- Performance metrics
- Memory usage statistics
- Type safety violations (if any)

## Related Issues

- PR #483: formatResult Contract Compliance
- Issue #647: Core Operations Refactoring
