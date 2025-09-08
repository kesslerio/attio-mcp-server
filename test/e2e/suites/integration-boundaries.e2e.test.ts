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

import { E2EAssertions } from '../utils/assertions.js';
import { testDataGenerator } from '../fixtures/index.js';
import type { McpToolResponse } from '../utils/assertions.js';

// Helper: extract first record_id from a search response
function firstRecordIdFromSearch(
  response: McpToolResponse
): string | undefined {
  if (response.isError || !response.content || response.content.length === 0) {
    return undefined;
  }
  if (!text) return undefined;
  try {
    if (Array.isArray(parsed) && parsed[0]?.id?.record_id) {
      return parsed[0].id.record_id;
    }
    if (
      parsed?.data &&
      Array.isArray(parsed.data) &&
      parsed.data[0]?.id?.record_id
    ) {
      return parsed.data[0].id.record_id;
    }
    if (parsed?.id?.record_id) {
      return parsed.id.record_id;
    }
  } catch {
    // ignore parse errors
  }
  return undefined;
}

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Integration Boundaries E2E Tests', () => {
  const testRecordIds: string[] = [];

  beforeAll(async () => {
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


      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
        }
        console.error(`✅ Concurrent operation ${index + 1} completed`);
      });

      console.error('✅ Cross-resource concurrent operations completed');
    }, 45000);

    it('should handle API rate limiting gracefully', async () => {
      // Use more realistic search queries that are more likely to succeed or get rate limited
        .fill(null)
        .map((_, i) =>
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: i < 5 ? 'test' : `company`, // Use common terms that might exist
            limit: 1,
          })
        );

      let successCount = 0;
      let rateLimitCount = 0;
      let otherErrorCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (!response.isError) {
            successCount++;
          } else if (
            typeof response.error === 'string' &&
            (response.error.toLowerCase().includes('rate') ||
              response.error.toLowerCase().includes('limit') ||
              response.error.includes('429') ||
              response.error.includes('too many requests'))
          ) {
            rateLimitCount++;
          } else {
            otherErrorCount++;
            console.error(`Request ${index} failed with: ${response.error}`);
          }
        } else {
          otherErrorCount++;
          console.error(`Request ${index} rejected with: ${result.reason}`);
        }
      });

      console.error(
        `🔍 Rate limiting test results: ${successCount} succeeded, ${rateLimitCount} rate limited, ${otherErrorCount} other errors`
      );

      // Expect at least some requests to succeed or be rate limited (not all failing with other errors)
      expect(successCount + rateLimitCount).toBeGreaterThan(0);
      console.error(
        `✅ Rate limiting test: ${successCount} succeeded, ${rateLimitCount} rate limited`
      );
    }, 60000);

    it('should validate cross-resource data consistency', async () => {
      // Create a company
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
          resource_type: 'tasks',
          record_data: {
            content: 'Integration boundary test task',
            recordId: companyId,
            targetObject: 'companies',
          },
        });

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
        expect(response).toBeDefined();

        // After malformed request, system should still respond to valid request
          resource_type: 'companies',
          query: 'recovery-test',
          limit: 1,
        })) as McpToolResponse;
        expect(validResponse).toBeDefined();
      }

      console.error('✅ Malformed request recovery validated');
    }, 45000);

    it('should handle resource type boundaries', async () => {

      for (const resourceType of resourceTypes) {
        // Test basic operations on each resource type
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
        {
          name: 'Universal → Task Tool',
          operation: async () => {
              resource_type: 'tasks',
              query: 'tool-boundary',
              limit: 1,
            })) as McpToolResponse;

            if (searchResponse && !searchResponse.isError) {
              if (taskId) {
                return await callTasksTool('get-record-details', {
                  resource_type: 'tasks',
                  record_id: taskId,
                });
              }
            }
            return searchResponse as McpToolResponse;
          },
        },
        {
          name: 'Universal → Notes Tool',
          operation: async () => {
              resource_type: 'companies',
              query: 'tool-boundary',
              limit: 1,
            })) as McpToolResponse;

            if (companyResponse && !companyResponse.isError) {
              if (companyId) {
                return await callNotesTool('list-notes', {
                  resource_type: 'companies',
                  record_id: companyId,
                  limit: 1,
                });
              }
            }
            return companyResponse as McpToolResponse;
          },
        },
      ];

      for (const interaction of toolInteractions) {
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
        resource_type: 'companies',
        query: 'timeout-test',
        limit: 1,
      })) as McpToolResponse;

      expect(response).toBeDefined();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(60000); // 1 minute max

      console.error('✅ Network timeout scenario handled');
    }, 65000);

    it('should validate API version compatibility', async () => {
      // Test that API calls work with current version expectations
        resource_type: 'companies',
        query: 'version-test',
        limit: 1,
      })) as McpToolResponse;

      expect(versionTestResponse).toBeDefined();

      // Response should have expected structure
      if (!versionTestResponse.isError) {
        // Validate content exists
        expect(
          versionTestResponse.content &&
            Array.isArray(versionTestResponse.content),
          'Response should have content array'
        ).toBe(true);
      } else {
        expect(versionTestResponse.error).toBeDefined();
        expect(typeof versionTestResponse.error).toBe('string');
      }

      console.error('✅ API version compatibility validated');
    }, 30000);

    it('should handle service degradation gracefully', async () => {
      // Test system behavior under various load conditions
        { name: 'Light load', operations: 2 },
        { name: 'Medium load', operations: 5 },
        { name: 'Heavy load', operations: 8 },
      ];

      for (const loadTest of loadTests) {
          .fill(null)
          .map((_, i) =>
            callUniversalTool('search-records', {
              resource_type: 'companies',
              query: `load-test-${i}`,
              limit: 1,
            })
          );

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
        expect(errorResponse.isError).toBe(true);

        // Test recovery
        expect(recoveryResponse).toBeDefined();

        console.error(`✅ ${test.name} completed successfully`);
      }
    }, 45000);

    it('should validate system state consistency after errors', async () => {
      // Ensure system maintains consistent state even after errors
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

        consistencyTests.map((test) => test())
      )) as McpToolResponse[];

      // Should have mix of success and error responses

      expect(successCount).toBeGreaterThan(0);
      expect(errorCount).toBeGreaterThan(0);
      expect(successCount + errorCount).toBe(results.length);

      console.error(
        `✅ System consistency maintained: ${successCount} success, ${errorCount} errors`
      );
    }, 45000);
  });
});
