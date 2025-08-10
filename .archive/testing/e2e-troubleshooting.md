# E2E Test Troubleshooting Guide

This guide helps resolve common issues encountered when running E2E tests for the Attio MCP Server. Based on real troubleshooting scenarios from Issue #403 resolution.

## 🚨 Quick Diagnosis

### Is Your E2E Setup Working?

Run this quick diagnostic to identify your issue:

```bash
# 1. Check if build works
npm run build

# 2. Check if API key is set up
cat .env | grep ATTIO_API_KEY

# 3. Run a single E2E test
npm test -- test/e2e/suites/universal-tools.e2e.test.ts -t "should search companies successfully"

# 4. Check test results pattern
# ✅ GOOD: "✓ test passed" or "✗ test failed"  
# ❌ BAD: "⏭ test skipped" or "test suite failed to load"
```

---

## 🔧 Common Issues & Solutions

### 1. **Tests Showing as Skipped (97% skip rate)**

**Symptoms**:
```
Test Files  1 passed (1)
Tests  3 passed | 97 skipped (100)
```

**Root Causes**:
- Missing `.env` file
- Import errors in test files
- Module evaluation failures

**Solutions**:

#### A) Missing .env File
```bash
# Create .env file in project root
echo "ATTIO_API_KEY=your_64_character_api_key_here" > .env
echo "PORT=3000" >> .env
echo "LOG_LEVEL=debug" >> .env
echo "NODE_ENV=development" >> .env

# Verify API key length
ATTIO_API_KEY=$(grep ATTIO_API_KEY .env | cut -d'=' -f2)
echo "API key length: ${#ATTIO_API_KEY} (should be 64)"
```

#### B) Import Errors in Test Files
```bash
# Check for these specific import errors
grep -r "enhanced-tool-caller" test/e2e/suites/

# If found, fix imports to use correct paths:
# ❌ Wrong: from '../utils/enhanced-tool-caller.js'
# ✅ Right: from '../utils/logger.js' (for startTestSuite/endTestSuite)
```

#### C) Module Evaluation Failures
```bash
# Run specific test file to see exact error
npm test -- test/e2e/suites/universal-tools.e2e.test.ts --reporter=verbose

# Look for import/module errors in output
# Fix any missing imports or circular dependencies
```

---

### 2. **Tests Failing with "Response has error flag"**

**Symptoms**:
```
✗ should handle pagination with offset for search-records
  → Expected MCP tool response to be successful - Response has error flag: expected undefined to be false
```

**Root Causes**:
- MCP response format inconsistency
- API errors not properly handled
- Missing `isError: false` in successful responses

**Solutions**:

#### A) Check MCP Response Format
```typescript
// Debug the actual response structure
console.log('Response structure:', JSON.stringify(response, null, 2));

// Look for:
// ✅ Expected: { isError: false, content: [...] }
// ❌ Problem: { isError: undefined, content: [...] }
```

#### B) Verify Dispatcher Response Format
```typescript
// Check src/handlers/tools/dispatcher/core.ts
// Ensure successful responses include isError: false
return {
  content: [{ type: 'text', text: formattedResult }],
  isError: false  // ← This must be present
};
```

#### C) API Authentication Issues
```bash
# Test API key manually
curl -H "Authorization: Bearer $ATTIO_API_KEY" \
  "https://api.attio.com/v2/objects/companies/attributes"

# Should return 200, not 401/403
```

---

### 3. **API Schema Mismatches**

**Symptoms**:
```
Error: Cannot find attribute with slug/ID "note"
Error: Bad Request: Field validation failed
```

**Root Causes**:
- Test data doesn't match API workspace schema
- Using non-existent field names
- Workspace-specific attribute differences

**Solutions**:

#### A) Discover Available Attributes
```bash
# Use CLI to discover actual workspace attributes
npx attio-mcp discover-attributes companies
npx attio-mcp discover-attributes people

# Or use API directly
curl -H "Authorization: Bearer $ATTIO_API_KEY" \
  "https://api.attio.com/v2/objects/companies/attributes"
```

#### B) Fix Test Data Field Names
```typescript
// ❌ Wrong: Using non-existent field names
record_data: {
  values: {
    note: [{ value: "Test note" }]  // "note" might not exist
  }
}

// ✅ Right: Use actual field names from your workspace
record_data: {
  values: {
    description: [{ value: "Test description" }]  // Use actual field
  }
}
```

#### C) Handle Field Mapping Issues
```typescript
// Check attribute mapping in field mapper
// See src/handlers/tool-configs/universal/field-mapper.ts
// Ensure mappings match your workspace schema
```

---

### 4. **Performance Budget Failures**

**Symptoms**:
```
🔴 PERFORMANCE CRITICAL: get-record-details exceeded budget by 195.3%
Error: Execution time 8858ms should be under 3000ms
```

