# Tests for Attio MCP Server

This directory contains various tests for the Attio MCP Server project.

## Test Structure

The tests are organized as follows:

- `api/`: Tests that interact with the Attio API directly
- `handlers/`: Unit tests for tool handler functions
- `integration/`: Integration tests using mock API responses
- `manual/`: Manual test scripts for development and debugging
- `utils/`: Tests for utility functions

## Running Tests

### Unit and Integration Tests

Run all tests with Jest:

```bash
npm test
```

Run a specific test file:

```bash
npm test -- path/to/test/file.test.ts
```

For example, to run only the list details tests:

```bash
npm test -- handlers/tools.list-details.test.ts
```

### API Integration Tests

The API tests require an Attio API key. To run these tests:

1. Set your Attio API key:

```bash
export ATTIO_API_KEY=your_api_key_here
```

2. Optionally, set a specific test list ID:

```bash
export TEST_LIST_ID=your_test_list_id
```

3. Run the API tests:

```bash
npm test -- api/list-details.api.test.ts
```

To skip integration tests that require an API key:

```bash
export SKIP_INTEGRATION_TESTS=true
npm test
```

### Manual Test Scripts

For manual testing and debugging, use the scripts in the `manual/` directory:

```bash
node test/manual/test-get-list-details.js your_list_id
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions and components in isolation, using mocks for dependencies.

Example:

```typescript
describe('function name', () => {
  it('should do something specific', () => {
    // Test code here
  });
});
```

### Integration Tests

Integration tests should test how components work together, but may still mock external APIs.

### API Tests

API tests should verify that our code works correctly with the actual Attio API. These tests should:

1. Always check for SKIP_INTEGRATION_TESTS environment variable
2. Have proper timeouts (30s is recommended)
3. Not modify production data unexpectedly