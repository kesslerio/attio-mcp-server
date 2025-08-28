# Universal Tool Test Helpers

This directory contains centralized helpers and utilities extracted from the oversized universal tool test files. It provides a clean, reusable infrastructure for testing universal tools while maintaining strict separation from production code.

## 📁 Structure

```
helpers/
├── index.ts                 # Main export point for all helpers
├── test-constants.ts        # Shared constants, budgets, and configuration
├── mock-data.ts            # Mock data factories following mock factory pattern
├── mock-setup.ts           # Standardized mock configurations
├── test-helpers.ts         # Reusable utilities and assertion helpers
├── integration-helpers.ts  # Real API test patterns and utilities
└── README.md              # This documentation
```

## 🎯 Usage Patterns

### Unit Tests (Mocked)
```typescript
import { 
  setupUnitTestMocks, 
  MockRecordFactory, 
  assertionHelpers,
  cleanupMocks 
} from './helpers';

describe('My Universal Tool Tests', () => {
  // Setup mocks before tests
  setupUnitTestMocks();
  
  beforeEach(async () => {
    await setupMockHandlers();
  });
  
  afterEach(() => {
    cleanupMocks();
  });
  
  it('should test something', async () => {
    const mockData = MockRecordFactory.createCompany();
    // ... test logic
    assertionHelpers.assertValidCompanyRecord(result);
  });
});
```

### Integration Tests (Real API)
```typescript
import { 
  IntegrationTestSetup, 
  IntegrationTestDataManager,
  integrationConfig 
} from './helpers';

describe('Integration Tests', () => {
  if (integrationConfig.shouldRun()) {
    const setup = IntegrationTestSetup.getInstance();
    const dataManager = new IntegrationTestDataManager();
    
    beforeAll(async () => {
      await setup.initializeApiClient();
    });
    
    afterAll(async () => {
      await dataManager.cleanupTrackedRecords(toolConfigs);
    });
  }
});
```

### Performance Tests
```typescript
import { 
  PerformanceTestRunner,
  PERFORMANCE_BUDGETS,
  integrationUtils 
} from './helpers';

describe('Performance Tests', () => {
  const runner = new PerformanceTestRunner();
  
  it('should complete within budget', async () => {
    await runner.runPerformanceTest(
      'batch create operation',
      async () => {
        return await batchCreateHandler(params);
      },
      'tenRecords'
    );
  });
});
```

## 🏗️ Architecture Principles

### Mock Factory Pattern Compliance
- **✅ Test Data Isolation**: All mock data is in `/test/` directory
- **✅ Production Code Separation**: No production imports in test helpers
- **✅ Consistent Interfaces**: All factories follow same patterns
- **✅ Type Safety**: Full TypeScript support with proper interfaces

### Clean Architecture
- **Dependency Direction**: Test helpers only depend on test utilities
- **Interface Segregation**: Separate helpers for different test types
- **Single Responsibility**: Each helper file has a focused purpose
- **Open/Closed**: Easy to extend without modifying existing code

### Performance Optimization
- **CI/Local Awareness**: Automatic timeout multipliers for different environments
- **Batch Operations**: Efficient cleanup and data management
- **Resource Management**: Proper tracking and cleanup of test resources

## 📊 Features Extracted

### From `advanced-operations.test.ts` (1065 lines)
- ✅ Mock setup patterns for specialized handlers
- ✅ Advanced search parameter factories
- ✅ Date validation mock utilities
- ✅ Complex beforeEach/afterEach patterns

### From `core-operations.test.ts` (935 lines)
- ✅ ErrorService mock configurations
- ✅ Core operation parameter factories
- ✅ Standard assertion patterns
- ✅ Universal resource type handling

### From `integration.test.ts` (865 lines)
- ✅ Real API client initialization
- ✅ Test data creation and tracking
- ✅ Integration cleanup patterns
- ✅ Environment-specific configuration

### From `performance.test.ts` (753 lines)
- ✅ Performance budget management
- ✅ CI multiplier calculations
- ✅ Batch operation utilities
- ✅ Performance measurement tools

## 🔧 Customization

### Adding New Mock Types
```typescript
// In mock-data.ts
export const MockRecordFactory = {
  // ... existing factories
  
  createCustomRecord: (overrides = {}) => {
    // Your custom mock logic
  }
};
```

### Adding New Assertions
```typescript
// In test-helpers.ts
export const assertionHelpers = {
  // ... existing assertions
  
  assertValidCustomRecord: (record, expectedField) => {
    // Your custom assertion logic
  }
};
```

### Environment-Specific Configuration
```typescript
// In test-constants.ts
export const CUSTOM_BUDGETS = {
  myOperation: Math.round(5000 * TEST_ENVIRONMENT.ciMultiplier),
};
```

## 🧪 Testing the Helpers

The helpers themselves follow the same patterns they provide:
- Unit tested with mocks where appropriate
- Integration tested with real dependencies
- Performance characteristics verified
- Clean architecture principles enforced

## 🚀 Next Steps for Split Test Files

When splitting the original oversized test files, use these helpers like this:

```typescript
// advanced-operations-search.test.ts
import { setupUnitTestMocks, MockParamsFactory, assertionHelpers } from './helpers';

// integration-core-operations.test.ts  
import { IntegrationTestSetup, IntegrationTestDataManager } from './helpers';

// performance-batch-operations.test.ts
import { PerformanceTestRunner, PERFORMANCE_BUDGETS } from './helpers';
```

This provides a consistent, maintainable foundation for all universal tool tests while eliminating code duplication and ensuring proper separation of concerns.