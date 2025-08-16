# Testing Guide for Attio MCP Server

This guide explains how to set up and run tests for the Attio MCP Server, including unit tests and integration tests that interact with the Attio API.

## 🏆 Current Test Status

✅ **100% E2E Test Pass Rate Achieved** (37/37 tests passing, 1 intentionally skipped)
✅ **100% Integration Test Pass Rate Maintained** (15/15 tests passing)

### Recent Testing Improvements (January 2025 - Issue #480)
- **E2E Test Success**: Resolved all E2E test failures with clean architectural approach
- **Mock Data System**: Implemented environment-based mock injection without production coupling
- **Dual Response Format**: Support for both `values` object structure and flattened field access
- **TypeScript Improvements**: Reduced lint warnings from 967 to 954 (13 total fixed)
- **Clean Architecture**: Complete separation of test and production concerns

### Previous Improvements (August 2025)
- **Critical Bug Fixes**: All P0 API failures resolved with robust error handling
- **Enhanced Validation**: Complete email validation consistency between create/update operations  
- **Resource Mapping**: Fixed all resource type mappings and JSON response handling
- **Tasks API Special Handling**: Implemented workaround for missing `/objects/tasks/attributes` endpoint
- **Build Integration**: All TypeScript compilation errors resolved
- **Error Handling**: Comprehensive error mocking and fallback patterns implemented

### Test Coverage
- **E2E Tests**: 37/37 passing (100% pass rate) with mock data injection
- **Integration Tests**: 15/15 passing (100% pass rate)
- **Unit Tests**: All offline tests passing
- **Build Tests**: TypeScript compilation validation included
- **Lint Status**: 954 problems (down from 967)

## Table of Contents

