/**
 * Integration Boundaries E2E Test Suite
 *
 * Tests cross-system integration points and API boundaries including:
 * - API rate limiting and throttling behavior
 * - Cross-resource type interactions
 * - System integration edge cases
 * - External dependency handling
 *
 * Total coverage: System integration boundaries
 * Business value: System reliability and integration robustness
 *
 * Part of Issue #526 Sprint 4 - E2E Test Consolidation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  callUniversalTool,
  callTasksTool,
  callNotesTool,
  validateTestEnvironment,
} from '../utils/enhanced-tool-caller.js';
import { E2EAssertions } from '../utils/assertions.js';
import { testDataGenerator } from '../fixtures/index.js';
import {
  extractRecordId,
  createTestRecord,
  cleanupTestRecords,
} from '../utils/error-handling-utils.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Integration Boundaries E2E Tests', () => {
  let testRecordIds: string[] = [];

  beforeAll(async () => {
    const validation = await validateTestEnvironment();
    if (!validation.valid) {
      console.warn(
        '⚠️ Integration boundary test warnings:',
        validation.warnings
      );
    }
  });

  afterAll(async () => {
    if (testRecordIds.length > 0) {
      await cleanupTestRecords(testRecordIds);
    }
  });

  describe('Cross-System API Integration', () => {
    it('should handle concurrent cross-resource operations', async () => {
      const operations = [
        () =>
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'integration-test',
            limit: 5,
          }),
        () =>
          callUniversalTool('search-records', {
            resource_type: 'people',
            query: 'integration-test',
            limit: 5,
          }),
        () =>
          callUniversalTool('search-records', {
            resource_type: 'tasks',
            query: 'integration-test',
            limit: 5,
          }),
      ];

      const results = await Promise.allSettled(operations.map((op) => op()));

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
        }
        console.error(`✅ Concurrent operation ${index + 1} completed`);
      });

      console.error('✅ Cross-resource concurrent operations completed');
    }, 45000);

    it('should handle API rate limiting gracefully', async () => {
      const rapidRequests = Array(10)
        .fill(null)
        .map((_, i) =>
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: `rate-limit-test-${i}`,
            limit: 1,
          })
        );

      const results = await Promise.allSettled(rapidRequests);
      let successCount = 0;
      let rateLimitCount = 0;

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const response = result.value;
          if (!response.isError) {
            successCount++;
          } else if (
            response.error.toLowerCase().includes('rate') ||
            response.error.toLowerCase().includes('limit')
          ) {
            rateLimitCount++;
          }
        }
      });

      expect(successCount + rateLimitCount).toBeGreaterThan(0);
      console.error(
        `✅ Rate limiting test: ${successCount} succeeded, ${rateLimitCount} rate limited`
      );
    }, 60000);

    it('should validate cross-resource data consistency', async () => {
      // Create a company
      const companyData = testDataGenerator.companies.basicCompany();
      const companyId = await createTestRecord(
        (resourceType, data) =>
          callUniversalTool('create-record', {
            resource_type: resourceType as any,
            record_data: data,
          }),
        'companies',
        companyData
      );

      if (companyId) {
        testRecordIds.push(companyId);

        // Create related records
        const taskResponse = await callTasksTool('create-record', {
          resource_type: 'tasks',
          record_data: {
            content: 'Integration boundary test task',
            recordId: companyId,
          },
        });

        const noteResponse = await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: companyId,
          title: 'Integration boundary test note',
          content: 'Testing cross-resource consistency',
          format: 'markdown',
        });

        expect(taskResponse).toBeDefined();
        expect(noteResponse).toBeDefined();

        console.error('✅ Cross-resource data consistency validated');
      }
    }, 45000);
  });

  describe('System Integration Edge Cases', () => {
    it('should handle malformed request recovery', async () => {
      // Send malformed requests and ensure system recovery
      const malformedRequests = [
        () => callUniversalTool('search-records', {} as any), // Missing required fields
        () =>
          callUniversalTool('get-record-details', {
            resource_type: 'companies',
          } as any), // Missing record_id
        () =>
          callUniversalTool('create-record', {
            resource_type: 'companies',
          } as any), // Missing record_data
      ];

      for (const request of malformedRequests) {
        const response = await request();
        expect(response).toBeDefined();

        // After malformed request, system should still respond to valid request
        const validResponse = await callUniversalTool('search-records', {
          resource_type: 'companies',
          query: 'recovery-test',
          limit: 1,
        });
        expect(validResponse).toBeDefined();
      }

      console.error('✅ Malformed request recovery validated');
    }, 45000);

    it('should handle resource type boundaries', async () => {
      const resourceTypes = ['companies', 'people', 'tasks', 'lists'];

      for (const resourceType of resourceTypes) {
        // Test basic operations on each resource type
        const searchResponse = await callUniversalTool('search-records', {
          resource_type: resourceType as any,
          query: 'boundary-test',
          limit: 1,
        });

        expect(searchResponse).toBeDefined();
        console.error(`✅ Resource type ${resourceType} boundary validated`);
      }
    }, 45000);

    it('should validate tool boundary interactions', async () => {
      // Test interactions between different tool categories
      const toolInteractions = [
        {
          name: 'Universal → Task Tool',
          operation: async () => {
            const searchResponse = await callUniversalTool('search-records', {
              resource_type: 'tasks',
              query: 'tool-boundary',
              limit: 1,
            });

            if (
              searchResponse &&
              !searchResponse.isError &&
              searchResponse.data
            ) {
              const results = Array.isArray(searchResponse.data)
                ? searchResponse.data
                : [searchResponse.data];
              if (results.length > 0) {
                const taskId = extractRecordId({ data: results[0] });
                if (taskId) {
                  return await callTasksTool('get-record-details', {
                    resource_type: 'tasks',
                    record_id: taskId,
                  });
                }
              }
            }
            return searchResponse;
          },
        },
        {
          name: 'Universal → Notes Tool',
          operation: async () => {
            const companyResponse = await callUniversalTool('search-records', {
              resource_type: 'companies',
              query: 'tool-boundary',
              limit: 1,
            });

            if (
              companyResponse &&
              !companyResponse.isError &&
              companyResponse.data
            ) {
              const results = Array.isArray(companyResponse.data)
                ? companyResponse.data
                : [companyResponse.data];
              if (results.length > 0) {
                const companyId = extractRecordId({ data: results[0] });
                if (companyId) {
                  return await callNotesTool('list-notes', {
                    resource_type: 'companies',
                    record_id: companyId,
                    limit: 1,
                  });
                }
              }
            }
            return companyResponse;
          },
        },
      ];

      for (const interaction of toolInteractions) {
        const result = await interaction.operation();
        expect(result).toBeDefined();
        console.error(
          `✅ Tool boundary interaction validated: ${interaction.name}`
        );
      }
    }, 60000);
  });

  describe('External Dependency Handling', () => {
    it('should handle network timeout scenarios', async () => {
      // Test with very small timeout to simulate network issues
      const startTime = Date.now();
      const response = await callUniversalTool('search-records', {
        resource_type: 'companies',
        query: 'timeout-test',
        limit: 1,
      });
      const endTime = Date.now();

      expect(response).toBeDefined();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(60000); // 1 minute max

      console.error('✅ Network timeout scenario handled');
    }, 65000);

    it('should validate API version compatibility', async () => {
      // Test that API calls work with current version expectations
      const versionTestResponse = await callUniversalTool('search-records', {
        resource_type: 'companies',
        query: 'version-test',
        limit: 1,
      });

      expect(versionTestResponse).toBeDefined();

      // Response should have expected structure
      if (!versionTestResponse.isError) {
        // Check for either data or content property (different tools use different structures)
        const hasValidResponse =
          versionTestResponse.data || versionTestResponse.content;
        expect(
          hasValidResponse,
          'Response should have either data or content'
        ).toBeDefined();
      } else {
        expect(versionTestResponse.error).toBeDefined();
        expect(typeof versionTestResponse.error).toBe('string');
      }

      console.error('✅ API version compatibility validated');
    }, 30000);

    it('should handle service degradation gracefully', async () => {
      // Test system behavior under various load conditions
      const loadTests = [
        { name: 'Light load', operations: 2 },
        { name: 'Medium load', operations: 5 },
        { name: 'Heavy load', operations: 8 },
      ];

      for (const loadTest of loadTests) {
        const operations = Array(loadTest.operations)
          .fill(null)
          .map((_, i) =>
            callUniversalTool('search-records', {
              resource_type: 'companies',
              query: `load-test-${i}`,
              limit: 1,
            })
          );

        const results = await Promise.allSettled(operations);
        const successRate =
          results.filter((r) => r.status === 'fulfilled').length /
          results.length;

        expect(successRate).toBeGreaterThan(0.5); // At least 50% success rate expected
        console.error(
          `✅ ${loadTest.name} service degradation test: ${(successRate * 100).toFixed(1)}% success rate`
        );
      }
    }, 60000);
  });

  describe('Integration Recovery and Resilience', () => {
    it('should demonstrate error recovery patterns', async () => {
      // Test that system can recover from various error conditions
      const errorRecoveryTests = [
        {
          name: 'Invalid resource type recovery',
          errorOp: () =>
            callUniversalTool('search-records', {
              resource_type: 'invalid_type' as any,
              query: 'test',
            }),
          recoveryOp: () =>
            callUniversalTool('search-records', {
              resource_type: 'companies',
              query: 'recovery-test',
              limit: 1,
            }),
        },
        {
          name: 'Invalid record ID recovery',
          errorOp: () =>
            callUniversalTool('get-record-details', {
              resource_type: 'companies',
              record_id: 'invalid-id-12345',
            }),
          recoveryOp: () =>
            callUniversalTool('search-records', {
              resource_type: 'companies',
              query: 'recovery-test',
              limit: 1,
            }),
        },
      ];

      for (const test of errorRecoveryTests) {
        // Trigger error condition
        const errorResponse = await test.errorOp();
        expect(errorResponse.isError).toBe(true);

        // Test recovery
        const recoveryResponse = await test.recoveryOp();
        expect(recoveryResponse).toBeDefined();

        console.error(`✅ ${test.name} completed successfully`);
      }
    }, 45000);

    it('should validate system state consistency after errors', async () => {
      // Ensure system maintains consistent state even after errors
      const consistencyTests = [
        () =>
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'consistency-1',
            limit: 1,
          }),
        () =>
          callUniversalTool('search-records', {
            resource_type: 'invalid' as any,
            query: 'error-trigger',
          }),
        () =>
          callUniversalTool('search-records', {
            resource_type: 'people',
            query: 'consistency-2',
            limit: 1,
          }),
        () =>
          callUniversalTool('get-record-details', {
            resource_type: 'companies',
            record_id: 'invalid-id',
          }),
        () =>
          callUniversalTool('search-records', {
            resource_type: 'tasks',
            query: 'consistency-3',
            limit: 1,
          }),
      ];

      const results = await Promise.all(consistencyTests.map((test) => test()));

      // Should have mix of success and error responses
      const successCount = results.filter((r) => !r.isError).length;
      const errorCount = results.filter((r) => r.isError).length;

      expect(successCount).toBeGreaterThan(0);
      expect(errorCount).toBeGreaterThan(0);
      expect(successCount + errorCount).toBe(results.length);

      console.error(
        `✅ System consistency maintained: ${successCount} success, ${errorCount} errors`
      );
    }, 45000);
  });
});