**Root Causes**:
- Network latency in test environment
- Large result sets causing slow responses
- Inefficient API queries

**Solutions**:

#### A) Adjust Performance Budgets
```typescript
// Use different budgets for different environments
const performanceBudget = {
  local: 1000,      // Fast local development
  ci: 3000,         // Slower CI environment  
  staging: 2000     // Moderate staging environment
};

const budget = performanceBudget[process.env.NODE_ENV] || 1000;
E2EAssertions.expectOptimalPerformance(response, budget);
```

#### B) Optimize Test Queries
```typescript
// ❌ Inefficient: Large queries without limits
const response = await callTool('search-records', {
  resource_type: 'companies',
  query: 'test'  // Could return thousands of results
});

// ✅ Efficient: Use limits and specific queries
const response = await callTool('search-records', {
  resource_type: 'companies',
  query: 'E2E_TEST_COMPANY',  // Specific test data
  limit: 10                   // Reasonable limit
});
```

#### C) Monitor API Response Times
```typescript
// Add timing to requests
const start = Date.now();
const response = await callTool('search-records', params);
const executionTime = Date.now() - start;

console.log(`${params.resource_type} search took ${executionTime}ms`);
response._meta = { executionTime };
```

---

### 5. **Field Filtering Not Working**

**Symptoms**:
```
✗ should filter fields in get-record-details
  → Field filtering validation failed
```

**Root Causes**:
- Invalid field names in filter
- API doesn't support field filtering for resource type
- Response format doesn't match expectations

**Solutions**:

#### A) Validate Field Names
```bash
# Get valid field names for resource type
curl -H "Authorization: Bearer $ATTIO_API_KEY" \
  "https://api.attio.com/v2/objects/companies/attributes" | \
  jq '.data[].slug'

# Use only valid field slugs in tests
```

#### B) Check API Support
```typescript
// Some resource types may not support field filtering
// Check API documentation or test manually
const response = await callTool('get-record-details', {
  resource_type: 'companies',  // ✅ Usually supports fields
  record_id: testRecordId,
  fields: ['name', 'domains']
});

// vs

const response = await callTool('get-record-details', {
  resource_type: 'tasks',      // ❓ May not support fields
  record_id: testTaskId,
  fields: ['title']
});
```

#### C) Update Test Expectations
```typescript
// Be flexible with field filtering validation
E2EAssertions.expectFieldFiltering(response, ['name', 'domains']);

// Or check if field filtering is supported before testing
if (supportsFieldFiltering(resourceType)) {
  E2EAssertions.expectFieldFiltering(response, requestedFields);
}
```

---

### 6. **Tasks Integration Failures**

**Symptoms**:
```
✗ should handle tasks resource type in search-records
  → Tasks integration validation failed
```

**Root Causes**:
- Tasks not enabled in workspace
- Different task schema than expected
- API limitations for tasks endpoint

**Solutions**:

#### A) Check Tasks Support
```bash
# Test if tasks endpoint exists
curl -H "Authorization: Bearer $ATTIO_API_KEY" \
  "https://api.attio.com/v2/objects/tasks/attributes"

# If 404, tasks not available in workspace
```

#### B) Use Conditional Testing
```typescript
// Skip tasks tests if not supported
const config = configLoader.getConfig();
if (config.skipTaskTests) {
  test.skip('should handle tasks resource type', () => {});
  return;
}

// Or use environment variable
if (process.env.SKIP_TASKS_TESTS === 'true') {
  test.skip('Tasks not supported in this workspace');
}
```

#### C) Handle Tasks Gracefully
```typescript
// Expect different response format for tasks
try {
  E2EAssertions.expectValidTasksIntegration(response, 'search');
} catch (error) {
  if (error.message.includes('tasks not supported')) {
    test.skip('Tasks not available in workspace');
  }
  throw error;
}
```

---

### 7. **Mock Interference Issues**

**Symptoms**:
```
✗ should search companies by notes content
  → Mock function called instead of real API
```

**Root Causes**:
- Unit test mocks persisting into E2E tests
- Vitest mock cache not cleared between test runs
- Test isolation problems

**Solutions**:

#### A) Clear Mocks in E2E Tests
```typescript
import { vi } from 'vitest';

beforeEach(() => {
  // Clear all mocks before each E2E test
  vi.clearAllMocks();
  vi.unmock('../../utils/enhanced-tool-caller');
  vi.unmock('../../api/attio-client');
});
```

#### B) Use Separate Test Configs
```typescript
// vitest.config.e2e.ts should have different mock settings than unit tests
export default defineConfig({
  test: {
    clearMocks: true,      // Clear mocks between tests
    restoreMocks: true,    // Restore original implementations
    mockReset: true        // Reset mock state
  }
});
```

#### C) Verify Real API Calls
```typescript
// Add logging to verify real API calls are happening
console.log('Making real API call to:', endpoint);
const response = await realApiCall(endpoint);
console.log('Real API response received:', response.status);
```

