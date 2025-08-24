/**
 * Error Handling E2E Test Suite
 *
 * Comprehensive testing of error scenarios across all MCP tools including:
 * - Cross-tool error handling scenarios
 * - API timeout and rate limiting tests
 * - Data validation error scenarios
 * - Authentication and authorization error tests
 * - Invalid parameter handling
 * - Resource not found scenarios
 * - Malformed request handling
 *
 * This suite ensures robust error handling and graceful degradation
 * across the entire MCP tool ecosystem.
 */

// Environment variables are loaded via setupFiles in vitest.config.e2e.ts

import { describe, beforeAll, afterAll } from 'vitest';
import { loadE2EConfig } from '../utils/config-loader.js';
import {
  callUniversalTool,
  validateTestEnvironment,
} from '../utils/enhanced-tool-caller.js';
import { type McpToolResponse } from '../utils/assertions.js';
import { testDataGenerator } from '../fixtures/index.js';
import {
  extractRecordId,
  hasValidContent,
  cleanupTestRecords,
  createTestRecord,
} from '../utils/error-handling-utils.js';

// Import modularized test suites
import { validationErrorsTests } from './error-handling/validation-errors.test.js';
import { resourceNotFoundTests } from './error-handling/resource-not-found.test.js';
import { crossToolErrorsTests } from './error-handling/cross-tool-errors.test.js';
import { performanceErrorsTests } from './error-handling/performance-errors.test.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Error Handling E2E Tests', () => {
  let config: any;
  let testCompanyId: string | undefined;
  let testPersonId: string | undefined;
  let testListId: string | undefined;
  let testTaskId: string | undefined;

  beforeAll(async () => {
    config = loadE2EConfig();
    console.error(
      '🔧 Error Handling E2E Suite - Setting up test environment...'
    );

    // Validate test environment is ready
    const validation = await validateTestEnvironment();
    if (!validation.valid) {
      console.warn('⚠️  Test environment warnings:', validation.warnings);
    }

    // Create minimal test data for error scenarios
    try {
      console.error('📝 Creating test data for error scenarios...');

      // Create test company for error scenarios
      const companyData = testDataGenerator.companies.basicCompany();
      testCompanyId = await createTestRecord(
        (resourceType, data) =>
          callUniversalTool('create-record', {
            resource_type: resourceType as any,
            record_data: data,
          }),
        'companies',
        companyData
      );

      if (testCompanyId) {
        console.error(`✅ Created test company: ${testCompanyId}`);
      } else {
        console.warn('⚠️  Could not create test company for error tests');
      }

      // Create test person for error scenarios
      const personData = testDataGenerator.people.basicPerson();
      testPersonId = await createTestRecord(
        (resourceType, data) =>
          callUniversalTool('create-record', {
            resource_type: resourceType as any,
            record_data: data,
          }),
        'people',
        personData
      );

      if (testPersonId) {
        console.error(`✅ Created test person: ${testPersonId}`);
      }
    } catch (error: unknown) {
      console.warn('⚠️  Test data setup had issues:', error);
    }

    console.error('✅ Error handling test environment ready');
  });

  afterAll(async () => {
    console.error('🧹 Cleaning up error handling test data...');

    // Clean up test data (best effort - errors expected in error handling tests)
    const recordsToCleanup: Array<{ resourceType: string; recordId: string }> =
      [];

    if (testCompanyId) {
      recordsToCleanup.push({
        resourceType: 'companies',
        recordId: testCompanyId,
      });
    }

    if (testPersonId) {
      recordsToCleanup.push({ resourceType: 'people', recordId: testPersonId });
    }

    if (testTaskId) {
      recordsToCleanup.push({ resourceType: 'tasks', recordId: testTaskId });
    }

    await cleanupTestRecords(
      (resourceType, recordId) =>
        callUniversalTool('delete-record', {
          resource_type: resourceType as any,
          record_id: recordId,
        }),
      recordsToCleanup
    );

    console.error('✅ Error handling cleanup completed');
  });

  // Import and run modularized test suites
  validationErrorsTests(testCompanyId);
  resourceNotFoundTests();
  crossToolErrorsTests(testCompanyId, testPersonId);
  performanceErrorsTests();
});
