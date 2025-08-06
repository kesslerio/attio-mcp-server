/**
 * Integration Test Setup Helper
 *
 * Provides robust environment setup and validation for integration tests
 * that require real API access with proper error handling and cleanup.
 */

import { afterAll, beforeAll, vi } from 'vitest';
import { initializeAttioClient } from '../../src/api/attio-client.js';

/**
 * Configuration for integration test setup
 */
export interface IntegrationTestConfig {
  /** Whether to skip tests if no API key is found */
  skipOnMissingApiKey?: boolean;
  /** Test timeout in milliseconds */
  timeout?: number;
  /** Whether to enable verbose logging */
  verbose?: boolean;
  /** Whether to require test configuration from .env.test */
  requireTestConfig?: boolean;
}

/**
 * Test configuration loaded from environment
 */
export interface TestConfiguration {
  /** Test company ID */
  companyId?: string;
  /** Test person ID */
  personId?: string;
  /** Test list ID */
  listId?: string;
  /** Empty test list ID */
  emptyListId?: string;
  /** Test deal ID */
  dealId?: string;
  /** Test task ID */
  taskId?: string;
  /** Test note ID */
  noteId?: string;
  /** Test data values */
  testCompanyName?: string;
  testPersonEmail?: string;
  testPersonFirstName?: string;
  testPersonLastName?: string;
  testDomain?: string;
  /** Test behavior settings */
  skipIncompleteTests?: boolean;
  cleanupTestData?: boolean;
  testDataPrefix?: string;
}

/**
 * Results from integration test setup
 */
export interface IntegrationTestSetup {
  /** Whether tests should be skipped */
  shouldSkip: boolean;
  /** Reason for skipping (if applicable) */
  skipReason?: string;
  /** Generated timestamp for unique test data */
  timestamp: number;
  /** Cleanup function to call after tests */
  cleanup: () => Promise<void>;
  /** Test configuration loaded from environment */
  testConfig?: TestConfiguration;
}

/**
 * Test data cleanup tracker
 */
class TestDataTracker {
  private createdRecords: Array<{
    type: 'company' | 'person' | 'record' | 'task';
    id: string;
  }> = [];

  track(type: 'company' | 'person' | 'record' | 'task', id: string) {
    this.createdRecords.push({ type, id });
  }

