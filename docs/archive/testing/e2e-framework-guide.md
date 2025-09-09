# E2E Test Framework Guide

This comprehensive guide covers the End-to-End (E2E) testing framework implemented in Issue #403, which achieved 100% test pass rate (51/51 tests passing) for universal tools validation.

## 🎯 Framework Overview

The E2E test framework provides production-ready testing of universal MCP tools with real Attio API integration, validating the complete request-response cycle from Claude Desktop through MCP protocol to Attio API.

### Key Features

- **100% Pass Rate**: Achieved through robust error handling and API contract validation
- **Real API Integration**: Tests against live Attio workspace data
- **Performance Monitoring**: Tracks execution times and enforces performance budgets
- **Cross-Resource Testing**: Validates consistent behavior across companies, people, tasks, and lists
- **Comprehensive Coverage**: Tests all 13 universal tools with pagination, field filtering, and error cases

## 🏗️ Architecture Overview

### Framework Structure

```
test/e2e/
├── suites/                          # Test suites organized by functionality
│   ├── universal-tools.e2e.test.ts  # Core universal tools (51 tests)
│   ├── tasks-management.e2e.test.ts # Task-specific operations
│   ├── lists-management.e2e.test.ts # List and pipeline operations
│   ├── notes-management.e2e.test.ts # Notes and content operations
│   └── error-handling.e2e.test.ts   # Error case validation
├── utils/                           # Core utilities and helpers
│   ├── assertions.ts                # 7 enhanced assertion methods
│   ├── config-loader.ts             # Configuration management
│   ├── logger.ts                    # Test logging and monitoring
│   └── test-data.ts                 # Test data generation
├── fixtures/                        # Test data factories
│   ├── companies.ts                 # Company test data generation
│   ├── people.ts                    # Person test data generation
│   ├── tasks.ts                     # Task test data generation
│   └── index.ts                     # Factory exports
├── setup/                           # Test environment setup
│   ├── env-loader.ts                # Environment configuration
│   └── preflight.ts                 # Pre-test validation
├── types/                           # Type definitions
│   └── index.ts                     # E2E-specific types
├── config.template.json             # Configuration template
├── setup.ts                         # Global test setup
└── README.md                        # E2E documentation
```

### Test Execution Flow

1. **Environment Validation**: Check API key, workspace access, and configuration
2. **Test Data Setup**: Create or validate test records in Attio workspace
3. **Mock Isolation**: Clear unit test mocks to ensure real API calls
4. **Tool Execution**: Call universal tools through MCP dispatcher
5. **Response Validation**: Use enhanced assertions for comprehensive validation
6. **Performance Tracking**: Monitor execution times and resource usage
7. **Cleanup**: Remove test data and restore environment

## 🛠️ Core Components

### 1. Enhanced Assertion Library

The framework includes 7 specialized assertion methods for comprehensive validation:

#### `expectValidPagination(response, expectedLimit?)`

Validates pagination parameter handling across universal tools.

```typescript
import { E2EAssertions } from '../utils/assertions.js';

// Test pagination with offset parameter
const firstPageResponse = await callUniversalTool('search-records', {
  resource_type: 'companies',
  query: 'test',
  limit: 5,
  offset: 0
});

E2EAssertions.expectValidPagination(firstPageResponse, 5);

// Test second page
const secondPageResponse = await callUniversalTool('search-records', {
  resource_type: 'companies',
  query: 'test',
  limit: 5,
  offset: 5
});

E2EAssertions.expectValidPagination(secondPageResponse, 5);
```

#### `expectFieldFiltering(response, requestedFields?)`

Validates field filtering capabilities for selective data retrieval.

```typescript
// Test field filtering on get-record-details
const response = await callUniversalTool('get-record-details', {
  resource_type: 'companies',
  record_id: testCompanyId,
  fields: ['name', 'domains', 'created_at']
});

E2EAssertions.expectFieldFiltering(response, ['name', 'domains', 'created_at']);
```

#### `expectValidTasksIntegration(response, operation)`

Validates tasks resource type integration across universal tools.

```typescript
// Test task creation
const createResponse = await callUniversalTool('create-record', {
  resource_type: 'tasks',
  record_data: {
    values: {
      title: [{ value: 'E2E Test Task' }],
      content: [{ value: 'Test task content' }]
    }
  }
});

E2EAssertions.expectValidTasksIntegration(createResponse, 'create');

// Test task search
const searchResponse = await callUniversalTool('search-records', {
  resource_type: 'tasks',
  query: 'E2E Test',
  limit: 10
});

E2EAssertions.expectValidTasksIntegration(searchResponse, 'search');
```