---

## 🎯 Advanced Diagnostics

### Environment Validation Script

Create this diagnostic script to check your E2E setup:

```bash
#!/bin/bash
# save as scripts/diagnose-e2e.sh

echo "🔍 E2E Test Environment Diagnostic"
echo "=================================="

# Check Node.js version
echo "Node.js version: $(node --version)"

# Check if .env exists and has API key
if [ -f .env ]; then
  if grep -q "ATTIO_API_KEY" .env; then
    API_KEY=$(grep ATTIO_API_KEY .env | cut -d'=' -f2)
    echo "✅ .env file exists with API key (length: ${#API_KEY})"
  else
    echo "❌ .env file exists but no ATTIO_API_KEY found"
    exit 1
  fi
else
  echo "❌ .env file missing"
  exit 1
fi

# Test API connectivity
echo "🌐 Testing API connectivity..."
HTTP_CODE=$(curl -w "%{http_code}" -s -o /dev/null \
  -H "Authorization: Bearer $API_KEY" \
  "https://api.attio.com/v2/objects/companies/attributes")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API key is valid and working"
else
  echo "❌ API key validation failed (HTTP $HTTP_CODE)"
  exit 1
fi

# Check test file imports
echo "🔍 Checking test file imports..."
IMPORT_ERRORS=$(grep -r "enhanced-tool-caller" test/e2e/suites/ | wc -l)
if [ "$IMPORT_ERRORS" -gt 0 ]; then
  echo "⚠️  Found $IMPORT_ERRORS import errors in test files"
  grep -r "enhanced-tool-caller" test/e2e/suites/
else
  echo "✅ No import errors found"
fi

# Test single E2E test
echo "🧪 Running single E2E test..."
if npm test -- test/e2e/suites/universal-tools.e2e.test.ts -t "should search companies successfully" --reporter=silent > /dev/null 2>&1; then
  echo "✅ Basic E2E test passes"
else
  echo "❌ Basic E2E test fails - check logs above"
fi

echo "✅ Diagnostic complete!"
```

### Test Result Patterns

Learn to recognize these patterns in test output:

```bash
# ✅ GOOD - Tests are running and passing/failing
Test Files  1 passed (1)
Tests  46 passed | 5 failed (51)

# ❌ BAD - Tests are being skipped (infrastructure problem)  
Test Files  1 passed (1)
Tests  3 passed | 97 skipped (100)

# ❌ BAD - Test suite failed to load (import/syntax errors)
Test Files  1 failed (1)  
Tests  0 passed (0)
```

### Performance Monitoring

Add performance monitoring to your tests:

```typescript
// Create a performance monitor helper
export class E2EPerformanceMonitor {
  private static measurements: Array<{
    test: string;
    operation: string;
    duration: number;
    timestamp: Date;
  }> = [];

  static startMeasurement(testName: string, operation: string) {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        this.measurements.push({
          test: testName,
          operation,
          duration,
          timestamp: new Date()
        });
        return duration;
      }
    };
  }

  static generateReport() {
    const report = this.measurements
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    console.log('🐌 Slowest Operations:');
    report.forEach(({ test, operation, duration }) => {
      console.log(`  ${duration}ms - ${test} > ${operation}`);
    });
  }
}

// Use in tests
const measurement = E2EPerformanceMonitor.startMeasurement(
  'universal-tools', 
  'search-companies'
);

const response = await callTool('search-records', params);
const duration = measurement.end();

E2EAssertions.expectOptimalPerformance(response, 1000);
```

---

## 📞 Getting Help

### 1. **Collect Diagnostic Information**
```bash
# Run diagnostics
./scripts/diagnose-e2e.sh > e2e-diagnostic.log 2>&1

# Include in issue report:
# - Node.js version
# - npm/package versions  
# - API key status (don't include actual key!)
# - Test output with --verbose flag
```

### 2. **Common Support Scenarios**

**"All tests are skipping"** → Check `.env` file and imports
**"Tests failing with API errors"** → Validate API key and workspace access
**"Performance tests failing"** → Adjust budgets for your environment
**"Field filtering not working"** → Check field names against workspace schema

### 3. **Useful Debug Commands**
```bash
# Detailed test output
npm test -- test/e2e/suites/universal-tools.e2e.test.ts --reporter=verbose

# Single test with full debugging  
npm test -- test/e2e/suites/universal-tools.e2e.test.ts -t "specific test name" --reporter=verbose

# Check API connectivity
curl -v -H "Authorization: Bearer $ATTIO_API_KEY" https://api.attio.com/v2/objects/companies/attributes
```

---

## 📚 Related Documentation

- [E2E Assertion Methods Guide](./e2e-assertion-methods.md)
- [Performance Testing Guide](./performance-testing.md)
- [Universal Tools API Reference](../universal-tools/api-reference.md)
- [Testing Guide](../testing.md)