  async cleanup() {
    // Import cleanup functions dynamically to avoid circular dependencies
    const { deleteCompany } = await import(
      '../../src/objects/companies/index.js'
    );
    const { deletePerson } = await import('../../src/objects/people/index.js');

    for (const record of this.createdRecords.reverse()) {
      try {
        switch (record.type) {
          case 'company':
            await deleteCompany(record.id);
            break;
          case 'person':
            await deletePerson(record.id);
            break;
          // Add other record types as needed
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${record.type} ${record.id}:`, error);
      }
    }
    this.createdRecords = [];
  }
}

const testDataTracker = new TestDataTracker();

/**
 * Load test configuration from environment
 */
function loadTestConfiguration(): TestConfiguration {
  return {
    companyId: process.env.TEST_COMPANY_ID,
    personId: process.env.TEST_PERSON_ID,
    listId: process.env.TEST_LIST_ID,
    emptyListId: process.env.TEST_EMPTY_LIST_ID,
    dealId: process.env.TEST_DEAL_ID,
    taskId: process.env.TEST_TASK_ID,
    noteId: process.env.TEST_NOTE_ID,
    testCompanyName:
      process.env.TEST_COMPANY_NAME || 'Integration Test Company',
    testPersonEmail:
      process.env.TEST_PERSON_EMAIL || 'integration-test@example.com',
    testPersonFirstName: process.env.TEST_PERSON_FIRST_NAME || 'Integration',
    testPersonLastName: process.env.TEST_PERSON_LAST_NAME || 'Test',
    testDomain: process.env.TEST_DOMAIN || 'integration-test.com',
    skipIncompleteTests: process.env.SKIP_INCOMPLETE_TESTS === 'true',
    cleanupTestData: process.env.CLEANUP_TEST_DATA !== 'false', // Default true
    testDataPrefix: process.env.TEST_DATA_PREFIX || 'E2E_TEST_',
  };
}

/**
 * Setup integration tests with proper environment validation and cleanup
 */
export function setupIntegrationTests(
  config: IntegrationTestConfig = {}
): IntegrationTestSetup {
  const {
    skipOnMissingApiKey = true,
    timeout = 30000,
    verbose = false,
    requireTestConfig = false,
  } = config;

  // Check for API key
  const apiKey = process.env.ATTIO_API_KEY;

  if (!apiKey && skipOnMissingApiKey) {
    return {
      shouldSkip: true,
      skipReason: 'No ATTIO_API_KEY found in environment variables',
      timestamp: Date.now(),
      cleanup: async () => {},
    };
  }

  if (!apiKey) {
    throw new Error(
      'ATTIO_API_KEY environment variable is required for integration tests'
    );
  }

  // Validate API key format
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return {
      shouldSkip: true,
      skipReason: 'Invalid ATTIO_API_KEY format',
      timestamp: Date.now(),
      cleanup: async () => {},
    };
  }

  // Load test configuration
  const testConfig = loadTestConfiguration();

  // Check if required test configuration is present
  if (
    requireTestConfig &&
    (!testConfig.companyId || !testConfig.personId || !testConfig.listId)
  ) {
    return {
      shouldSkip: true,
      skipReason:
        'Required test configuration missing. Please run: npm run setup:test-data',
      timestamp: Date.now(),
      cleanup: async () => {},
      testConfig,
    };
  }

  const timestamp = Date.now();

  // Setup test configuration
  beforeAll(() => {
    if (verbose) {
      console.log('🔧 Setting up integration tests...');
      console.log(`⏰ Test timestamp: ${timestamp}`);
    }

    // Configure test timeout
    vi.setConfig({ testTimeout: timeout });

    // Initialize API client
    try {
      initializeAttioClient(apiKey);
      if (verbose) {
        console.log('✅ API client initialized successfully');
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize API client: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  // Setup cleanup
  afterAll(async () => {
    if (verbose) {
      console.log('🧹 Cleaning up test data...');
    }
    try {
      await testDataTracker.cleanup();
      if (verbose) {
        console.log('✅ Test cleanup completed');
      }
    } catch (error) {
      console.error('❌ Test cleanup failed:', error);
    }
  });

  return {
    shouldSkip: false,
    timestamp,
    cleanup: () => testDataTracker.cleanup(),
    testConfig,
  };
}

/**
 * Track a created record for automatic cleanup
 */
export function trackTestRecord(
  type: 'company' | 'person' | 'record' | 'task',
  id: string
) {
  testDataTracker.track(type, id);
}

/**
 * Generate unique test data with timestamp
 */
export function generateTestData(timestamp: number) {
  return {
    companyName: `Test Company ${timestamp}`,
    personName: `Test Person ${timestamp}`,
    personEmail: `test${timestamp}@example.com`,
    websiteUrl: `https://test${timestamp}.com`,
    description: `Integration test data created at ${new Date(timestamp).toISOString()}`,
  };
}

/**
 * Enhanced error handling for integration tests
 */
export function expectIntegrationError(
  error: any,
  expectedPatterns: string[] = []
) {
  // Check if it's our enhanced UniversalValidationError
  if (error?.name === 'UniversalValidationError') {
    console.log('✅ Enhanced validation error caught:', {
      type: error.errorType,
      message: error.message,
      suggestion: error.suggestion,
      field: error.field,
    });
    return true;
  }

  // Check for expected error patterns
  const errorMessage = error?.message || String(error);
  for (const pattern of expectedPatterns) {
    if (errorMessage.includes(pattern)) {
      console.log(`✅ Expected error pattern found: ${pattern}`);
      return true;
    }
  }

  console.log('❌ Unexpected error format:', error);
  return false;
}

/**
 * Wait for API indexing (some operations need time to be searchable)
 */
export async function waitForApiIndexing(milliseconds: number = 2000) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