#### `expectSpecificError(response, errorType)`

Validates specific error types for proper error handling validation.

```typescript
// Test validation error
const response = await callUniversalTool('create-record', {
  resource_type: 'companies'
  // Missing required record_data
});

E2EAssertions.expectSpecificError(response, 'validation');

// Test not found error
const notFoundResponse = await callUniversalTool('get-record-details', {
  resource_type: 'companies',
  record_id: 'non-existent-record-id'
});

E2EAssertions.expectSpecificError(notFoundResponse, 'notFound');
```

#### `expectOptimalPerformance(response, maxExecutionTime?)`

Validates performance characteristics and response sizes.

```typescript
// Monitor performance with timing
const start = Date.now();
const response = await callUniversalTool('search-records', {
  resource_type: 'companies',
  query: 'tech companies',
  limit: 50
});

// Add timing metadata
response._meta = { executionTime: Date.now() - start };

// Validate performance budget (1000ms for search operations)
E2EAssertions.expectOptimalPerformance(response, 1000);
```

#### `expectValidUniversalToolParams(response, expectedParams)`

Validates universal tool parameter processing.

```typescript
const params = {
  resource_type: 'people',
  limit: 25,
  offset: 10,
  fields: ['name', 'email_addresses']
};

const response = await callUniversalTool('advanced-search', {
  ...params,
  query: 'test',
  filters: {}
});

E2EAssertions.expectValidUniversalToolParams(response, params);
```

#### `expectValidBatchOperation(response, batchSize)`

Validates batch operations for bulk processing.

```typescript
const batchRecords = [
  { values: { name: [{ value: 'Test Company 1' }] } },
  { values: { name: [{ value: 'Test Company 2' }] } },
  { values: { name: [{ value: 'Test Company 3' }] } }
];

const response = await callUniversalTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'create',
  records: batchRecords
});

E2EAssertions.expectValidBatchOperation(response, batchRecords.length);
```

### 2. Test Data Management

#### Test Data Factories

The framework includes factories for generating consistent test data:

```typescript
// Company test data
import { CompanyFactory } from '../fixtures/companies.js';

const testCompany = CompanyFactory.create({
  nameOverride: 'E2E Test Company',
  domainOverride: 'e2e-test-company.com'
});

// Person test data
import { PersonFactory } from '../fixtures/people.js';

const testPerson = PersonFactory.create({
  emailDomain: 'e2e-test.com'
});

// Task test data
import { TaskFactory } from '../fixtures/tasks.js';

const testTask = TaskFactory.create({
  contentOverride: 'E2E test task content'
});
```

#### Test Data Cleanup

Automatic cleanup ensures test data doesn't accumulate:

```typescript
// Track created records for cleanup
function trackForCleanup(type: string, id: string, data?: any): void {
  createdRecords.push({ type, id, data });
  E2ETestBase.trackForCleanup(type as any, id, data);
}

// Cleanup runs after all tests
afterAll(async () => {
  for (const record of createdRecords) {
    try {
      await callUniversalTool('delete-record', {
        resource_type: getResourceTypeForRecord(record.type),
        record_id: record.id
      });
    } catch (error) {
      console.warn(`Failed to cleanup ${record.type}:${record.id}:`, error);
    }
  }
});
```

### 3. Configuration Management

#### Environment Configuration

```typescript
// E2E configuration structure
interface E2EConfig {
  testData: {
    testDataPrefix: string;
    testEmailDomain: string;
    testCompanyDomain: string;
    existingCompanyId?: string;
    existingPersonId?: string;
    existingListId?: string;
  };
  features: {
    skipTaskTests: boolean;
    skipLongRunningTests: boolean;
  };
  performance: {
    searchBudget: number;
    crudBudget: number;
    batchBudget: number;
  };
}

// Load configuration
import { loadE2EConfig } from '../utils/config-loader.js';
const config = await loadE2EConfig();
```

#### Configuration Files

Create `test/e2e/config.local.json` from template:

```json
{
  "testData": {
    "testDataPrefix": "E2E_TEST_",
    "testEmailDomain": "e2e-test.com",
    "testCompanyDomain": "e2e-test-company.com",
    "existingCompanyId": "your-test-company-id-here",
    "existingPersonId": "your-test-person-id-here",
    "existingListId": "your-test-list-id-here"
  },
  "features": {
    "skipTaskTests": false,
    "skipLongRunningTests": false
  },
  "performance": {
    "searchBudget": 1000,
    "crudBudget": 1500,
    "batchBudget": 3000
  }
}
```

## 📊 Performance Monitoring

