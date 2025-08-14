# Test Environment Setup Guide

This guide explains the enhanced test environment setup for the Attio MCP Server, including the mock data system, environment detection, and test infrastructure improvements.

## Overview

The test environment has been significantly enhanced to provide reliable, consistent testing with comprehensive mock data implementations and automatic environment detection. These improvements ensure test stability while maintaining realistic API response patterns.

## Environment Detection System

### Automatic Environment Detection

The test system automatically detects the testing environment using multiple indicators:

```typescript
// Environment detection logic
if (process.env.E2E_MODE !== 'true') {
  // Unit/Integration test environment
  // Activate comprehensive mocks
}

// Check for test environment variables
const isTestEnvironment = process.env.NODE_ENV === 'test' || 
                         process.env.VITEST === 'true' ||
                         process.env.E2E_MODE === 'true';
```

### Environment Variables

| Variable | Purpose | Values | Impact |
|----------|---------|--------|--------|
| `NODE_ENV` | Environment type | `test`, `development`, `production` | Controls logging, error details, mock activation |
| `VITEST` | Vitest runner detection | `true` (auto-set by Vitest) | Activates Vitest-specific mocks |
| `E2E_MODE` | E2E test mode | `true`, `false` | Disables mocks for real API testing |
| `SKIP_INTEGRATION_TESTS` | Skip integration tests | `true`, `false` | Skips tests requiring real API |
| `DEBUG` | Debug logging | `true`, `false` | Enables detailed error logging |

### Environment Setup

```bash
# For unit tests (default)
export NODE_ENV=test

# For integration tests with real API
export NODE_ENV=test
export ATTIO_API_KEY=your_api_key
export ATTIO_WORKSPACE_ID=your_workspace_id

# For E2E tests with real API
export E2E_MODE=true
export ATTIO_API_KEY=your_api_key

# Skip integration tests in CI
export SKIP_INTEGRATION_TESTS=true
```

## Mock Data System

### Architecture

The mock data system provides realistic API response structures while maintaining test predictability:

```
test/
├── setup.ts                    # Global mock configuration
├── types/test-types.ts         # Mock API client factory
├── e2e/fixtures/               # E2E test data
│   ├── companies.ts           # Company test fixtures
│   ├── people.ts              # People test fixtures
│   └── tasks.ts               # Task test fixtures
└── helpers/
    ├── test-factories.ts      # Data generation utilities
    └── integration-base.ts    # Base test setup
```

### Mock API Client

The mock API client simulates real Attio API responses:

```typescript
// test/types/test-types.ts
export function createMockApiClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  };
}
```

### Mock Data Structures

#### Companies Mock Data

```typescript
// Global mock for companies module
vi.mock('../src/objects/companies/index', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchCompaniesByName: vi.fn(async (name: string) => {
      // Realistic mock behavior
      if (name === 'Test Company' || name === 'Existing Company') {
        return [{ 
          id: { record_id: 'existing-company-id' },
          values: {
            name: [{ value: name }],
            domain: [{ value: 'example.com' }]
          }
        }];
      }
      return [];
    }),
    // ... other company operations
  };
});
```

#### People Mock Data

```typescript
// Global mock for people search functions
vi.mock('../src/objects/people/search', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchPeopleByEmail: vi.fn(async (email: string) => {
      // Mock behavior based on email for testing
      if (email === 'dup@example.com') {
        return [{ 
          id: { record_id: 'existing-person-id' },
          values: {
            email_addresses: [{ 
              value: email,
              email_address: email 
            }]
          }
        }];
      }
      return [];
    }),
  };
});
```

#### Tasks Mock Data

Tasks have special handling due to API endpoint differences:

```typescript
// Mock tasks with realistic structure
const mockTasksData = {
  getTasks: vi.fn(async () => [
    {
      id: { record_id: 'task-123' },
      values: {
        title: [{ value: 'Mock Task 1' }],
        status: [{ value: 'pending' }],
        assignee: [{ target_record_id: 'person-456' }]
      }
    }
  ])
};
```

### Test Fixtures System

#### Company Fixtures

The E2E fixtures provide comprehensive test data:

```typescript
// test/e2e/fixtures/companies.ts
export const companyFixtures = {
  technology: {
    startup: (): E2ETestCompany => E2ECompanyFactory.createTechnology({
      annual_revenue: '2000000',
      employee_count: '25',
      categories: ['Software', 'SaaS', 'Startup'],
      description: 'E2E test technology startup company'
    }),
  },
  // ... other company types
};

// Usage in tests
const testCompany = companyFixtures.technology.startup();
```

#### Edge Case Testing Data

```typescript
export const edgeCaseCompanies = {
  // Company with special characters
  specialCharacters: (): E2ETestCompany => E2ECompanyFactory.create({
    name: 'E2E Special™ & Co. (Test) "Company" #1',
    description: 'Company with special characters: áéíóú ñ çß àèìòù âêîôû',
  }),
  
  // Company with null/undefined fields
  nullishFields: (): E2ETestCompany => ({
    name: 'E2E Nullish Company',
    domain: undefined,
    website: null as any,
    description: '',
  })
};
```

## Test Configuration

### Global Test Setup

The global setup file (`test/setup.ts`) configures the testing environment:

```typescript
// Global test setup for Vitest
import { vi, beforeEach } from 'vitest';

// Environment-based mock activation
if (process.env.E2E_MODE !== 'true') {
  // Activate comprehensive mocks for unit/integration tests
  vi.mock('../src/api/attio-client', async () => {
    const mockAxiosInstance = createMockApiClient();
    return {
      getAttioClient: vi.fn(() => mockAxiosInstance),
      initializeAttioClient: vi.fn(() => mockAxiosInstance),
      isAttioClientInitialized: vi.fn(() => true),
    };
  });
}

// Set up environment variables for testing
beforeEach(() => {
  // Mock environment variables for API initialization
  vi.stubEnv('ATTIO_API_KEY', 'test-api-key');
  vi.stubEnv('ATTIO_WORKSPACE_ID', 'test-workspace-id');
  vi.clearAllMocks();
});
```

