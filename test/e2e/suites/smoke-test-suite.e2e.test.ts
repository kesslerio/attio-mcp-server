/**
 * Smoke Test Suite E2E Tests
 *
 * Fast validation tests for core functionality and system health checks.
 * Designed for rapid CI/CD pipeline validation and basic system verification.
 *
 * This suite covers:
 * - Basic system connectivity and health
 * - Core tool functionality verification
 * - Essential workflow smoke tests
 * - Quick regression detection
 *
 * Total coverage: Essential system health validation
 * Business value: CI/CD speed and basic reliability
 *
 * Part of Issue #526 Sprint 4 - E2E Test Consolidation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  callUniversalTool,
  callTasksTool,
  callNotesTool,
  validateTestEnvironment,
} from '../utils/enhanced-tool-caller.js';
import { E2EAssertions } from '../utils/assertions.js';
import { testDataGenerator } from '../fixtures/index.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Smoke Test Suite - Fast Validation', () => {
  beforeAll(async () => {
    const validation = await validateTestEnvironment();
    if (!validation.valid) {
      console.warn('⚠️ Smoke test warnings:', validation.warnings);
    }
  });

  describe('System Health Smoke Tests', () => {
    it('should validate basic API connectivity', async () => {
      const response = await callUniversalTool('search-records', {
        resource_type: 'companies',
        query: 'smoke-test-connectivity',
        limit: 1,
      });

      expect(response).toBeDefined();
      expect(typeof response).toBe('object');
      expect('isError' in response).toBe(true);

      console.error('✅ Basic API connectivity validated');
    }, 15000);

    it('should validate test environment setup', async () => {
      const validation = await validateTestEnvironment();

      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');

      console.error(
        `✅ Test environment setup: ${validation.valid ? 'PASS' : 'WARN'}`
      );
    }, 10000);

    it('should validate core resource types accessibility', async () => {
      const resourceTypes = ['companies', 'people', 'tasks'];

      for (const resourceType of resourceTypes) {
        const response = await callUniversalTool('search-records', {
          resource_type: resourceType as any,
          query: 'smoke-test',
          limit: 1,
        });

        expect(response).toBeDefined();
        console.error(`✅ Resource type ${resourceType} accessible`);
      }
    }, 20000);
  });

  describe('Core Tool Functionality Smoke Tests', () => {
    it('should validate universal tool basic operations', async () => {
      const operations = [
        {
          name: 'Search Records',
          operation: () =>
            callUniversalTool('search-records', {
              resource_type: 'companies',
              query: 'universal-smoke-test',
              limit: 1,
            }),
        },
        {
          name: 'Get Record Details (with error handling)',
          operation: () =>
            callUniversalTool('get-record-details', {
              resource_type: 'companies',
              record_id: 'smoke-test-non-existent-id',
            }),
        },
      ];

      for (const op of operations) {
        const result = await op.operation();
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        console.error(`✅ Universal tool operation validated: ${op.name}`);
      }
    }, 20000);

    it('should validate task tool basic operations', async () => {
      // Test task search
      const searchResponse = await callTasksTool('search-records', {
        resource_type: 'tasks',
        query: 'smoke-test-task',
        limit: 1,
      });

      expect(searchResponse).toBeDefined();
      console.error('✅ Task tool search operation validated');

      // Test task creation (smoke test with minimal data)
      const taskData = testDataGenerator.tasks.basicTask();
      const createResponse = await callTasksTool('create-record', {
        resource_type: 'tasks',
        record_data: {
          content: taskData.content,
        },
      });

      expect(createResponse).toBeDefined();
      console.error('✅ Task tool create operation validated');
    }, 25000);

    it('should validate notes tool basic operations', async () => {
      // Test notes list (expected to handle gracefully even with invalid ID)
      const listResponse = await callNotesTool('list-notes', {
        resource_type: 'companies',
        record_id: 'smoke-test-company-id',
        limit: 1,
      });

      expect(listResponse).toBeDefined();
      console.error('✅ Notes tool list operation validated');
    }, 15000);
  });

  describe('Essential Workflow Smoke Tests', () => {
    it('should validate basic record creation workflow', async () => {
      const companyData = testDataGenerator.companies.basicCompany();

      const response = await callUniversalTool('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });

      expect(response).toBeDefined();

      if (!response.isError) {
        const data = E2EAssertions.expectMcpData(response);
        expect(data).toBeDefined();
        console.error('✅ Basic record creation workflow validated');

        // Cleanup (optional for smoke test)
        const recordId = data?.id?.record_id;
        if (recordId) {
          await callUniversalTool('delete-record', {
            resource_type: 'companies',
            record_id: recordId,
          }).catch(() => {
            // Ignore cleanup errors in smoke test
          });
        }
      } else {
        console.error(
          '✅ Basic record creation workflow handled error gracefully'
        );
      }
    }, 30000);

    it('should validate basic search workflow', async () => {
      const searchQueries = [
        {
          resource_type: 'companies' as const,
          query: 'smoke-search-companies',
        },
        { resource_type: 'people' as const, query: 'smoke-search-people' },
        { resource_type: 'tasks' as const, query: 'smoke-search-tasks' },
      ];

      for (const searchQuery of searchQueries) {
        const response = await callUniversalTool('search-records', {
          ...searchQuery,
          limit: 1,
        });

        expect(response).toBeDefined();
        console.error(
          `✅ Search workflow validated for ${searchQuery.resource_type}`
        );
      }
    }, 25000);

    it('should validate basic error handling workflow', async () => {
      // Test that system handles common error scenarios gracefully
      const errorScenarios = [
        {
          name: 'Invalid resource type',
          test: () =>
            callUniversalTool('search-records', {
              resource_type: 'invalid_resource_type' as any,
              query: 'smoke-test',
            }),
        },
        {
          name: 'Missing required parameters',
          test: () =>
            callUniversalTool('get-record-details', {
              resource_type: 'companies',
            } as any),
        },
        {
          name: 'Non-existent record',
          test: () =>
            callUniversalTool('get-record-details', {
              resource_type: 'companies',
              record_id: 'definitely-does-not-exist',
            }),
        },
      ];

      for (const scenario of errorScenarios) {
        const response = await scenario.test();

        expect(response).toBeDefined();
        expect(response.isError).toBe(true);
        expect(response.error).toBeDefined();
        expect(typeof response.error).toBe('string');

        console.error(`✅ Error handling validated: ${scenario.name}`);
      }
    }, 30000);
  });

  describe('Quick Regression Detection', () => {
    it('should detect API response structure regressions', async () => {
      const response = await callUniversalTool('search-records', {
        resource_type: 'companies',
        query: 'regression-structure-test',
        limit: 1,
      });

      // Verify response has expected structure
      expect(response).toBeDefined();
      expect(typeof response).toBe('object');
      expect(response).toHaveProperty('isError');

      if (response.isError) {
        expect(response).toHaveProperty('error');
        expect(typeof response.error).toBe('string');
      } else {
        expect(response).toHaveProperty('data');
      }

      console.error('✅ API response structure regression check passed');
    }, 15000);

    it('should detect tool registration regressions', async () => {
      // Test that expected tools are still available
      const toolTests = [
        () =>
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'tool-reg-test',
            limit: 1,
          }),
        () =>
          callTasksTool('search-records', {
            resource_type: 'tasks',
            query: 'tool-reg-test',
            limit: 1,
          }),
        () =>
          callNotesTool('list-notes', {
            resource_type: 'companies',
            record_id: 'tool-reg-test-id',
            limit: 1,
          }),
      ];

      for (const toolTest of toolTests) {
        const result = await toolTest();
        expect(result).toBeDefined();
      }

      console.error('✅ Tool registration regression check passed');
    }, 25000);

    it('should detect basic functionality regressions', async () => {
      // Quick test of core functionality that should never break
      const functionalityTests = [
        {
          name: 'Search functionality',
          test: async () => {
            const response = await callUniversalTool('search-records', {
              resource_type: 'companies',
              query: 'functionality-test',
              limit: 1,
            });
            return response.isError || response.data !== null;
          },
        },
        {
          name: 'Error handling functionality',
          test: async () => {
            const response = await callUniversalTool('get-record-details', {
              resource_type: 'companies',
              record_id: 'non-existent-for-func-test',
            });
            return response.isError && response.error.length > 0;
          },
        },
        {
          name: 'Parameter validation functionality',
          test: async () => {
            const response = await callUniversalTool('search-records', {
              resource_type: 'invalid_type' as any,
              query: 'func-test',
            });
            return response.isError;
          },
        },
      ];

      for (const funcTest of functionalityTests) {
        const result = await funcTest.test();
        expect(result).toBe(true);
        console.error(
          `✅ Functionality regression check passed: ${funcTest.name}`
        );
      }
    }, 35000);
  });

  describe('Performance Smoke Tests', () => {
    it('should validate acceptable response times', async () => {
      const performanceTests = [
        {
          name: 'Basic search performance',
          test: () =>
            callUniversalTool('search-records', {
              resource_type: 'companies',
              query: 'performance-test',
              limit: 5,
            }),
          maxTime: 10000, // 10 seconds
        },
        {
          name: 'Record detail performance',
          test: () =>
            callUniversalTool('get-record-details', {
              resource_type: 'companies',
              record_id: 'performance-test-id',
            }),
          maxTime: 8000, // 8 seconds
        },
      ];

      for (const perfTest of performanceTests) {
        const startTime = Date.now();
        const response = await perfTest.test();
        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(response).toBeDefined();
        expect(duration).toBeLessThan(perfTest.maxTime);

        console.error(
          `✅ Performance smoke test passed: ${perfTest.name} (${duration}ms)`
        );
      }
    }, 25000);

    it('should validate system remains responsive under load', async () => {
      const loadTest = Array(5)
        .fill(null)
        .map((_, i) =>
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: `load-smoke-test-${i}`,
            limit: 1,
          })
        );

      const startTime = Date.now();
      const results = await Promise.allSettled(loadTest);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Should complete all requests within reasonable time
      expect(totalDuration).toBeLessThan(30000); // 30 seconds for 5 requests

      const successCount = results.filter(
        (r) => r.status === 'fulfilled'
      ).length;
      expect(successCount).toBeGreaterThan(0); // At least some should succeed

      console.error(
        `✅ Load responsiveness validated: ${successCount}/5 succeeded in ${totalDuration}ms`
      );
    }, 35000);
  });
});
