/**
 * Universal Tool Test Helpers - Main Export Index
 * 
 * This file provides a centralized export point for all universal tool test helpers,
 * making it easy for test files to import exactly what they need.
 * 
 * Usage Examples:
 * 
 * // For unit tests with mocks
 * import { setupUnitTestMocks, MockRecordFactory, assertionHelpers } from './helpers';
 * 
 * // For integration tests
 * import { IntegrationTestSetup, IntegrationTestDataManager } from './helpers';
 * 
 * // For performance tests
 * import { PerformanceTestRunner, PERFORMANCE_BUDGETS } from './helpers';
 * 
 * // For mixed usage
 * import { 
 *   MockParamsFactory, 
 *   testDataHelpers, 
 *   integrationConfig 
 * } from './helpers';
 */

// Test Constants and Configuration
export {
  TEST_ENVIRONMENT,
  TEST_TIMEOUTS,
  PERFORMANCE_BUDGETS,
  BATCH_LIMITS,
  CLEANUP_DELAYS,
  RESOURCE_TYPES,
  DETAILED_INFO_TYPES,
  RELATIONSHIP_TYPES,
  CONTENT_SEARCH_TYPES,
  TIMEFRAME_TYPES,
  BATCH_OPERATION_TYPES,
  MOCK_SCHEMAS,
  DATE_PATTERNS,
  ERROR_MESSAGES,
  TEST_LOGGING,
  TEST_DATA_PATTERNS,
} from './test-constants.js';

// Mock Data Factories
export {
  type MockRecord,
  type MockError,
  MockRecordFactory,
  MockParamsFactory,
  MockResponseFactory,
  MockErrorFactory,
  IntegrationDataFactory,
} from './mock-data.js';

// Mock Setup and Configuration
export {
  mockSharedHandlers,
  mockErrorService,
  mockSchemasAndValidation,
  mockSpecializedHandlers,
  mockDateUtils,
  setupMockHandlers,
  setupMockErrorService,
  cleanupMocks,
  setupUnitTestMocks,
  setupErrorTestMocks,
  setupMocksWithConfig,
  getMockInstances,
  type MockSetupConfig,
} from './mock-setup.js';

// Test Helper Utilities
export {
  assertionHelpers,
  performanceHelpers,
  testDataHelpers,
  errorTestHelpers,
  mockVerificationHelpers,
  integrationHelpers,
} from './test-helpers.js';

// Integration and Performance Test Helpers
export {
  IntegrationTestSetup,
  IntegrationTestDataManager,
  PerformanceTestRunner,
  integrationConfig,
  integrationUtils,
} from './integration-helpers.js';

/**
 * Convenience exports for common patterns
 */

// Most commonly used mock setup for unit tests
export const setupCommonMocks = () => {
  return setupUnitTestMocks();
};

// Most commonly used assertion helpers
export const commonAssertions = {
  // Will be populated when needed
};

// Most commonly used test data factories  
export const commonFactories = {
  // Will be populated when needed
};

// Environment detection utilities
export const testEnvironment = {
  isCI: process.env.CI === 'true',
  shouldSkipIntegration: process.env.SKIP_INTEGRATION_TESTS === 'true', 
  shouldSkipPerformance: process.env.SKIP_PERFORMANCE_TESTS === 'true',
  multiplier: process.env.CI === 'true' ? 2.5 : 1,
};

/**
 * Helper function to determine which helpers to use based on test type
 */
export const getHelpersForTestType = (testType: 'unit' | 'integration' | 'performance') => {
  switch (testType) {
    case 'unit':
      return {
        mockSetup: setupUnitTestMocks,
        dataFactories: MockRecordFactory,
        assertions: assertionHelpers,
        cleanup: cleanupMocks,
      };
      
    case 'integration':
      return {
        setup: IntegrationTestSetup.getInstance(),
        dataManager: IntegrationTestDataManager,
        config: integrationConfig,
        utils: integrationUtils,
        assertions: assertionHelpers,
      };
      
    case 'performance':
      return {
        runner: PerformanceTestRunner,
        budgets: PERFORMANCE_BUDGETS,
        config: integrationConfig,
        utils: integrationUtils,
        dataFactory: IntegrationDataFactory,
      };
      
    default:
      throw new Error(`Unknown test type: ${testType}`);
  }
};