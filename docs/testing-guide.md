# Testing Guide for Attio MCP Server

## Overview

The Attio MCP Server uses a three-tier testing strategy with Vitest to ensure code quality and reliability. This guide explains the testing architecture, common commands, and troubleshooting tips.

## Testing Architecture

### Three Configuration Files

1. **`vitest.config.ts`** - Default configuration for unit tests
   - Excludes integration tests
   - Uses mocks via `test/setup.ts`
   - Globals enabled (Issue #491 fix)
   - 30-second timeout

2. **`vitest.config.offline.ts`** - Offline unit tests
   - Excludes all integration and E2E tests
   - Full mocking enabled
   - Parallel execution (50% CPU cores)
   - 10-second timeout

3. **`vitest.config.integration.ts`** - Integration/E2E tests
   - Real API calls
   - Sequential execution (rate limiting)
   - Extended timeouts (60 seconds)
   - Retry on failure (1 retry)
   - Environment variables from `.env`

## Test Commands

### Essential Commands

```bash
# Unit Tests (with mocks)
npm test                    # Run all unit tests (default config)
npm run test:offline        # Run unit tests in offline mode
npm run test:watch          # Watch mode for development

# Integration Tests (real API)
npm run test:integration    # Run all integration tests
npm run test:integration:only # Run only tests in test/integration/
npm run test:integration:watch # Watch mode for integration tests

# Coverage
npm run test:coverage       # Unit tests with coverage
npm run test:coverage:offline # Offline tests with coverage

# Performance
npm run test:performance    # Run performance regression tests
```

### Common Patterns

```bash
# Run specific test file
npm test path/to/test.test.ts

# Run tests matching pattern
npm test -- -t "search"

# Run with verbose output
npm run test:debug

# Run specific integration test
npm run test:integration:real-api
```

### ⚠️ Important: Avoid These Commands

```bash
# WRONG - Uses default config which excludes integration tests
npm test -- test/integration/

# CORRECT - Uses proper integration config
npm run test:integration:only
```

## Test File Organization

```
test/
├── setup.ts                     # Global test setup
├── vitest.d.ts                  # TypeScript globals
├── utils/
│   ├── test-cleanup.ts          # E2E data cleanup utilities
│   └── mock-factories/          # Mock data factories
├── handlers/                    # Handler unit tests
├── objects/                     # Object operation tests
├── integration/                 # Integration tests (real API)
└── performance/                 # Performance tests
```

## Environment Setup

### Required for Integration Tests

Create a `.env` file in the project root:

```bash
ATTIO_API_KEY=sk_your_api_key_here
```

### Optional Environment Variables

```bash
# Skip integration tests
SKIP_INTEGRATION_TESTS=true

# Enable E2E mode (disables mocks)
E2E_MODE=true

# Custom test prefix for data cleanup
TEST_PREFIX=TEST_
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyFunction', () => {
  it('should work correctly', () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { validateTestEnvironment, cleanupTestData } from '../utils/test-cleanup';

describe('Integration: API Operations', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestData('TEST_');
  });

  it('should create a record', async () => {
    // Real API call
    const result = await createRecord({ name: 'TEST_Record' });
    expect(result).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "describe is not defined" Error

**Problem**: Tests fail with `ReferenceError: describe is not defined`

**Solution**: Fixed in Issue #491 - ensure `vitest.config.ts` has `globals: true`

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true, // Must be true
    // ...
  }
});
```

#### 2. Integration Tests Not Found

**Problem**: `npm test -- test/integration/` returns "No test files found"

**Solution**: Use the correct command:
```bash
npm run test:integration      # All integration tests
npm run test:integration:only # Only test/integration/ directory
```

#### 3. API Authentication Failures

**Problem**: Integration tests fail with 401 errors

**Solution**: Check your `.env` file:
- Ensure `ATTIO_API_KEY` is set
- Verify the key starts with `sk_`
- Check the key is valid and not expired

#### 4. Rate Limiting Errors (429)

**Problem**: Tests fail with "Too Many Requests"

**Solution**: 
- Integration tests run sequentially by default
- Add delays between tests if needed
- Use the retry utilities from `test/utils/test-cleanup.ts`

```typescript
import { retryWithBackoff, waitForRateLimit } from '../utils/test-cleanup';

// Retry with exponential backoff
const result = await retryWithBackoff(
  () => apiCall(),
  3,     // max retries
  1000   // initial delay
);
```

#### 5. Test Data Pollution

**Problem**: Tests fail due to existing test data

**Solution**: Use cleanup utilities:
```typescript
import { cleanupTestData } from '../utils/test-cleanup';

afterAll(async () => {
  await cleanupTestData('TEST_');
});
```

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically in CI with these stages:

1. **Lint & Type Check** - Code quality
2. **Unit Tests** - Fast, mocked tests
3. **Integration Tests** - On PR to main or with label
4. **Coverage Report** - Test coverage metrics

### Running Tests Locally Like CI

```bash
# Simulate CI environment
CI=true npm test

# Run the full CI test suite
npm run lint:check && npm run typecheck && npm test && npm run test:integration
```

## Best Practices

### 1. Test Naming Conventions

- Use descriptive test names
- Prefix integration tests with "Integration:"
- Prefix E2E tests with "E2E:"

### 2. Test Data

- Always prefix test data with "TEST_" or similar
- Clean up test data after tests
- Don't use production-like data

### 3. Mocking

- Use mock factories from `/test/utils/mock-factories/`
- Keep mocks in sync with API responses
- Don't mock in integration tests

### 4. Performance

- Keep unit tests under 100ms
- Integration tests should complete within 60s
- Use parallel execution for unit tests
- Use sequential execution for integration tests

## Mock Factories

### Using Mock Factories

```typescript
import { TaskMockFactory } from '../utils/mock-factories/TaskMockFactory';

const mockTask = TaskMockFactory.create({
  content: 'Custom task content'
});
```

### Available Factories

- `TaskMockFactory` - Create mock tasks
- `CompanyMockFactory` - Create mock companies
- `PersonMockFactory` - Create mock people
- `ListMockFactory` - Create mock lists
- `UniversalMockFactory` - Multi-resource mocks

## Debugging Tests

### Verbose Output

```bash
npm run test:debug
```

### VSCode Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:debug"],
  "console": "integratedTerminal"
}
```

### Single Test Debugging

```bash
# Run single test file with verbose output
npx vitest run path/to/test.test.ts --reporter=verbose
```

## Performance Testing

### Running Performance Tests

```bash
# Local environment
npm run test:performance

# CI environment (relaxed thresholds)
CI=true npm run test:performance
```

### Performance Budgets

- Operations should complete within baseline limits
- CI environment gets 2.5x multiplier automatically
- Monitor for regressions in PR reviews

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [Attio API Documentation](https://docs.attio.com/api)
- [MCP Testing Best Practices](https://modelcontextprotocol.io/docs/testing)

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/kesslerio/attio-mcp-server/issues)
2. Review test examples in the codebase
3. Create a new issue with reproduction steps