- [Quick Start](#quick-start)
- [Test Types](#test-types)
- [E2E Test Framework](#e2e-test-framework)
- [Setting Up Integration Tests](#setting-up-integration-tests)
- [Running Tests](#running-tests)
- [Test Configuration](#test-configuration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Quick Start

```bash
# 1. Set up your Attio API key in .env
echo "ATTIO_API_KEY=your_api_key_here" > .env

# 2. Copy test configuration template
cp .env.test.example .env.test

# 3. Edit .env.test with your workspace-specific IDs
# Or run the setup script to create test data:
npm run setup:test-data

# 4. Run all tests
npm test

# 5. Run integration tests only
npm run test:integration
```

## Test Types

### Unit Tests

Unit tests run without requiring an API connection and test individual functions in isolation.

```bash
# Run all unit tests
npm test

# Run unit tests in watch mode
npm test:watch

# Run offline tests only (no API calls)
npm test:offline
```

### Integration Tests

Integration tests make real API calls to verify that the MCP tools work correctly with your Attio workspace.

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- test/integration/lists/add-record-to-list.integration.test.ts

# Run integration tests in watch mode
npm run test:integration:watch
```

### E2E Tests

**NEW in Issue #403**: Comprehensive End-to-End tests with 100% pass rate validation for universal tools.

```bash
# Run all E2E tests (51 tests, should show 100% pass rate)
npm run e2e

# ⚠️ CRITICAL: Use proper E2E commands, NOT npm test
# Run specific E2E test suite
npm run e2e:universal

# Run E2E tests with performance monitoring
npm run e2e:debug

# Alternative: Direct vitest with correct config
npx vitest --config vitest.config.e2e.ts --run test/e2e/suites/universal-tools.e2e.test.ts
```

## E2E Test Framework

**🎯 Issue #403 Resolution**: Complete E2E test infrastructure with 100% pass rate (51/51 tests passing).

### Major Infrastructure Improvements

The E2E test framework underwent major improvements to achieve production-ready testing:

#### ✅ **Critical Bug Fixes**
- **MCP Response Format Consistency**: Fixed `isError: false` inclusion in successful responses
- **Field Validation Resolution**: Corrected `record_data.values` structure validation
- **Import Error Resolution**: Fixed test file imports that caused 97% test skip rate
- **JSON Response Handling**: Enhanced parsing and validation of API responses

#### 🚀 **New Testing Capabilities**
- **Pagination Testing**: Comprehensive validation of `offset` parameter across universal tools
- **Field Filtering**: Tests for `fields` parameter to validate selective data retrieval
- **Tasks Integration**: Complete lifecycle testing for tasks resource type operations
- **Performance Monitoring**: Execution time tracking and response size validation
- **Enhanced Error Handling**: Graceful validation of error responses and edge cases

#### 🛠️ **7 Enhanced Assertion Methods**

The E2E framework includes 7 specialized assertion methods for comprehensive validation:

```typescript
import { E2EAssertions } from '../utils/assertions.js';

// 1. Pagination validation
E2EAssertions.expectValidPagination(response, expectedLimit);

// 2. Field filtering validation
E2EAssertions.expectFieldFiltering(response, ['name', 'domains']);

// 3. Tasks integration validation
E2EAssertions.expectValidTasksIntegration(response, 'create');

// 4. Specific error type validation
E2EAssertions.expectSpecificError(response, 'validation');

// 5. Performance monitoring
E2EAssertions.expectOptimalPerformance(response, 1000);

// 6. Universal tool parameter validation
E2EAssertions.expectValidUniversalToolParams(response, params);

// 7. Batch operation validation
E2EAssertions.expectValidBatchOperation(response, batchSize);
```

#### 📊 **Performance Budgets & Monitoring**

Performance expectations are now enforced through automated testing:

| Operation Type | Performance Budget | Validation Method |
|---|---|---|
| Search Operations | < 1000ms per API call | `expectOptimalPerformance(response, 1000)` |
| CRUD Operations | < 1500ms per operation | `expectOptimalPerformance(response, 1500)` |
| Batch Operations | < 3000ms for 10 records | `expectOptimalPerformance(response, 3000)` |
| Field Filtering | < 500ms additional overhead | `expectFieldFiltering(response, fields)` |
| Pagination | < 200ms additional per offset | `expectValidPagination(response, limit)` |

#### 🎯 **Comprehensive Test Coverage**

The E2E framework covers all universal tools with real API integration:

**Core Operations (8 tools)**:
- `search-records` with pagination and filtering
- `get-record-details` with field selection
- `create-record`, `update-record`, `delete-record` with validation
- `get-attributes`, `discover-attributes` with schema discovery
- `get-detailed-info` with various info types

**Advanced Operations (5 tools)**:
- `advanced-search` with complex filters
- `search-by-relationship` with cross-resource queries
- `search-by-content` with content-based searching
- `search-by-timeframe` with temporal queries
- `batch-operations` with bulk processing

**Enhanced Testing Features**:
- Cross-resource compatibility (companies, people, tasks, lists)
- Error handling and edge case validation
- Performance regression testing
- Mock isolation to prevent unit test interference

### Setting Up E2E Tests

#### 1. **Environment Configuration**
```bash
# Create .env file with API key (required)
echo "ATTIO_API_KEY=your_64_character_api_key_here" > .env

# Verify API key format
ATTIO_API_KEY=$(grep ATTIO_API_KEY .env | cut -d'=' -f2)
echo "API key length: ${#ATTIO_API_KEY} (should be 64)"
```

#### 2. **Test Data Setup**
```bash
# Option A: Use existing records (update .env.test)
cp test/e2e/config.template.json test/e2e/config.local.json
# Edit config.local.json with your workspace record IDs

# Option B: Create test data automatically
npm run setup:test-data
```

#### 3. **Run E2E Tests**
```bash
# Full E2E test suite (should show 51/51 passing)
npm run e2e

# Run with detailed output
npm run e2e --reporter=verbose

# Single test suite - Use proper E2E commands
npm run e2e:universal
# OR with direct vitest (correct config):
npx vitest --config vitest.config.e2e.ts --run test/e2e/suites/universal-tools.e2e.test.ts
```

### E2E Test Architecture

#### **Test Organization**
```
test/e2e/
├── suites/                    # Test suites by functionality
│   ├── universal-tools.e2e.test.ts  # Universal tools (51 tests)
│   ├── tasks-management.e2e.test.ts  # Task operations
│   ├── lists-management.e2e.test.ts  # List operations
│   └── notes-management.e2e.test.ts  # Notes operations
├── utils/                     # Test utilities
│   ├── assertions.ts          # 7 enhanced assertion methods
│   ├── config-loader.ts       # Configuration management
│   └── logger.ts              # Test logging and monitoring
├── fixtures/                  # Test data factories
│   ├── companies.ts           # Company test data
│   ├── people.ts              # Person test data
│   └── tasks.ts               # Task test data
└── setup.ts                   # Global test setup and cleanup
```

#### **Enhanced Assertion Methods Details**

For comprehensive documentation of all 7 assertion methods, see the [E2E Assertion Methods Guide](./testing/e2e-assertion-methods.md).

#### **Troubleshooting E2E Issues**

For detailed troubleshooting guidance, see the [E2E Troubleshooting Guide](./testing/e2e-troubleshooting.md).

## Setting Up Integration Tests

### 1. Configure API Access

Create a `.env` file in the project root with your Attio API key:

```bash
ATTIO_API_KEY=your_api_key_here
```

### 2. Configure Test Data

Integration tests need specific records in your workspace to test against. You have two options:

#### Option A: Use Existing Records

1. Copy the test configuration template:
   ```bash
   cp .env.test.example .env.test
   ```

2. Edit `.env.test` with IDs from your workspace:
   ```bash
   # Required test data
   TEST_COMPANY_ID=198abdd2-a0d9-4c95-93b6-29bc4154953a
   TEST_PERSON_ID=f3503402-85fc-41b6-9427-819d05e8813e
   TEST_LIST_ID=b352b506-5d1f-43b2-9623-dc2e31c751f7
   
   # Optional test data
   TEST_DEAL_ID=93a7631d-8586-4471-ac56-881a6030a2ce
   ```

#### Option B: Create Test Data Automatically

Run the setup script to create test data in your workspace:

```bash
npm run setup:test-data
```

This will:
- Create test companies and people with identifiable names (prefixed with `E2E_TEST_`)
- Find available lists in your workspace
- Output the IDs to add to your `.env.test` file

### 3. Finding Record IDs

To find IDs for existing records:

1. **Via Attio Web Interface**:
   - Open a record in Attio
   - Look at the URL: `https://app.attio.com/workspaces/.../objects/.../records/rec_abc123`
   - The ID is the part starting with `rec_`, `list_`, etc.

2. **Via API Discovery**:
   ```bash
   # Build the project first
   npm run build
   
   # Discover available resources
   npm run discover
   ```

## Running Tests

### All Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage
```

### Integration Tests Only

```bash
# Run all integration tests
npm run test:integration

# Run a specific integration test file
npm run test:integration -- test/integration/lists/add-record-to-list.integration.test.ts

# Run integration tests matching a pattern
npm run test:integration -- -t "should add record to list"
```

### Offline Tests Only

```bash
# Run tests that don't require API access
npm test:offline

# Watch mode for offline tests
npm test:watch:offline
```

## Test Configuration

### Environment Variables

The following environment variables control test behavior:

| Variable | Description | Default |
|----------|-------------|---------|
| `ATTIO_API_KEY` | Your Attio API key | Required |
| `SKIP_INTEGRATION_TESTS` | Skip all integration tests | `false` |
| `TEST_COMPANY_ID` | ID of test company record | Required for integration tests |
| `TEST_PERSON_ID` | ID of test person record | Required for integration tests |
| `TEST_LIST_ID` | ID of test list | Required for list tests |
| `SKIP_INCOMPLETE_TESTS` | Skip tests missing optional IDs | `true` |
| `CLEANUP_TEST_DATA` | Clean up created test data | `true` |
| `TEST_DATA_PREFIX` | Prefix for test data names | `E2E_TEST_` |

### Test Configuration File Structure

`.env.test` structure:

```bash
# Required test data
TEST_COMPANY_ID=your_company_id
TEST_PERSON_ID=your_person_id
TEST_LIST_ID=your_list_id

# Optional test data
TEST_EMPTY_LIST_ID=
TEST_DEAL_ID=
TEST_TASK_ID=
TEST_NOTE_ID=

# Test data values
TEST_COMPANY_NAME="Integration Test Company"
TEST_PERSON_EMAIL="integration-test@example.com"
TEST_PERSON_FIRST_NAME="Integration"
TEST_PERSON_LAST_NAME="Test"
TEST_DOMAIN="integration-test.com"

# Test behavior
SKIP_INCOMPLETE_TESTS=true
CLEANUP_TEST_DATA=true
TEST_DATA_PREFIX="E2E_TEST_"
```

## Troubleshooting

### Common Issues

#### "No API key found"

Ensure your `.env` file exists and contains:
```bash
ATTIO_API_KEY=your_actual_api_key
```

#### "Test configuration missing"

1. Check that `.env.test` exists
2. Verify it contains the required IDs
3. Run `npm run setup:test-data` to create test data

#### "Record not found" errors

The test records may have been deleted. Either:
- Update `.env.test` with new IDs
- Run `npm run setup:test-data` to create new test records

#### Rate limiting errors

The tests include retry logic, but if you see rate limiting:
- Reduce the number of concurrent tests
- Add delays between test runs
- Use a dedicated test workspace

### Debugging Tests

```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run a single test with debugging
npm test -- test/integration/lists/add-record-to-list.integration.test.ts --reporter=verbose

# Check test configuration
cat .env.test
```

## Best Practices

### 1. Test Data Management

- **Use identifiable prefixes**: Test data should be clearly marked (e.g., `E2E_TEST_`)
- **Clean up after tests**: Enable `CLEANUP_TEST_DATA=true`
- **Use dedicated test records**: Don't test against production data
- **Document test dependencies**: Note which features require specific workspace setup

### 2. Writing Integration Tests

```typescript
import { setupIntegrationTests } from '../helpers/integration-test-setup';

describe('My Integration Test', () => {
  // Setup with configuration requirement
  const setup = setupIntegrationTests({ 
    requireTestConfig: true,
    verbose: true 
  });
  
  if (setup.shouldSkip) {
    test.skip('Skipping - ' + setup.skipReason, () => {});
    return;
  }

  test('should interact with API', async () => {
    // Use test configuration
    const { companyId, listId } = setup.testConfig!;
    
    // Your test logic here
  });
});
```

### 3. CI/CD Considerations

For CI/CD pipelines:

```yaml
# Example GitHub Actions setup
env:
  ATTIO_API_KEY: ${{ secrets.ATTIO_API_KEY }}
  TEST_COMPANY_ID: ${{ secrets.TEST_COMPANY_ID }}
  TEST_PERSON_ID: ${{ secrets.TEST_PERSON_ID }}
  TEST_LIST_ID: ${{ secrets.TEST_LIST_ID }}
```

### 4. Performance Tips

- Run offline tests during development: `npm test:offline`
- Use watch mode for faster feedback: `npm test:watch:offline`
- Run integration tests before commits: `npm run test:integration`
- Consider using separate test workspaces for parallel CI runs

## Advanced Topics

### Custom Test Configurations

Create workspace-specific test suites by extending the base configuration:

```typescript
// test/config/my-workspace.ts
export const workspaceTestConfig = {
  customFields: {
    companies: ['industry', 'size'],
    people: ['department', 'role']
  },
  lists: {
    prospecting: 'list_abc123',
    customers: 'list_def456'
  }
};
```

### Test Data Factories

Use the test data generators for consistent test data:

```typescript
import { generateTestData } from '../helpers/integration-test-setup';

const testData = generateTestData(Date.now());
// Creates timestamped test data for uniqueness
```

### Mocking Strategies

For unit tests that need to mock API responses:

```typescript
vi.mock('../../src/api/attio-client', () => ({
  getAttioClient: vi.fn(() => ({
    post: vi.fn().mockResolvedValue({ data: mockResponse })
  }))
}));
```

## Contributing

When adding new integration tests:

1. Follow the existing pattern in `test/integration/`
2. Use the `setupIntegrationTests` helper
3. Add any new required test data to `.env.test.example`
4. Update this documentation if adding new test types
5. Ensure tests clean up after themselves

## E2E Test Documentation

For comprehensive E2E testing documentation, see:

- **[E2E Framework Guide](./testing/e2e-framework-guide.md)** - Complete framework overview and architecture
- **[E2E Assertion Methods](./testing/e2e-assertion-methods.md)** - Documentation for all 7 enhanced assertion methods
- **[E2E Troubleshooting Guide](./testing/e2e-troubleshooting.md)** - Common issues and solutions
- **[Performance Testing Guide](./testing/performance-testing.md)** - Performance monitoring and optimization

## Technical Implementation Details

### Issue #403 Resolution Summary

The E2E test infrastructure underwent major improvements to achieve production-ready testing:

**Key Fixes**:
- **MCP Response Format**: Fixed `isError: false` inclusion in successful responses (`src/handlers/tools/dispatcher/core.ts`)
- **Field Validation**: Corrected `record_data.values` structure handling (`src/handlers/tool-configs/universal/shared-handlers.ts`)  
- **Import Resolution**: Fixed test file imports that caused 97% test skip rate
- **JSON Handling**: Enhanced response parsing and validation for large responses

**New Capabilities**:
- **7 Enhanced Assertions**: Specialized validation for pagination, field filtering, tasks, performance, and error handling
- **Performance Budgets**: Automated enforcement of response time limits
- **Cross-Resource Testing**: Consistent validation across companies, people, tasks, and lists
- **Real API Integration**: Full end-to-end validation with live Attio workspace data

**Performance Standards**:
- Search Operations: < 1000ms (local) / < 3000ms (CI)
- CRUD Operations: < 1500ms (local) / < 4000ms (CI)
- Batch Operations: < 3000ms for 10 records (local) / < 8000ms (CI)

## 🚀 Performance Testing Strategy

### Dual Performance Testing Architecture

The Attio MCP Server implements a **dual performance testing strategy** to provide comprehensive performance validation across different environments and use cases.

#### 🏃‍♂️ Regression Tests (`test/performance/regression.test.ts`)

**Purpose**: Fast, reliable performance regression detection for daily CI validation

**Key Characteristics**:
- **Mock-Based**: Uses mock data for zero API dependencies
- **Environment-Aware**: Automatic CI budget adjustment (2.5x multiplier)
- **Fast Execution**: Sub-millisecond response times
- **CI-Friendly**: Reliable in CI environments with varying resource constraints
- **Regression Detection**: Catches performance degradations in code logic

**Usage**:
```bash
# Local development (1x budgets)
npm test test/performance/regression.test.ts

# CI simulation (2.5x budgets)
CI=true npm test test/performance/regression.test.ts

# Custom budget testing
PERF_BUDGET_SEARCH=500 npm test test/performance/regression.test.ts
```

**Performance Budgets (Regression)**:
- **404 Responses**: 2000ms (local) / 5000ms (CI)
- **Search Operations**: 3000ms (local) / 7500ms (CI)
- **CRUD Operations**: 3000ms (local) / 7500ms (CI)
- **Delete Operations**: 2000ms (local) / 5000ms (CI)
- **Batch Operations**: 5000ms-10000ms (local) / 12500ms-25000ms (CI)

#### ⚡ Universal Tests (`test/handlers/tool-configs/universal/performance.test.ts`)

**Purpose**: Real-world API performance measurement under load for benchmarking

**Key Characteristics**:
- **Real API Calls**: Measures actual API performance with ATTIO_API_KEY
- **Load Testing**: Tests with 1, 10, 25, and 50 record batches
- **Concurrency Testing**: Validates rate limiting and concurrent request handling
- **Memory Monitoring**: Tracks memory usage during large operations
- **Environment-Aware**: Sophisticated CI multipliers for accurate benchmarking

**Usage**:
```bash
# Requires API key and integration test config
npm test --config vitest.config.integration.ts test/handlers/tool-configs/universal/performance.test.ts

# Alternative: Direct execution with proper config
ATTIO_API_KEY=your_key npx vitest --config vitest.config.integration.ts --run test/handlers/tool-configs/universal/performance.test.ts
```

**Performance Budgets (Universal)**:
- **Single Record**: 5000ms (local) / 12500ms (CI)
- **10 Records**: 15000ms (local) / 37500ms (CI)
- **25 Records**: 30000ms (local) / 75000ms (CI)
- **50 Records**: 60000ms (local) / 150000ms (CI)
- **Search Operations**: 5000ms-10000ms (local) / 12500ms-25000ms (CI)

### Environment Detection & Budget Calculation

Both test suites automatically detect CI environments and apply appropriate budget adjustments:

```typescript
// Automatic environment detection
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const CI_MULTIPLIER = isCI ? 2.5 : 1;

// Dynamic budget calculation
const searchBudget = Math.round(parseInt(process.env.PERF_BUDGET_SEARCH || '3000', 10) * CI_MULTIPLIER);
```

**Environment Variables**:
- `CI=true` or `GITHUB_ACTIONS=true`: Triggers CI mode
- `PERF_BUDGET_*`: Override default budgets for specific operations
- `ATTIO_API_KEY`: Required for universal tests (real API calls)

### When to Use Each Test Type

#### Use Regression Tests For:
- ✅ Daily CI validation and continuous integration
- ✅ Pull request validation and merge gates  
- ✅ Rapid development feedback loops
- ✅ Performance regression detection in business logic
- ✅ Testing in environments without API access

#### Use Universal Tests For:
- ✅ Release validation and pre-deployment verification
- ✅ API performance benchmarking and optimization
- ✅ Load testing and scalability validation
- ✅ Real-world performance measurement
- ✅ Memory usage and resource consumption analysis

### Performance Test Architecture

```
test/
├── performance/
│   └── regression.test.ts          # Fast mock-based regression detection
└── handlers/tool-configs/universal/
    └── performance.test.ts         # Real API performance benchmarking
```

**Regression Test Architecture**:
- Mock-based API responses for consistent timing
- Performance tracker integration for detailed metrics
- Environment-aware budget configuration
- Zero external dependencies

**Universal Test Architecture**:
- Real Attio API integration with authentication
- Concurrent batch processing validation
- Memory usage monitoring and leak detection
- Rate limiting and error handling verification

### Troubleshooting Performance Tests

#### Common Issues & Solutions

**Issue**: "Performance regression detected! One or more operations exceeded their performance budgets"
```bash
# Check if running in correct environment
echo "CI Detection: $CI, GitHub Actions: $GITHUB_ACTIONS"

# Verify budget calculations
CI=true node -e "console.log('CI Budget Multiplier:', process.env.CI === 'true' ? 2.5 : 1)"

# Run with verbose output to see actual timings
npm test test/performance/regression.test.ts -- --reporter=verbose
```

**Issue**: Universal tests fail with "Cannot find module @rollup/rollup-linux-x64-gnu"
```bash
# Fix Rollup dependency issue (common in CI)
rm -f package-lock.json
rm -rf node_modules  
npm install
```

**Issue**: Real API tests timeout or fail
```bash
# Verify API key setup
echo "API Key Length: ${#ATTIO_API_KEY}"  # Should be 64 characters

# Check test data configuration
npm run test:integration -- test/setup/test-data-setup.test.ts

# Run with extended timeout
npm test test/handlers/tool-configs/universal/performance.test.ts -- --testTimeout=300000
```

### CI/CD Integration

The dual strategy is integrated into CI/CD pipelines:

**CI Workflow** (`.github/workflows/performance-tests.yml`):
- Runs regression tests for all PRs and main branch pushes
- Uses environment-aware budgets automatically
- Includes Rollup dependency fix for CI environments
- Generates performance reports as artifacts

**Performance Comparison**:
- PR branch vs base branch performance analysis
- Automated regression detection and alerts
- Performance trend tracking over time

For more information, see the main [README](../README.md) and [Contributing Guide](../CONTRIBUTING.md).