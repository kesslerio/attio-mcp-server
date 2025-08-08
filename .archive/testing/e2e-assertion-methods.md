# E2E Assertion Methods Documentation

This document provides comprehensive documentation for the 7 enhanced assertion methods added in Issue #403 to support robust E2E testing of universal tools.

## Overview

The E2E assertion library (`test/e2e/utils/assertions.ts`) provides specialized validation methods for testing universal MCP tools with real Attio API integration. These assertions go beyond basic success/failure checking to validate specific functionality like pagination, field filtering, and performance characteristics.

## 🆕 Enhanced Assertion Methods

### 1. `expectValidPagination(response, expectedLimit?)`

**Purpose**: Validates that pagination parameters (especially `offset`) are handled correctly by universal tools.

**Use Cases**:
- Testing `search-records` with different offset values
- Validating `advanced-search` pagination behavior  
- Ensuring large offset values don't cause errors

**Code Example**:
```typescript
import { E2EAssertions } from '../utils/assertions.js';

// Test pagination with offset parameter
const response = await enhancedToolCaller.callTool('search-records', {
  resource_type: 'companies',
  query: 'test',
  limit: 5,
  offset: 10
});

// Validate pagination was handled correctly
E2EAssertions.expectValidPagination(response, 5);
```

**What it validates**:
- ✅ MCP response is successful (no errors)
- ✅ Response acknowledges limit parameter if provided
- ✅ Pagination parameters were processed without errors

---

### 2. `expectFieldFiltering(response, requestedFields?)`

**Purpose**: Validates that field filtering parameters are correctly processed and return only requested fields.

**Use Cases**:
- Testing `get-record-details` with specific fields
- Validating `get-attributes` field selection
- Ensuring invalid field names are handled gracefully

**Code Example**:
```typescript
// Test field filtering with specific fields
const response = await enhancedToolCaller.callTool('get-record-details', {
  resource_type: 'companies',
  record_id: 'test-company-id',
  fields: ['name', 'domains', 'created_at']
});

// Validate field filtering worked correctly  
E2EAssertions.expectFieldFiltering(response, ['name', 'domains', 'created_at']);
```

**What it validates**:
- ✅ MCP response is successful
- ✅ Response contains references to requested fields
- ✅ Single field requests return expected field content
- ✅ Multiple field requests return structured data

---

### 3. `expectValidTasksIntegration(response, operation)`

**Purpose**: Validates that tasks resource type operations work correctly across all universal tools.

**Use Cases**:
- Testing task creation with `create-record`
- Validating task search with `search-records`
- Ensuring task attribute discovery works

**Code Example**:
```typescript
// Test task creation
const createResponse = await enhancedToolCaller.callTool('create-record', {
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
const searchResponse = await enhancedToolCaller.callTool('search-records', {
  resource_type: 'tasks',
  query: 'E2E Test',
  limit: 10
});

E2EAssertions.expectValidTasksIntegration(searchResponse, 'search');
```

**Supported Operations**:
- `'search'` - Validates task search results
- `'create'` - Validates task creation responses
- `'attributes'` - Validates task attribute discovery

**What it validates**:
- ✅ MCP response is successful
- ✅ Response contains task-specific content
- ✅ Operation-specific validation (creation success, search results, etc.)

---

### 4. `expectSpecificError(response, errorType)`

**Purpose**: Validates that specific error types are returned correctly for invalid operations.

**Use Cases**:
- Testing validation errors for invalid parameters
- Ensuring unauthorized operations return correct error types
- Validating not found errors for non-existent records

**Code Example**:
```typescript
// Test validation error for missing required parameter
const response = await enhancedToolCaller.callTool('create-record', {
  resource_type: 'companies'
  // Missing required record_data parameter
});

E2EAssertions.expectSpecificError(response, 'validation');

// Test not found error for non-existent record
const notFoundResponse = await enhancedToolCaller.callTool('get-record-details', {
  resource_type: 'companies',
  record_id: 'non-existent-record-id'
});

E2EAssertions.expectSpecificError(notFoundResponse, 'notFound');
```

