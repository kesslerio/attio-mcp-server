# Edge Cases & Error Handling Test Suite

**Issue #649: Complete MCP Test Suite Implementation - Edge Cases & Error Handling**

This directory contains comprehensive edge case and error handling tests for the Attio MCP Server. These tests validate system behavior under extreme conditions, invalid inputs, and failure scenarios to ensure robust and reliable operation.

## Overview

The edge cases test suite is designed to:

- **Validate Input Handling**: Ensure proper validation and sanitization of all inputs
- **Test Boundary Conditions**: Verify system behavior at limits and extremes
- **Assess Concurrent Operations**: Validate thread safety and race condition handling
- **Verify Error Recovery**: Test graceful degradation and recovery mechanisms
- **Ensure Security**: Validate protection against injection and malicious inputs

## Test Categories

### 1. Input Validation Tests (`input-validation.mcp.test.ts`)

**Test Count**: 7 comprehensive validation tests
**Quality Gate**: 75% pass rate (P2 requirement)

Tests invalid, malformed, and malicious input data across all MCP tools:

- **Required Field Validation**: Empty, null, and missing required fields
- **UUID Format Validation**: Malformed and invalid UUID identifiers
- **Data Type Validation**: Type mismatches and invalid data structures
- **JSON Structure Validation**: Malformed and deeply nested invalid structures
- **Security Injection Tests**: XSS, SQL injection, and path traversal attempts
- **Complex Parameter Validation**: Nested objects and array edge cases
- **Collection Edge Cases**: Empty arrays, circular references, mixed types

**Key Features**:

- Automatic security sanitization validation
- Protection against common injection attacks
- Graceful handling of type mismatches
- Comprehensive UUID validation testing

### 2. Limits & Boundaries Tests (`limits-boundaries.mcp.test.ts`)

**Test Count**: 6 boundary condition tests
**Quality Gate**: 75% pass rate (P2 requirement)

Tests system behavior at size limits, numeric boundaries, and resource constraints:

- **String Length Boundaries**: Extremely long strings (10KB-100KB)
- **Numeric Boundaries**: Negative values, zero, MAX_SAFE_INTEGER overflow
- **Pagination Limits**: Large limits, large offsets, boundary values
- **Array Size Limits**: Large collections, empty collections, property limits
- **Unicode Boundaries**: Special characters, control chars, emoji sequences
- **Memory & Resource Limits**: Large operations, timeout handling, resource exhaustion

**Key Features**:

- Memory usage monitoring and bounds checking
- Unicode and multi-byte character handling
- Pagination boundary validation
- Resource consumption limits enforcement

### 3. Concurrent Operations Tests (`concurrent-operations.mcp.test.ts`)

**Test Count**: 5 concurrency and race condition tests
**Quality Gate**: 75% pass rate (P2 requirement)

Tests system behavior under concurrent load and simultaneous operations:

- **Simultaneous Record Creation**: Multiple clients creating records concurrently
- **Concurrent Updates**: Race conditions in record modification
- **Rapid Search Operations**: Burst requests and rate limiting
- **List Membership Conflicts**: Concurrent list operations
- **Rate Limiting Enforcement**: High load and throttling behavior
- **Complex Workflow Consistency**: Multi-step concurrent operations

**Key Features**:

- Race condition detection and handling
- Data consistency validation under load
- Rate limiting and throttling verification
- Concurrent workflow integrity testing

### 4. Error Recovery Tests (`error-recovery.mcp.test.ts`)

**Test Count**: 5 error recovery and resilience tests
**Quality Gate**: 75% pass rate (P2 requirement)

Tests system resilience, error recovery, and graceful degradation:

- **Network Timeout Recovery**: Simulated timeouts and recovery mechanisms
- **Data Corruption Handling**: Partial corruption and data sanitization
- **Dependency Failures**: Missing references and broken dependencies
- **Transaction Rollback**: Multi-step operation failure and rollback
- **Inconsistent State Recovery**: State conflicts and consistency restoration
- **Cascading Failure Resilience**: System stability under multiple failures

**Key Features**:

- Graceful degradation under failure conditions
- Automatic error recovery mechanisms
- Data consistency preservation
- System stability validation

## Shared Utilities

### `shared/edge-case-test-base.ts`

Extended base class providing specialized edge case testing utilities:

- **Timed Test Execution**: Performance monitoring for edge cases
- **Expected Failure Testing**: Validation of error conditions
- **Concurrency Test Framework**: Multi-threaded operation testing
- **Boundary Value Testing**: Automated boundary condition validation
- **Invalid Data Generation**: Comprehensive invalid input patterns

### `shared/edge-case-assertions.ts`

Specialized assertion library for edge case validation:

- **Error Handling Assertions**: Validate proper error responses
- **Security Sanitization Checks**: Ensure malicious input neutralization
- **Concurrency Validation**: Race condition and data consistency checks
- **Memory Bounds Checking**: Resource usage validation
- **Performance Assertions**: Timeout and rate limiting validation

### `shared/error-scenarios.ts`

Predefined error scenarios and test data patterns:

- **Input Validation Scenarios**: Comprehensive invalid input patterns
- **Boundary Limit Scenarios**: Size and numeric boundary test data
- **Concurrency Scenarios**: Race condition and conflict test cases
- **Recovery Scenarios**: Failure and recovery test patterns
- **Dynamic Scenario Generation**: Tool-specific edge case creation

