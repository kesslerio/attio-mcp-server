# Debug & Diagnostic Tests

**⚠️ These tests are NOT part of the regular test suite and are NEVER run in hooks/CI.**

## Purpose

These tests are diagnostic tools for analyzing specific issues:

- **search-query-analysis.mcp.test.ts**: Comprehensive analysis of search query patterns for Issue #781
  - Tests 14 different query patterns (multi-field, partial matching, phone variations, etc.)
  - Hits live Attio API to validate real-world behavior
  - Expected: ~57% pass rate (8/14) - identifies gaps in query parsing

- **verify-record-exists.mcp.test.ts**: Baseline verification that test records exist
  - Quick sanity check before running comprehensive tests
  - Should always pass (4/4) if test data is in workspace

## Running Debug Tests

**Never use `npm test` - these tests are excluded from default runs!**

### Run all debug tests:

```bash
npm run test:debug:issue-781
```

### Run specific test:

```bash
E2E_MODE=true npx vitest run --config vitest.config.debug.ts debug-tests/verify-record-exists.mcp.test.ts
```

### Run with specific test case:

```bash
E2E_MODE=true npx vitest run --config vitest.config.debug.ts debug-tests/search-query-analysis.mcp.test.ts -t "Email only"
```

## Test Data

Tests use known production records:

- **Person**: Bhavesh Patel (ID: a63f2a17-d534-5ab7-9c74-6ab24bb29eb2)
- **Company**: Tite Medical Aesthetics (ID: a4a7b1d4-d35d-5c44-bf08-b58711ca5939)

## Why Separate?

1. **Too slow for hooks**: 30-60s runtime, hits live API
2. **Expected failures**: Designed to show gaps, not validate working code
3. **Diagnostic purpose**: For analysis, not CI validation
4. **Manual execution**: Run when needed, not automatically

## Issue #781 Context

The search-query-analysis test documents and quantifies the limitations described in Issue #781:

- 6/14 query patterns fail (42.9%)
- Multi-field queries don't parse
- Phone number normalization missing
- Location/context tokens not handled

See: https://github.com/kesslerio/attio-mcp-server/issues/781