**Error Types**:
- `'validation'` - Invalid parameters, missing required fields
- `'notFound'` - Record/resource doesn't exist (404 errors)
- `'unauthorized'` - Authentication/permission errors (401/403)
- `'rateLimited'` - Too many requests (429 errors)

**What it validates**:
- ✅ Response indicates error state (`isError: true` or error message)
- ✅ Error message matches expected error type pattern
- ✅ Appropriate error codes/messages are returned

---

### 5. `expectOptimalPerformance(response, maxExecutionTime?)`

**Purpose**: Validates performance characteristics including execution time and response size.

**Use Cases**:
- Ensuring API operations complete within performance budgets
- Validating response sizes are reasonable
- Performance regression testing

**Code Example**:
```typescript
// Test performance for search operation
const start = Date.now();
const response = await enhancedToolCaller.callTool('search-records', {
  resource_type: 'companies',
  query: 'tech',
  limit: 50
});
const executionTime = Date.now() - start;

// Add execution time to response metadata
response._meta = { executionTime };

// Validate performance meets budget (1000ms max)
E2EAssertions.expectOptimalPerformance(response, 1000);
```

**Performance Budgets** (from README):
- **Search Operations**: < 1000ms per API call
- **CRUD Operations**: < 1500ms per operation  
- **Batch Operations**: < 3000ms for 10 records

**What it validates**:
- ✅ MCP response is successful
- ✅ Execution time is within specified budget (if provided)
- ✅ Response size is reasonable (< 1MB)

---

### 6. `expectValidUniversalToolParams(response, expectedParams)`

**Purpose**: Validates that universal tool parameters are correctly accepted and processed.

**Use Cases**:
- Testing parameter validation across universal tools
- Ensuring consistent parameter handling
- Validating resource type support

**Code Example**:
```typescript
const params = {
  resource_type: 'companies',
  limit: 25,
  offset: 50,
  fields: ['name', 'domains']
};

const response = await enhancedToolCaller.callTool('advanced-search', params);

// Validate all parameters were accepted without errors
E2EAssertions.expectValidUniversalToolParams(response, params);
```

**Validated Parameters**:
- `resource_type` - No invalid resource type errors
- `limit` - No limit validation errors  
- `offset` - Offset parameter handled correctly
- `fields` - Field parameter processing

**What it validates**:
- ✅ MCP response is successful
- ✅ No resource type validation errors
- ✅ No parameter validation errors
- ✅ All provided parameters were processed

---

### 7. `expectValidBatchOperation(response, batchSize)`

**Purpose**: Validates batch operations process multiple records correctly.

**Use Cases**:
- Testing `batch-operations` tool
- Validating bulk record processing
- Ensuring reasonable batch size limits

**Code Example**:
```typescript
const batchRecords = [
  { values: { name: [{ value: 'Company 1' }] } },
  { values: { name: [{ value: 'Company 2' }] } },
  { values: { name: [{ value: 'Company 3' }] } }
];

const response = await enhancedToolCaller.callTool('batch-operations', {
  resource_type: 'companies',
  operation_type: 'create',
  records: batchRecords
});

// Validate batch operation was processed correctly
E2EAssertions.expectValidBatchOperation(response, batchRecords.length);
```

**What it validates**:
- ✅ MCP response is successful
- ✅ Response indicates batch processing occurred
- ✅ Batch size is within reasonable limits (< 100 records)

---

## 📋 Usage Patterns

### Basic Usage
```typescript
import { E2EAssertions } from '../utils/assertions.js';

// Basic success validation (used by all enhanced methods)
E2EAssertions.expectMcpSuccess(response);

// Enhanced validation with specific checks
E2EAssertions.expectValidPagination(response, 10);
E2EAssertions.expectFieldFiltering(response, ['name', 'email']);
```

### Fluent Interface
```typescript
import { expectE2E } from '../utils/assertions.js';

// Chainable assertions for readable tests
expectE2E(response).toBeValidMcpResponse();
expectE2E(record).toBeValidAttioRecord('companies');
expectE2E(email).toBeTestEmail();
```