### Performance Budgets

The framework enforces performance budgets to prevent regression:

| Operation Type | Local Budget | CI Budget | Validation Method |
|---|---|---|---|
| Search Operations | 1000ms | 3000ms | `expectOptimalPerformance` |
| CRUD Operations | 1500ms | 4000ms | `expectOptimalPerformance` |
| Batch Operations | 3000ms | 8000ms | `expectOptimalPerformance` |
| Field Filtering | +500ms | +1000ms | `expectFieldFiltering` |
| Pagination | +200ms | +500ms | `expectValidPagination` |

### Performance Monitoring Implementation

```typescript
// Performance monitoring helper
class E2EPerformanceMonitor {
  private static measurements = new Map<string, number[]>();

  static measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T & { _meta?: { executionTime: number } }> {
    const start = Date.now();
    
    return operation().then(result => {
      const executionTime = Date.now() - start;
      
      // Track measurements for reporting
      if (!this.measurements.has(operationName)) {
        this.measurements.set(operationName, []);
      }
      this.measurements.get(operationName)!.push(executionTime);
      
      // Add timing metadata to response
      if (typeof result === 'object' && result) {
        (result as any)._meta = { 
          ...(result as any)._meta,
          executionTime 
        };
      }
      
      return result;
    });
  }

  static generateReport(): string {
    let report = '📊 E2E Performance Report:\n';
    
    for (const [operation, times] of this.measurements) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      
      report += `  ${operation}: avg=${avg.toFixed(0)}ms, max=${max}ms, min=${min}ms (${times.length} calls)\n`;
    }
    
    return report;
  }
}

// Usage in tests
const response = await E2EPerformanceMonitor.measureOperation(
  'search-companies',
  () => callUniversalTool('search-records', {
    resource_type: 'companies',
    query: 'test',
    limit: 10
  })
);

E2EAssertions.expectOptimalPerformance(response, 1000);
```

## 🔧 Critical Implementation Details

### Issue #403 Bug Fixes

#### 1. MCP Response Format Consistency

**Problem**: Missing `isError: false` in successful responses caused assertion failures.

**Solution**: Enhanced dispatcher to ensure consistent response format:

```typescript
// In src/handlers/tools/dispatcher/core.ts
return {
  content: [{ type: 'text', text: formattedResult }],
  isError: false  // ✅ Always include in successful responses
};
```

#### 2. Field Validation Resolution

**Problem**: Incorrect `record_data.values` structure validation.

**Solution**: Updated field validation to handle Attio's array-based attribute format:

```typescript
// In src/handlers/tool-configs/universal/shared-handlers.ts
function validateRecordFields(recordData: any): ValidationResult {
  if (!recordData.values) {
    return { valid: false, error: 'Missing values object' };
  }
  
  // Validate each field follows Attio format: [{ value: ... }]
  for (const [fieldName, fieldValue] of Object.entries(recordData.values)) {
    if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      // Valid Attio format
      continue;
    } else {
      return { 
        valid: false, 
        error: `Field ${fieldName} must be array format: [{ value: ... }]` 
      };
    }
  }
  
  return { valid: true };
}
```

#### 3. Import Error Resolution

**Problem**: Test files had incorrect imports causing 97% skip rate.

**Solution**: Fixed import paths in test files:

```typescript
// ❌ Wrong imports causing module errors
import { enhancedToolCaller } from '../utils/enhanced-tool-caller.js';

// ✅ Fixed imports
import { executeToolRequest } from '../../../src/handlers/tools/dispatcher.js';
import { E2EAssertions } from '../utils/assertions.js';
```

#### 4. JSON Response Handling

**Problem**: Large responses were truncated, causing parsing errors.

**Solution**: Enhanced JSON handling with size limits and graceful degradation:

```typescript
function parseApiResponse(response: string): any {
  try {
    // Handle potential truncation
    if (response.includes('...') || response.length > 100000) {
      // Extract structured data before truncation
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    
    return JSON.parse(response);
  } catch (error) {
    // Return response as text if JSON parsing fails
    return response;
  }
}
```

### Mock Isolation Strategy

E2E tests must use real API calls, not mocks from unit tests:

```typescript
beforeEach(() => {
  // Clear all mocks before each E2E test
  vi.resetAllMocks();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  
  // Unmock specific modules that E2E tests need
  vi.unmock('../../../src/objects/companies/search');
  vi.unmock('../../../src/objects/people/search');
  vi.unmock('../../../src/api/attio-client');
});
```

## 🚀 Running E2E Tests

### Prerequisites

