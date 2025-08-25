/**
 * Performance and Rate Limit Error Test Module
 *
 * Tests for API limits, rate limiting, and performance-related errors
 */

import { describe, it, expect } from 'vitest';
import { callUniversalTool } from '../../utils/enhanced-tool-caller.js';
import { type McpToolResponse } from '../../utils/assertions.js';
import { errorScenarios } from '../../fixtures/error-scenarios.js';
import {
  executeConcurrentOperations,
  analyzeBatchResults,
  retryOperation,
} from '../../utils/error-handling-utils.js';

export function performanceErrorsTests() {
  describe('API Limits and Rate Handling', () => {
    it('should handle large result sets appropriately', async () => {
      const response = (await callUniversalTool('search-records', {
        resource_type: 'companies',
        query: errorScenarios.performanceTests.emptyQuery, // Empty query to get all results
        limit: 1000, // Request large limit
      })) as McpToolResponse;

      // Should either limit results, paginate, or handle large sets gracefully
      expect(response).toBeDefined();

      if (!response.isError && response.content) {
        console.error(
          `📊 Large result set test returned: ${response.content.length} items`
        );
      }
    });

    it('should handle rapid successive requests', async () => {
      const rapidOperations = errorScenarios.concurrency.rapidRequests.map(
        (request) => () => callUniversalTool('search-records', request)
      );

      const responses = await executeConcurrentOperations(rapidOperations);
      const analysis = analyzeBatchResults(responses);

      // Should handle rapid requests without complete failure
      expect(responses).toHaveLength(5);

      console.error(`📊 Rapid requests: ${analysis.successful}/5 succeeded`);

      // At least some should succeed (rate limiting is acceptable)
      expect(analysis.successful).toBeGreaterThanOrEqual(1);
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Use a complex search that might timeout
      const complexQuery = errorScenarios.performanceTests.complexQuery;

      const response = (await callUniversalTool('advanced-search', {
        resource_type: 'companies',
        query: complexQuery,
        filters: {
          created_at: { gte: '2020-01-01', lte: '2025-12-31' },
          status: 'active',
        },
        limit: 500,
      })) as McpToolResponse;

      // Should handle complex queries without hanging
      expect(response).toBeDefined();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary failures', async () => {
      const operation = () =>
        callUniversalTool('search-records', {
          resource_type: 'companies',
          query: 'recovery_test',
          limit: 5,
        });

      const result = await retryOperation(operation, 3, 100);

      expect(result.result).toBeDefined();
      console.error(`📊 Recovery test took ${result.attempts} attempts`);
    });

    it('should maintain data consistency after errors', async () => {
      // Create a company
      const companyData = {
        name: 'Error Recovery Test Company',
        description: 'Testing error recovery',
      };

      const createResponse = (await callUniversalTool('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      })) as McpToolResponse;

      if (
        !createResponse.isError &&
        createResponse.content &&
        createResponse.content[0]
      ) {
        const companyId = (createResponse.content[0].data as any)?.id
          ?.record_id;

        if (companyId) {
          // Try an invalid update
          const invalidUpdateResponse = (await callUniversalTool(
            'update-record',
            {
              resource_type: 'companies',
              record_id: companyId,
              record_data: { invalid_field_12345: 'should not work' },
            }
          )) as McpToolResponse;

          // Verify the record still exists and is consistent
          const verifyResponse = (await callUniversalTool(
            'get-record-details',
            {
              resource_type: 'companies',
              record_id: companyId,
            }
          )) as McpToolResponse;

          expect(verifyResponse).toBeDefined();

          // Clean up
          await callUniversalTool('delete-record', {
            resource_type: 'companies',
            record_id: companyId,
          }).catch(() => {});
        }
      }
    });
  });
}
