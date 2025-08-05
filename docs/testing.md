# Testing Guide for Attio MCP Server

This guide explains how to set up and run tests for the Attio MCP Server, including unit tests and integration tests that interact with the Attio API.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Types](#test-types)
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

For more information, see the main [README](../README.md) and [Contributing Guide](../CONTRIBUTING.md).