### Combined Validations
```typescript
// Multiple assertions for comprehensive validation
const response = await callUniversalTool('search-records', params);

E2EAssertions.expectMcpSuccess(response);
E2EAssertions.expectValidPagination(response, params.limit);
E2EAssertions.expectOptimalPerformance(response, 1000);
E2EAssertions.expectValidUniversalToolParams(response, params);
```

## 🚀 Best Practices

### 1. **Always Start with Basic Success**
```typescript
// Always validate basic success first
E2EAssertions.expectMcpSuccess(response);
// Then add enhanced validations
E2EAssertions.expectValidPagination(response);
```

### 2. **Use Appropriate Error Types**
```typescript
// Be specific about expected error types
E2EAssertions.expectSpecificError(response, 'validation'); // For invalid params
E2EAssertions.expectSpecificError(response, 'notFound');   // For missing records
```

### 3. **Include Performance Budgets**
```typescript
// Set realistic performance expectations
E2EAssertions.expectOptimalPerformance(response, 1500); // 1.5s for CRUD ops
E2EAssertions.expectOptimalPerformance(response, 1000); // 1s for search ops
```

### 4. **Test Edge Cases**
```typescript
// Test boundary conditions
E2EAssertions.expectValidPagination(response, 100);  // Large limits
E2EAssertions.expectValidPagination(response, 1);    // Small limits
E2EAssertions.expectFieldFiltering(response, []);    // Empty field arrays
```

### 5. **Validate All Resource Types**
```typescript
// Test consistency across resource types
for (const resourceType of ['companies', 'people', 'lists', 'tasks']) {
  const response = await testResourceType(resourceType);
  E2EAssertions.expectValidUniversalToolParams(response, { resource_type: resourceType });
}
```

## 🔧 Performance Expectations

These assertion methods help enforce the performance characteristics documented in the README:

| Operation Type | Budget | Assertion Method |
|---|---|---|
| Search Operations | < 1000ms | `expectOptimalPerformance(response, 1000)` |
| CRUD Operations | < 1500ms | `expectOptimalPerformance(response, 1500)` |
| Batch Operations | < 3000ms | `expectOptimalPerformance(response, 3000)` |
| Field Filtering | < 500ms overhead | `expectFieldFiltering(response, fields)` |
| Pagination | < 200ms overhead | `expectValidPagination(response, limit)` |

## 🐛 Troubleshooting

### Common Issues

**1. Pagination Tests Failing**
```typescript
// Issue: Large offset values causing timeouts
// Solution: Use reasonable test data and smaller offsets
E2EAssertions.expectValidPagination(response, 10); // Instead of 1000
```

**2. Field Filtering Not Working**
```typescript
// Issue: Invalid field names causing validation errors
// Solution: Use valid field names from attribute discovery
const validFields = ['name', 'domains', 'created_at']; // Known valid fields
E2EAssertions.expectFieldFiltering(response, validFields);
```

**3. Tasks Integration Issues**
```typescript
// Issue: Tasks resource type not supported in test environment
// Solution: Check skipTaskTests configuration
if (!config.skipTaskTests) {
  E2EAssertions.expectValidTasksIntegration(response, 'create');
}
```

**4. Performance Budget Failures**
```typescript
// Issue: Network latency causing performance test failures
// Solution: Use more generous budgets for CI/CD environments
const budget = process.env.CI ? 3000 : 1000; // 3s in CI, 1s locally
E2EAssertions.expectOptimalPerformance(response, budget);
```

### Debugging Tips

1. **Check MCP Response Structure**:
```typescript
console.log('Response structure:', JSON.stringify(response, null, 2));
E2EAssertions.expectMcpSuccess(response); // This will show specific error
```

2. **Validate API Response Format**:
```typescript
// Check if response.content exists and has expected structure
expect(response.content?.[0]?.text).toBeDefined();
```

3. **Monitor Performance**:
```typescript
// Add timing information to responses
const start = Date.now();
const response = await callTool('search-records', params);
response._meta = { executionTime: Date.now() - start };
```

## 📚 Related Documentation

- [E2E Test Framework Overview](../testing.md)
- [Universal Tools API Reference](../universal-tools/api-reference.md)
- [E2E Troubleshooting Guide](./e2e-troubleshooting.md)
- [Performance Testing Guide](./performance-testing.md)