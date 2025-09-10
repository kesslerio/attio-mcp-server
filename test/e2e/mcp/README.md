# MCP Test Suite

## Overview

This directory contains the automated MCP (Model Context Protocol) test suite that validates the Attio MCP Server functionality. These tests replace the manual QA test plan with automated validation using the `mcp-test-client` package.

## Test Structure

```
test/e2e/mcp/
├── core-operations/           # P0 Tests - Core CRUD Operations (100% pass required)
│   ├── search-records.mcp.test.ts    # TC-001: Basic search functionality
│   ├── record-details.mcp.test.ts    # TC-002: Get record details by ID
│   ├── create-records.mcp.test.ts    # TC-003: Record creation
│   ├── update-records.mcp.test.ts    # TC-004: Record modification
│   └── delete-records.mcp.test.ts    # TC-005: Record deletion
├── shared/                    # Shared test infrastructure
│   ├── mcp-test-base.ts      # Base MCP test class with common utilities
│   ├── qa-assertions.ts      # QA-specific assertion helpers
│   ├── test-data-factory.ts  # Test data generation utilities
│   └── quality-gates.ts      # Pass/fail criteria validation
└── README.md                  # This file
```

## Quality Gates

### P0 Core Tests (MANDATORY - 100% Pass Required)

**Purpose:** Validate essential CRUD operations that form the foundation of the MCP Server.

- **TC-001:** Search Records - Basic search across all resource types
- **TC-002:** Get Record Details - Retrieve specific records by ID
- **TC-003:** Create Records - Create new records with validation
- **TC-004:** Update Records - Modify existing records
- **TC-005:** Delete Records - Safe record removal with cleanup

**Quality Gate:** If ANY P0 test fails, the system is NOT ready for testing and deployment is BLOCKED.

### P1 Essential Tests (80% Pass Required) - *To be implemented*

**Purpose:** Validate schema operations and advanced search capabilities.

- TC-006: Get Attributes - Schema information retrieval
- TC-007: Discover Attributes - Dynamic schema discovery
- TC-008: Get Detailed Info - Specific information types
- TC-009: Advanced Search - Complex search operations

### P2 Advanced Tests (50% Pass Target) - *To be implemented*

**Purpose:** Validate advanced features and batch operations.

- TC-010: Search by Relationship
- TC-011: Search by Content
- TC-012: Search by Timeframe
- TC-013: Batch Operations
- TC-019: Batch Search

## Running the Tests

### Prerequisites

- Node.js and npm installed
- `ATTIO_API_KEY` environment variable set
- MCP server built (`npm run build`)

### Test Commands

```bash
# Run all MCP tests
npm run test:mcp

# Run only P0 core tests
npm run test:mcp:p0

# Run tests in watch mode for development
npm run test:mcp:watch

# Run with verbose output for debugging
npm run test:mcp -- --reporter=verbose
```

### Environment Variables

- `ATTIO_API_KEY`: Required for real API integration
- `MCP_TEST_TIMEOUT`: Optional timeout override (default: 30000ms)
- `MCP_TEST_DEBUG`: Set to 'true' for additional debug output

## Test Implementation Details

### MCP Protocol Testing

These tests validate the MCP protocol layer directly, not the REST API. They use the `mcp-test-client` package to:

1. Start the MCP server process (`node ./dist/index.js`)
2. Send MCP protocol commands
3. Validate MCP responses
4. Ensure tools are properly registered and discoverable

### Test Data Management

- Test data is generated with unique identifiers using timestamps
- Each test case has a unique prefix (TC001, TC002, etc.)
- Created records are tracked for cleanup
- Cleanup is performed in `afterAll` hooks to prevent data pollution

### Assertion Patterns

The test suite uses custom QA assertions that validate:

- Successful operations don't return errors
- Response content matches expected patterns
- Created records can be retrieved and searched
- Updates persist correctly
- Deletions are confirmed and verified

## Troubleshooting

### Common Issues

1. **Tests fail with "Cannot connect to MCP server"**
   - Ensure the server is built: `npm run build`
   - Check that no other process is using the MCP server port

2. **"API key not configured" errors**
   - Set the `ATTIO_API_KEY` environment variable
   - Verify the API key has proper permissions

3. **Timeout errors**
   - Increase timeout: `MCP_TEST_TIMEOUT=60000 npm run test:mcp`
   - Check network connectivity to Attio API

4. **Test data cleanup failures**
   - Manually clean up test data using the Attio UI if needed
   - Test data is prefixed with test case IDs (TC001, TC002, etc.)

### Debug Mode

Enable debug output for troubleshooting:

```bash
MCP_TEST_DEBUG=true npm run test:mcp -- --reporter=verbose
```

## Contributing

When adding new tests:

1. Follow the existing test structure and patterns
2. Use the shared infrastructure in `shared/` directory
3. Ensure proper test data cleanup
4. Update quality gates if adding new priority levels
5. Document any special requirements or limitations

## Related Documentation

- [QA Test Plan](../../../docs/testing/qa-test-plan.md) - Original manual test plan
- [Issue #612](https://github.com/kesslerio/attio-mcp-server/issues/612) - Implementation tracking
- [Issue #517](https://github.com/kesslerio/attio-mcp-server/issues/517) - Task field limitations
- [MCP Test Client](https://www.npmjs.com/package/mcp-test-client) - Testing library documentation