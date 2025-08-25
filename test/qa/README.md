# QA Test Scripts

This directory contains Quality Assurance test scripts that validate specific GitHub issues and bug fixes. These scripts provide manual testing capabilities for complex scenarios that are difficult to automate in unit tests.

## Issue-Specific QA Tests

### `qa-test-470.js`
**Issue**: #470 - Lists resource implementation
**Purpose**: Verifies Lists resource type is fully implemented and exposed
**Usage**: `node qa-test-470.js`
**Test Coverage**:
- ✅ Lists resource type appears in getSchemas() response
- ✅ Search-records works with object='lists'
- ✅ Get-record-details works for lists
- ✅ Create-record can create new lists  
- ✅ Update-record can modify lists
- ✅ Delete-record can remove lists
- ✅ Lists-specific operations (get-lists, add-record-to-list, etc.)

**Success Criteria**: All 7 tests must pass with full tool availability

### `qa-test-471.js`
**Issue**: #471 - [Add description when analyzing file]
**Purpose**: [To be documented when file is analyzed]
**Usage**: `node qa-test-471.js`

### `qa-test-472.js`
**Issue**: #472 - [Add description when analyzing file]
**Purpose**: [To be documented when file is analyzed]
**Usage**: `node qa-test-472.js`

### `qa-test-474.js`
**Issue**: #474 - [Add description when analyzing file]  
**Purpose**: [To be documented when file is analyzed]
**Usage**: `node qa-test-474.js`

## Running QA Tests

### Prerequisites
1. Build the project: `npm run build`
2. Ensure API keys are configured if testing live endpoints
3. Check that test data cleanup utilities are available

### Execution
```bash
# Run individual QA test
node test/qa/qa-test-470.js

# Run all QA tests (if batch runner exists)
npm run test:qa
```

### Expected Outcomes
- **PASS**: All test assertions succeed, issue is verified as resolved
- **FAIL**: One or more assertions fail, issue requires further work
- **ERROR**: Script execution fails, indicates configuration or environment issues

## Integration with Issue Tracking

Each QA test script:
1. **Documents the original GitHub issue** it validates
2. **Provides specific test cases** from the issue description  
3. **Validates acceptance criteria** defined in the issue
4. **Reports clear PASS/FAIL status** for issue resolution

## Maintenance Guidelines

### When to Create QA Tests
- Complex features with multiple integration points
- Bug fixes that are difficult to reproduce in unit tests
- Issues requiring end-to-end workflow validation
- Features with specific user acceptance criteria

### When to Update QA Tests
- When issue requirements change
- When API interfaces are modified
- When test failures indicate environmental issues
- When converting QA tests to automated integration tests

### When to Remove QA Tests
- When issue is fully resolved and covered by automated tests
- When feature is deprecated or removed
- When test becomes obsolete due to architectural changes

## Best Practices

1. **Self-Documenting**: Each script should clearly state what it tests
2. **Issue Reference**: Always include GitHub issue number and link
3. **Clear Output**: Provide clear PASS/FAIL indicators and error messages
4. **Reproducible**: Tests should run consistently across environments
5. **Independent**: Each test should be runnable independently

## Converting to Automated Tests

Consider migrating successful QA tests to:
- **Unit tests**: For isolated functionality testing
- **Integration tests**: For API endpoint validation  
- **E2E tests**: For complete user workflow testing

This ensures long-term maintenance and prevents regression.