## Quality Gates

### P2 Quality Requirements (75% Pass Rate)

Each test category must achieve a minimum 75% pass rate to meet P2 quality gates:

- **Input Validation**: 75% of validation tests must pass
- **Boundary Limits**: 75% of boundary tests must pass
- **Concurrent Operations**: 75% of concurrency tests must pass
- **Error Recovery**: 75% of recovery tests must pass

### Overall Quality Metrics

- **Total Test Count**: 20+ comprehensive edge case tests
- **Execution Time**: Complete suite should run within 5 minutes
- **Auto Cleanup**: Automatic test data cleanup and resource management
- **Comprehensive Coverage**: Input validation, boundaries, concurrency, recovery

## Usage

### Running Individual Test Categories

```bash
# Input validation tests
npm run test:e2e -- test/e2e/mcp/edge-cases/input-validation.mcp.test.ts

# Boundary limits tests
npm run test:e2e -- test/e2e/mcp/edge-cases/limits-boundaries.mcp.test.ts

# Concurrent operations tests
npm run test:e2e -- test/e2e/mcp/edge-cases/concurrent-operations.mcp.test.ts

# Error recovery tests
npm run test:e2e -- test/e2e/mcp/edge-cases/error-recovery.mcp.test.ts
```

### Running Complete Edge Cases Suite

```bash
# All edge case tests
npm run test:e2e -- test/e2e/mcp/edge-cases/

# With detailed reporting
npm run test:e2e -- test/e2e/mcp/edge-cases/ --reporter=verbose
```

### Environment Configuration

```bash
# Required environment variables
export ATTIO_API_KEY="your-api-key"
export E2E_MODE=true

# Optional: Enhanced logging for edge case debugging
export MCP_LOG_LEVEL=DEBUG
export LOG_FORMAT=json
```

## Test Data Management

### Automatic Cleanup

All edge case tests use the `TestDataFactory` tracking system for automatic cleanup:

- **Resource Tracking**: All created records are automatically tracked
- **Batch Cleanup**: Efficient cleanup of test data after test completion
- **Workspace Isolation**: API token filtering ensures safe cleanup
- **Failure Recovery**: Cleanup runs even if tests fail

### Test Data Isolation

- **Unique Identifiers**: All test data uses timestamped unique identifiers
- **Workspace Scoping**: Tests only operate on data created by the API token
- **Cross-Test Independence**: No shared state between test categories
- **Concurrent Safety**: Test data generation is thread-safe

## Error Analysis and Debugging

### Test Result Analysis

Each test provides detailed result analysis:

- **Execution Timing**: Performance metrics for each test
- **Expected vs Actual Behavior**: Detailed comparison of outcomes
- **Error Pattern Matching**: Validation of expected error messages
- **Recovery Verification**: Confirmation of successful error recovery

### Debugging Failed Edge Cases

1. **Enable Debug Logging**: Set `MCP_LOG_LEVEL=DEBUG` for detailed logs
2. **Check Test Output**: Review console output for specific failure details
3. **Validate Test Data**: Ensure test setup completed successfully
4. **Review Timing**: Check for timeout-related failures
5. **Examine API Responses**: Validate actual vs expected API behavior

## Integration with CI/CD

### GitHub Actions Integration

Edge case tests are integrated into the CI/CD pipeline:

- **PR Validation**: All edge case tests run on pull requests
- **Quality Gate Enforcement**: 75% pass rate required for merge
- **Performance Monitoring**: Execution time tracking and alerts
- **Failure Analysis**: Automatic generation of failure reports

### Local Development

For local development and testing:

```bash
# Quick edge case validation
npm run test:e2e:edge-cases

# Full edge case suite with coverage
npm run test:e2e:edge-cases:full

# Edge case debugging mode
npm run test:e2e:edge-cases:debug
```

## Contributing

When adding new edge cases:

1. **Follow Naming Convention**: Use descriptive test names with category prefixes
2. **Use Shared Utilities**: Leverage existing base classes and assertions
3. **Document Expected Behavior**: Clearly specify expected vs actual outcomes
4. **Include Cleanup**: Ensure all test data is properly tracked and cleaned
5. **Update Documentation**: Add new test descriptions to this README

### Adding New Edge Case Categories

To add a new edge case category:

1. Create new test file: `new-category.mcp.test.ts`
2. Extend `EdgeCaseTestBase` class
3. Add category to `error-scenarios.ts` if applicable
4. Update this README with category description
5. Add new test commands to `package.json`

## Security Considerations

Edge case tests validate security aspects:

- **Input Sanitization**: XSS, injection, and malicious input handling
- **Resource Protection**: DoS prevention and resource limit enforcement
- **Data Validation**: Type safety and data integrity checks
- **Access Control**: Permission validation under edge conditions

## Performance Considerations

Edge case tests monitor performance:

- **Execution Time Limits**: Tests timeout after reasonable periods
- **Memory Usage Monitoring**: Large operation memory consumption tracking
- **Rate Limiting Validation**: Proper throttling under high load
- **Resource Cleanup Efficiency**: Fast and complete test data cleanup

---

**Note**: This test suite is designed to validate system robustness under extreme conditions. Some test failures are expected and indicate proper error handling. The goal is graceful degradation and recovery, not perfect success under all conditions.
