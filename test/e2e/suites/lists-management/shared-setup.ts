/**
 * Shared setup and imports for Lists Management E2E Tests
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { E2ETestBase } from '../../setup.js';
import { E2EAssertions } from '../../utils/assertions.js';
import { loadE2EConfig } from '../../utils/config-loader.js';
import {
  CompanyFactory,
  PersonFactory,
  listFixtures,
} from '../../fixtures/index.js';
import type { TestDataObject, McpToolResponse } from '../../types/index.js';

// Import enhanced tool caller with logging and migration
import {
  callListTool,
  callUniversalTool,
  validateTestEnvironment,
  getToolMigrationStats,
} from '../../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../../utils/logger.js';

// Shared test data storage
export const testCompanies: TestDataObject[] = [];
export const testPeople: TestDataObject[] = [];
export const testLists: TestDataObject[] = [];

// Shared setup utilities
export function createSharedSetup() {
  return {
    beforeAll: async () => {
      // Start comprehensive logging for this test suite
      startTestSuite('lists-management');

      // Validate test environment and tool migration setup
      const envValidation = await validateTestEnvironment();
      if (!envValidation.valid) {
        console.warn('⚠️ Test environment warnings:', envValidation.warnings);
      }

      console.error('📊 Tool migration stats:', getToolMigrationStats());

      await E2ETestBase.setup({
        requiresRealApi: false,
        cleanupAfterTests: true,
        timeout: 120000,
      });

      console.error(
        '🚀 Starting Lists Management E2E Tests with Universal Tools'
      );
    },
    afterAll: async () => {
      // Cleanup is handled automatically by E2ETestBase.setup()

      // End comprehensive logging for this test suite
      endTestSuite();

      console.error(
        '✅ Lists Management E2E Tests completed with enhanced logging'
      );
    },
    beforeEach: () => {
      vi.clearAllMocks();
    },
  };
}

// Export shared utilities
export {
  callListTool,
  callUniversalTool,
  E2EAssertions,
  listFixtures,
};