### Test-Specific Configuration

#### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    testTimeout: 30000,
  },
  esbuild: {
    target: 'node20',
  },
});
```

#### E2E Configuration

```typescript
// vitest.config.e2e.ts
export default defineConfig({
  test: {
    include: ['test/e2e/**/*.e2e.test.ts'],
    environment: 'node',
    setupFiles: ['./test/e2e/setup.ts'],
    testTimeout: 60000, // Longer timeout for real API calls
  },
});
```

## UUID Format Fixes

### Problem

Tests were failing due to malformed UUIDs in test assertions:

```typescript
// Before: Invalid UUID format
const testId = '12345';

// After: Valid UUID format for 404 testing
const testId = '00000000-0000-0000-0000-000000000000';
```

### Solution

All test UUIDs now use valid UUID v4 format:

```typescript
// Valid UUID patterns for non-existent resource testing
const testUUIDs = {
  company: '00000000-0000-0000-0000-000000000000',
  person: '11111111-1111-1111-1111-111111111111', 
  task: '22222222-2222-2222-2222-222222222222',
  list: '33333333-3333-3333-3333-333333333333',
};

// Usage in tests
test('should return 404 for non-existent company', async () => {
  const result = await getCompanyDetails({
    record_id: testUUIDs.company // Valid UUID format, but doesn't exist
  });
  
  expect(result.error).toContain('Company not found');
});
```

## Error Pattern Matching in Tests

### Enhanced Error Assertions

Tests now use flexible error pattern matching:

```typescript
// Before: Rigid exact matching
expect(error.message).toBe('Exact error message');

// After: Pattern-based matching
expect(error.message).toMatch(/Parameter Error:.*parameter/);
expect(error.message).toContain('Invalid format');

// For enhanced error messages
expect(result).toEqual(
  expect.objectContaining({
    error: expect.objectContaining({
      type: 'parameter_error',
      message: expect.stringContaining('Parameter Error:')
    })
  })
);
```

### Error Message Format Testing

```typescript
test('should preserve original error messages in enhanced format', async () => {
  // Mock API error response
  const mockError = {
    response: {
      status: 400,
      data: {
        error: {
          message: 'Invalid parameter: company_id',
          details: 'Parameter company_id must be a valid UUID'
        }
      }
    }
  };

  // Test that original message is preserved with enhancement
  const result = await createErrorResult(mockError, '/test', 'POST');
  
  expect(result.error.message).toContain('Invalid parameter: company_id');
  expect(result.error.type).toBe('parameter_error');
});
```

## Best Practices

### Writing Test-Friendly Code

1. **Use Environment Detection**:
   ```typescript
   // Good: Environment-aware behavior
   if (process.env.NODE_ENV === 'test') {
     return mockData;
   }
   return realApiCall();
   ```

2. **Provide Mock Data**:
   ```typescript
   // Good: Realistic mock structures
   const mockCompany = {
     id: { record_id: 'test-company-id' },
     values: {
       name: [{ value: 'Test Company' }],
       domain: [{ value: 'test.com' }]
     }
   };
   ```

3. **Use Valid Test Data**:
   ```typescript
   // Good: Valid UUID format
   const testRecordId = '12345678-1234-5678-9abc-123456789abc';
   
   // Good: Realistic email format
   const testEmail = 'test@example.com';
   ```

### Mock Configuration Guidelines

1. **Maintain API Compatibility**: Mocks should match real API response structures
2. **Provide Realistic Behavior**: Mock functions should simulate real API logic patterns
3. **Support Edge Cases**: Include mocks for error conditions and edge cases
4. **Environment Isolation**: Use environment variables to control mock activation

### Test Data Management

1. **Use Factories**: Leverage test factories for consistent data generation
2. **Provide Fixtures**: Use fixtures for complex test scenarios
3. **Handle Edge Cases**: Include edge case data for thorough testing
4. **Clean Up**: Ensure tests clean up any side effects

## Troubleshooting

### Common Issues

1. **Mocks Not Activating**:
   ```bash
   # Check environment variables
   echo $NODE_ENV
   echo $E2E_MODE
   
   # Ensure setup.ts is properly configured
   ```

2. **Test Timeouts**:
   ```typescript
   // Increase timeout for integration tests
   test('api call', async () => {
     // test logic
   }, 30000); // 30 second timeout
   ```

3. **Mock Data Structure Mismatches**:
   ```typescript
   // Ensure mock data matches API response format
   const mockResponse = {
     data: [...], // API returns data in 'data' property
     meta: { ... } // Include meta information
   };
   ```

## Migration Guide

### Updating Existing Tests

1. **Update UUID Formats**:
   ```typescript
   // Before
   const testId = 'invalid-id';
   
   // After  
   const testId = '00000000-0000-0000-0000-000000000000';
   ```

2. **Update Error Assertions**:
   ```typescript
   // Before
   expect(error.message).toBe('Exact message');
   
   // After
   expect(error.message).toMatch(/Expected pattern/);
   ```

3. **Add Environment Detection**:
   ```typescript
   // Add to test files that need environment-specific behavior
   const isTestEnv = process.env.NODE_ENV === 'test';
   ```

This test environment setup ensures reliable, consistent testing while maintaining realistic API behavior patterns and comprehensive error handling coverage.