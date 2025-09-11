# P1 List Management Tests

## Overview
This document describes the P1 priority list management tests for the Attio MCP Server. These tests validate essential list operations including CRUD, membership management, filtering, and error handling.

## Test Cases

### TC-006: List Operations - Basic List Management
**Priority:** P1  
**Category:** List Management  
**Quality Gate:** 80% pass rate required

#### Test Coverage
1. **Get All Lists** - Retrieve all available lists
2. **Get List Details** - Get detailed information for a specific list
3. **Get List Entries** - Retrieve entries from a list
4. **Pagination Support** - Handle paginated list entry retrieval

#### Implementation
- File: `test/e2e/mcp/list-management/list-operations.mcp.test.ts`
- Tests: 4
- Dependencies: Valid list IDs from existing workspace

---

### TC-007: List Membership - Record List Management
**Priority:** P1  
**Category:** List Management  
**Quality Gate:** 80% pass rate required

#### Test Coverage
1. **Add Record to List** - Add a company/person to a list with metadata
2. **Remove Record from List** - Remove an entry from a list
3. **Update List Entry** - Modify list entry metadata
4. **Get Record Memberships** - Retrieve all lists a record belongs to
5. **Batch Operations** - Handle multiple membership operations

#### Implementation
- File: `test/e2e/mcp/list-management/list-membership.mcp.test.ts`
- Tests: 5
- Dependencies: Test companies and people created during setup

---

### TC-008: List Filtering - Advanced Query Operations
**Priority:** P1  
**Category:** List Management  
**Quality Gate:** 80% pass rate required

#### Test Coverage
1. **Basic Filter** - Filter list entries with simple criteria
2. **Advanced Filter** - Complex filter with multiple conditions
3. **Filter by Parent** - Filter entries by parent record
4. **Multiple Conditions** - Combine filters with AND/OR logic

#### Implementation
- File: `test/e2e/mcp/list-management/list-filtering.mcp.test.ts`
- Tests: 4
- Dependencies: Populated list with diverse entries

---

### TC-009: List Error Handling - Edge Cases and Validation
**Priority:** P1  
**Category:** List Management  
**Quality Gate:** 80% pass rate required

#### Test Coverage
1. **Invalid List ID** - Handle non-existent and malformed list IDs
2. **Invalid Record ID** - Handle invalid record IDs in membership operations
3. **Malformed Filters** - Gracefully handle invalid filter configurations

#### Implementation
- File: `test/e2e/mcp/list-management/list-error-handling.mcp.test.ts`
- Tests: 3
- Dependencies: None (uses intentionally invalid data)

---

## Execution

### Running All P1 List Tests
```bash
npm run test:mcp:p1:lists
```

### Running Individual Test Suites
```bash
# List operations only
npx vitest run test/e2e/mcp/list-management/list-operations.mcp.test.ts

# List membership only
npx vitest run test/e2e/mcp/list-management/list-membership.mcp.test.ts

# List filtering only
npx vitest run test/e2e/mcp/list-management/list-filtering.mcp.test.ts

# Error handling only
npx vitest run test/e2e/mcp/list-management/list-error-handling.mcp.test.ts
```

### Watch Mode for Development
```bash
npx vitest test/e2e/mcp/list-management/ --watch
```

## Quality Gates

### P1 Requirements
- **Minimum Pass Rate:** 80% (12-13 of 16 tests must pass)
- **Test Coverage:** All critical list operations must be tested
- **Error Handling:** Graceful degradation for invalid inputs
- **Performance:** Tests should complete within 60 seconds

### Success Criteria
- [ ] TC-006: 4/4 tests passing (100%)
- [ ] TC-007: 4/5 tests passing (80%)
- [ ] TC-008: 3/4 tests passing (75%)
- [ ] TC-009: 2/3 tests passing (66%)
- [ ] **Overall:** 13/16 tests passing (81.25%) ✅

## Test Data Management

### Setup
- Tests create their own test data during `beforeAll` hooks
- Test companies and people are created with unique identifiers
- Existing lists are used when available

### Cleanup
- Test data is tracked using `TestDataFactory.trackRecord()`
- Cleanup happens automatically in `afterAll` hooks
- Manual cleanup available via `npm run cleanup:test-data`

## Known Issues and Limitations

### MCP Response Format
- MCP returns text-based responses, not JSON
- IDs are embedded in format: `(ID: uuid-here)`
- Success/failure determined by text content analysis

### List API Constraints
- List IDs must be valid UUIDs for most operations
- Some operations require specific object types
- Filter syntax varies between basic and advanced operations

## Integration with CI/CD

### Local Testing Only
MCP tests require real API credentials and should not run in GitHub Actions CI/CD. They are designed for local development and manual QA verification.

### Environment Requirements
```bash
# Required environment variables
ATTIO_API_KEY=your_api_key_here
MCP_TEST_TIMEOUT=60000  # Optional, defaults to 60s
```

## Troubleshooting

### Common Issues

1. **"Invalid list ID" errors**
   - Ensure list IDs are valid UUIDs
   - Check that the list exists in your workspace

2. **Empty list results**
   - Normal for new/empty lists
   - Tests handle empty results gracefully

3. **Timeout errors**
   - Increase timeout: `MCP_TEST_TIMEOUT=120000`
   - Check network connectivity to Attio API

4. **Authentication failures**
   - Verify `ATTIO_API_KEY` is set correctly
   - Check API key has necessary permissions

## Future Enhancements

### Planned for P2
- List creation and deletion (if supported by API)
- Bulk list operations
- List template management
- Cross-list operations
- Performance benchmarking

### Technical Debt
- Consider creating dedicated test lists instead of using existing ones
- Add retry logic for transient failures
- Implement test data isolation per test suite

## References

- [Attio API Documentation](https://docs.attio.com/api)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Issue #612: QA Test Automation](https://github.com/kesslerio/attio-mcp-server/issues/612)