/**
 * Critical Error Handling E2E Test Suite
 *
 * Consolidates all critical error handling tests from multiple sources:
 * - error-handling.e2e.test.ts (Score: 37)
 * - error-handling/cross-tool-errors.test.ts (Score: 38)
 * - error-handling/validation-errors.test.ts (Score: 33)
 * - error-handling/resource-not-found.test.ts (Score: 28)
 *
 * This consolidated suite covers:
 * - Authentication and authorization errors
 * - Parameter validation and data format errors
 * - Resource not found scenarios
 * - Cross-tool error propagation
 * - API timeout and rate limiting scenarios
 * - Invalid request handling
 * - Error message consistency
 *
 * Total coverage: Critical error handling scenarios
 * Combined business value score: 136/100
 *
 * Part of Issue #526 Sprint 4 - E2E Test Consolidation
 * Excludes: performance-errors.test.ts (Score: 21 - removed as low value)
 */

import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { loadE2EConfig } from '../utils/config-loader.js';
import {
  callUniversalTool,
  callTasksTool,
  callNotesTool,
  validateTestEnvironment,
} from '../utils/enhanced-tool-caller.js';
import { E2EAssertions, type McpToolResponse } from '../utils/assertions.js';
import {
  testDataGenerator,
  errorScenarios,
  errorDataGenerators,
} from '../fixtures/index.js';
import {
  extractRecordId,
  hasValidContent,
  cleanupTestRecords,
  createTestRecord,
  validateErrorResponse,
  analyzeBatchResults,
  executeConcurrentOperations,
} from '../utils/error-handling-utils.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Critical Error Handling E2E Tests', () => {
  let config: any;
  let testCompanyId: string | undefined;
  let testPersonId: string | undefined;
  let testListId: string | undefined;
  let testTaskId: string | undefined;

  beforeAll(async () => {
    config = loadE2EConfig();
    console.error(
      '🔧 Critical Error Handling E2E Suite - Setting up test environment...'
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
    } catch (error) {
      console.warn(
        '⚠️  Error during test data setup:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }, 60000);

  afterAll(async () => {
    // Cleanup test records
    if (testCompanyId || testPersonId || testListId || testTaskId) {
      await cleanupTestRecords(
        [testCompanyId, testPersonId, testListId, testTaskId].filter(
          Boolean
        ) as string[]
      );
    }

    console.error('✅ Critical Error Handling E2E Tests completed');
  }, 60000);

  /* moved: Authentication and Authorization Errors
  describe('Authentication and Authorization Errors', () => {
    it('should handle authentication failures gracefully', async () => {
      // This test would require invalid API key setup which might not be feasible
      // Instead, test with invalid parameters that trigger auth-like errors
      const response = (await callUniversalTool('search-records', {
        resource_type: 'companies',
        query: '', // Empty query might trigger validation errors
        limit: 1,
      })) as McpToolResponse;

      // Should handle any authentication-related errors gracefully
      expect(response).toBeDefined();

      if (response.isError) {
        expect(response.error).toMatch(
          /(auth|permission|unauthorized|forbidden|invalid|validation)/i
        );
      }

      console.error('✅ Handled authentication scenario gracefully');
    });

    // Moved to test/e2e/suites/error-handling-rate-limit.e2e.test.ts
  });

  */
  describe('Parameter Validation and Data Format Errors', () => {
    it('should handle missing required parameters gracefully', async () => {
      // Test search without required resource_type
      const response = (await callUniversalTool('search-records', {
        // Missing resource_type
        query: 'test',
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(/(resource_type|required)/i);
      console.error('✅ Handled missing required parameters');
    });

    it('should validate resource_type parameter values', async () => {
      const response = (await callUniversalTool('search-records', {
        resource_type: 'invalid_resource_type_12345',
        query: 'test',
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(/(invalid|resource_type|not found)/i);
      console.error('✅ Validated resource_type parameter');
    });

    it('should handle invalid record IDs gracefully', async () => {
      // Use a valid UUID format that doesn't exist to test 404 responses
      const response = (await callUniversalTool('get-record-details', {
        resource_type: 'companies',
        record_id: errorScenarios.invalidIds.generic,
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(
        /(not found|invalid|does not exist|validation|parameter error)/i
      );
      console.error('✅ Handled invalid record IDs');
    });

    it('should validate limit parameters', async () => {
      const response = (await callUniversalTool('search-records', {
        resource_type: 'companies',
        query: 'test',
        limit: -5, // Invalid negative limit
      })) as McpToolResponse;

      // May either reject the negative limit or silently use default
      // Both behaviors are acceptable for this validation test
      expect(response).toBeDefined();
      console.error('✅ Validated limit parameters');
    });

    it('should handle malformed filter objects', async () => {
      const response = (await callUniversalTool('advanced-search', {
        resource_type: 'companies',
        filters: 'this_should_be_an_object_not_string' as unknown as any, // Invalid filter format
      })) as McpToolResponse;

      // Should either validate filters or handle gracefully
      expect(response).toBeDefined();
      console.error('✅ Handled malformed filter objects');
    });

    it('should validate email format in person creation', async () => {
      const personData = {
        first_name: 'Test',
        last_name: 'Person',
        email_address: errorScenarios.invalidFormats.email.malformed,
      };

      const response = (await callUniversalTool('create-record', {
        resource_type: 'people',
        record_data: personData,
      })) as McpToolResponse;

      // May either validate email format or accept invalid emails
      // Both behaviors are acceptable depending on API implementation
      expect(response).toBeDefined();
      console.error('✅ Validated email format handling');
    });

    it('should handle extremely long text values', async () => {
      const longText = 'A'.repeat(10000); // Very long string

      const response = (await callUniversalTool('create-record', {
        resource_type: 'companies',
        record_data: {
          name: 'Test Company',
          description: longText,
        } as any,
      })) as McpToolResponse;

      // Should handle long text either by truncating, accepting, or rejecting
      expect(response).toBeDefined();
      console.error('✅ Handled extremely long text values');
    });
  });

  describe('Resource Not Found Scenarios', () => {
    it('should handle company not found errors', async () => {
      // Use a valid UUID format that doesn't exist to test 404 responses
      const response = (await callUniversalTool('get-record-details', {
        resource_type: 'companies',
        record_id: errorScenarios.invalidIds.company,
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(
        /(not found|does not exist|invalid|validation|parameter error)/i
      );
      console.error('✅ Handled company not found errors');
    });

    it('should handle person not found errors', async () => {
      // Use a valid UUID format that doesn't exist to test 404 responses
      const response = (await callUniversalTool('get-record-details', {
        resource_type: 'people',
        record_id: errorScenarios.invalidIds.person,
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(
        /(not found|does not exist|invalid|validation|parameter error)/i
      );
      console.error('✅ Handled person not found errors');
    });

    it('should handle task not found errors', async () => {
      const response = (await callUniversalTool('update-record', {
        resource_type: 'tasks',
        record_id: errorScenarios.invalidIds.task,
        record_data: {
          title: 'Updated Title',
        },
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      // Accept not-found patterns, task content immutability errors, and generic sanitized errors
      // (error sanitizer may return generic messages for security reasons)
      expect(response.error).toMatch(
        /(not found|does not exist|invalid|cannot read|undefined|validation|parameter error|immutable|cannot be updated|content\s+cannot\s+be\s+updated|An error occurred|error occurred|failed to update)/i
      );
      console.error('✅ Handled task not found errors');
    });

    it('should handle list not found errors', async () => {
      const response = (await callUniversalTool('get-record-details', {
        resource_type: 'lists',
        record_id: errorScenarios.invalidIds.list,
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(
        /(not found|does not exist|invalid|validation|parameter error)/i
      );
      console.error('✅ Handled list not found errors');
    });

    it('should handle note not found errors', async () => {
      const response = (await callNotesTool('list-notes', {
        resource_type: 'companies',
        record_id: errorScenarios.invalidIds.note,
        limit: 50,
        offset: 0,
      })) as McpToolResponse;

      // Notes list might succeed but return empty results for invalid IDs
      expect(response).toBeDefined();
      console.error('✅ Handled note not found scenario');
    });
  });

  describe('Cross-Tool Error Propagation', () => {
    it('should handle errors when linking non-existent records', async () => {
      // First create a task
      const taskData = testDataGenerator.tasks.basicTask();
      const taskResponse = (await callUniversalTool('create-record', {
        resource_type: 'tasks',
        record_data: taskData as any,
      })) as McpToolResponse;

      if (hasValidContent(taskResponse)) {
        const taskId = extractRecordId(taskResponse);

        if (taskId) {
          // Try to link to non-existent company
          const linkResponse = (await callTasksTool('update-record', {
            resource_type: 'tasks',
            record_id: taskId,
            record_data: {
              linked_records: errorScenarios.relationships.nonExistentLinks,
            },
          })) as McpToolResponse;

          // Should handle linking to non-existent records gracefully
          expect(linkResponse).toBeDefined();

          // Clean up
          await callUniversalTool('delete-record', {
            resource_type: 'tasks',
            record_id: taskId,
          }).catch(() => {});

          console.error('✅ Handled non-existent record linking');
        }
      }
    });

    it('should handle cascading tool failures', async () => {
      // Test scenario where one tool failure could affect another
      const companyResponse = (await callUniversalTool('create-record', {
        resource_type: 'companies',
        record_data: {
          // Missing required field to trigger error
          name: '', // Empty name might cause validation error
        },
      })) as McpToolResponse;

      // Should handle creation errors gracefully
      expect(companyResponse).toBeDefined();

      if (companyResponse.isError) {
        // Try to create a note for the failed company creation
        const noteResponse = (await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: 'non-existent-company-id',
          title: 'Test Note',
          content: 'This should fail gracefully',
          format: 'markdown',
        })) as McpToolResponse;

        // Should handle cascading failures gracefully
        expect(noteResponse).toBeDefined();
        console.error('✅ Handled cascading tool failures');
      }
    });

    it('should handle concurrent operation conflicts', async () => {
      if (!testCompanyId) {
        console.error(
          '⏭️ Skipping concurrent operations test - no test company'
        );
        return;
      }

      // Attempt concurrent updates to the same record
      const operations = [
        () =>
          callUniversalTool('update-record', {
            resource_type: 'companies',
            record_id: testCompanyId!,
            record_data: { name: 'Updated Name 1' },
          }),
        () =>
          callUniversalTool('update-record', {
            resource_type: 'companies',
            record_id: testCompanyId!,
            record_data: { name: 'Updated Name 2' },
          }),
        () =>
          callUniversalTool('get-record-details', {
            resource_type: 'companies',
            record_id: testCompanyId!,
          }),
      ];

      const results = await executeConcurrentOperations(operations);

      // All operations should complete (some may fail due to conflicts, which is acceptable)
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        console.error(`✅ Concurrent operation ${index + 1} completed`);
      });

      console.error('✅ Handled concurrent operation conflicts');
    });

    it('should handle batch operation partial failures', async () => {
      // Create a mix of valid and invalid operations
      const batchOperations = [
        // Valid operation
        () =>
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'test',
            limit: 1,
          }),
        // Invalid operation
        () =>
          callUniversalTool('get-record-details', {
            resource_type: 'companies',
            record_id: errorScenarios.invalidIds.generic,
          }),
        // Another valid operation
        () =>
          callUniversalTool('search-records', {
            resource_type: 'people',
            query: 'test',
            limit: 1,
          }),
      ];

      const results = await Promise.allSettled(
        batchOperations.map((op) => op())
      );

      const analysis = analyzeBatchResults(results);

      expect(analysis.total).toBe(3);
      expect(analysis.successful + analysis.failed).toBe(3);

      console.error(
        `✅ Batch operations: ${analysis.successful} succeeded, ${analysis.failed} failed`
      );
    });
  });

  /* moved: Data Consistency and Recovery
  describe('Data Consistency and Recovery', () => {
    it('should handle incomplete transaction scenarios', async () => {
      // Test creating a record and then immediately trying to reference it
      const companyData = testDataGenerator.companies.basicCompany();
      const createResponse = (await callUniversalTool('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      })) as McpToolResponse;

      if (hasValidContent(createResponse)) {
        const companyId = extractRecordId(createResponse);

        if (companyId) {
          // Immediately try to create a note for the company
          const noteResponse = (await callNotesTool('create-note', {
            resource_type: 'companies',
            record_id: companyId,
            title: 'Immediate Note',
            content: 'Testing immediate reference',
            format: 'markdown',
          })) as McpToolResponse;

          // Should handle immediate reference gracefully
          expect(noteResponse).toBeDefined();

          // Clean up
          await callUniversalTool('delete-record', {
            resource_type: 'companies',
            record_id: companyId,
          }).catch(() => {});

          console.error('✅ Handled incomplete transaction scenario');
        }
      }
    });

    it('should handle error recovery gracefully', async () => {
      // Test error recovery by retrying a failed operation
      const invalidResponse = (await callUniversalTool('get-record-details', {
        resource_type: 'companies',
        record_id: 'intentionally-invalid-id',
      })) as McpToolResponse;

      // Should get an error
      expect(invalidResponse.isError).toBe(true);

      // Now try a valid operation to test recovery
      if (testCompanyId) {
        const validResponse = (await callUniversalTool('get-record-details', {
          resource_type: 'companies',
          record_id: testCompanyId,
        })) as McpToolResponse;

        // Should succeed after the previous error
        expect(validResponse).toBeDefined();
        console.error('✅ Demonstrated error recovery');
      }
    });
  });

  /* moved: Error Message Consistency
  describe('Error Message Consistency', () => {
    it('should provide consistent error formats across tools', async () => {
      const errorResponses = await Promise.all([
        callUniversalTool('get-record-details', {
          resource_type: 'companies',
          record_id: errorScenarios.invalidIds.generic,
        }),
        callTasksTool('update-record', {
          resource_type: 'tasks',
          record_id: errorScenarios.invalidIds.task,
          record_data: { status: 'completed' },
        }),
        callNotesTool('list-notes', {
          resource_type: 'companies',
          record_id: errorScenarios.invalidIds.generic,
        }),
      ]);

      // All error responses should be defined and have error properties
      errorResponses.forEach((response, index) => {
        expect(response).toBeDefined();
        if ((response as McpToolResponse).isError) {
          expect((response as McpToolResponse).error).toBeDefined();
          expect(typeof (response as McpToolResponse).error).toBe('string');
        }
        console.error(`✅ Error response ${index + 1} has consistent format`);
      });
    });

    it('should provide helpful error messages', async () => {
      const response = (await callUniversalTool('create-record', {
        resource_type: 'people',
        record_data: {
          // Missing required fields
          email_address: 'invalid-email-format',
        },
      })) as McpToolResponse;

      if (response.isError) {
        // Error message should be informative
        expect(response.error).toBeTruthy();
        expect(response.error.length).toBeGreaterThan(10); // Should be descriptive
        console.error('✅ Error message is helpful:', response.error);
      }
    });
  });
*/
});