1. **Environment Setup**:
```bash
# Required: API key in .env
echo "ATTIO_API_KEY=your_64_character_api_key_here" > .env

# Optional: Custom configuration
cp test/e2e/config.template.json test/e2e/config.local.json
# Edit config.local.json with your workspace-specific data
```

2. **Build Project**:
```bash
npm run build
```

3. **Verify API Connectivity**:
```bash
curl -H "Authorization: Bearer $ATTIO_API_KEY" \
  "https://api.attio.com/v2/objects/companies/attributes"
```

### Execution Commands

```bash
# Full E2E test suite (recommended)
npm run e2e

# Specific test suite
npm test -- test/e2e/suites/universal-tools.e2e.test.ts

# Single test with debugging
npm test -- test/e2e/suites/universal-tools.e2e.test.ts -t "should search companies successfully" --reporter=verbose

# Performance monitoring
npm test -- test/e2e/suites/universal-tools.e2e.test.ts --reporter=verbose | grep "Performance"
```

### Expected Results

**✅ Success Pattern**:
```
Test Files  1 passed (1)
Tests  51 passed (51)
Duration: 45.2s

✅ Universal Tools E2E Test Suite
  ✅ Core Operations - CRUD and Basic Tools (8 tools) - 32 passed
  ✅ Advanced Operations - Search and Batch Tools (5 tools) - 10 passed
  ✅ Pagination and Field Filtering Tests - 6 passed
  ✅ Tasks Universal Tools Integration - 3 passed
```

**❌ Failure Patterns** (see [E2E Troubleshooting Guide](./e2e-troubleshooting.md)):
```
Tests  3 passed | 48 skipped (51) # Import errors
Tests  25 passed | 26 failed (51) # API/configuration issues
```

## 🔍 Advanced Usage

### Custom Test Scenarios

Create custom test scenarios for workspace-specific validation:

```typescript
describe('Workspace-Specific Validation', () => {
  it('should handle custom company attributes', async () => {
    const response = await callUniversalTool('discover-attributes', {
      resource_type: 'companies'
    });
    
    E2EAssertions.expectMcpSuccess(response);
    
    // Parse attributes and validate custom fields
    const attributes = JSON.parse(response.content[0].text);
    const customAttributes = attributes.filter(attr => 
      attr.slug.startsWith('custom_') || 
      !['name', 'domains', 'created_at'].includes(attr.slug)
    );
    
    expect(customAttributes.length, 'Should have custom attributes').toBeGreaterThan(0);
  });
});
```

### Integration with CI/CD

```yaml
# GitHub Actions E2E Test Job
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build project
        run: npm run build
      
      - name: Run E2E tests
        run: npm run e2e
        env:
          ATTIO_API_KEY: ${{ secrets.ATTIO_API_KEY }}
          NODE_ENV: ci  # Use CI-specific performance budgets
```

## 📚 Related Documentation

- [E2E Assertion Methods Reference](./e2e-assertion-methods.md) - Detailed documentation for all 7 assertion methods
- [E2E Troubleshooting Guide](./e2e-troubleshooting.md) - Common issues and solutions
- [Performance Testing Guide](./performance-testing.md) - Performance monitoring best practices
- [Universal Tools API Reference](../universal-tools/api-reference.md) - Complete universal tools documentation
- [Testing Guide](../testing.md) - Main testing documentation

## 🤝 Contributing to E2E Tests

### Adding New Test Cases

1. **Follow naming conventions**:
```typescript
describe('Feature Name', () => {
  it('should handle specific scenario', async () => {
    // Test implementation
  });
});
```

2. **Use appropriate assertions**:
```typescript
// Always start with basic success validation
E2EAssertions.expectMcpSuccess(response);

// Add specific enhanced validations
E2EAssertions.expectValidPagination(response, expectedLimit);
```

3. **Include cleanup**:
```typescript
// Track created resources
const recordId = await createTestRecord('companies');
trackForCleanup('company', recordId);
```

4. **Add performance monitoring**:
```typescript
// Monitor test performance
const measurement = startMeasurement('test-name', 'operation-name');
const response = await callTool(...);
const duration = measurement.end();
```

### Best Practices

- **Test real scenarios**: Use realistic test data and workflows
- **Validate comprehensively**: Use multiple assertion methods per test
- **Monitor performance**: Always include timing for performance-sensitive operations
- **Handle errors gracefully**: Test both success and failure cases
- **Clean up resources**: Always track and clean up created test data
- **Document edge cases**: Comment on any workspace-specific requirements

This E2E framework provides a solid foundation for validating universal tools with real API integration while maintaining high performance standards and comprehensive coverage.