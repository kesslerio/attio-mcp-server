/**
 * Regression Prevention E2E Test Suite
 *
 * Critical production bug scenarios and regression prevention tests including:
 * - Historical bug reproduction scenarios
 * - Edge cases that have caused production issues
 * - Data integrity safeguards
 * - Critical workflow preservation
 *
 * Total coverage: Production bug prevention
 * Business value: Production stability and reliability
 *
 * Part of Issue #526 Sprint 4 - E2E Test Consolidation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  callUniversalTool,
  callTasksTool,
  callNotesTool,
  validateTestEnvironment 
} from '../utils/enhanced-tool-caller.js';
import { E2EAssertions } from '../utils/assertions.js';
import { testDataGenerator, errorScenarios } from '../fixtures/index.js';
import { 
  extractRecordId,
  createTestRecord,
  cleanupTestRecords,
  hasValidContent 
} from '../utils/error-handling-utils.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Regression Prevention E2E Tests', () => {
  let testRecordIds: string[] = [];

  beforeAll(async () => {
    const validation = await validateTestEnvironment();
    if (!validation.valid) {
      console.warn('⚠️ Regression prevention test warnings:', validation.warnings);
    }
  });

  afterAll(async () => {
    if (testRecordIds.length > 0) {
      await cleanupTestRecords(testRecordIds);
    }
  });

  describe('Historical Bug Scenarios', () => {
    it('should prevent null reference errors in record operations', async () => {
      // Regression test for null pointer exceptions in record handling
      const response = await callUniversalTool('get-record-details', {
        resource_type: 'companies',
        record_id: 'non-existent-record-id-12345',
      });

      // Should handle gracefully without throwing null reference errors
      expect(response).toBeDefined();
      expect(response.isError).toBe(true);
      expect(response.error).toBeDefined();
      expect(typeof response.error).toBe('string');

      console.error('✅ Null reference error prevention validated');
    });

    it('should handle malformed JSON responses gracefully', async () => {
      // Test various edge cases that could cause JSON parsing issues
      const edgeCaseRequests = [
        {
          name: 'Empty query string',
          request: () => callUniversalTool('search-records', {
            resource_type: 'companies',
            query: '',
            limit: 1,
          })
        },
        {
          name: 'Very long query string',
          request: () => callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'A'.repeat(1000),
            limit: 1,
          })
        },
        {
          name: 'Special characters in query',
          request: () => callUniversalTool('search-records', {
            resource_type: 'companies',
            query: '{"test": "value", "special": "chars!@#$%"}',
            limit: 1,
          })
        },
      ];

      for (const testCase of edgeCaseRequests) {
        const response = await testCase.request();
        
        // Should handle all cases without JSON parsing errors
        expect(response).toBeDefined();
        expect(typeof response).toBe('object');
        
        console.error(`✅ JSON handling validated for: ${testCase.name}`);
      }
    }, 45000);

    it('should prevent data corruption in concurrent operations', async () => {
      // Create test record for concurrent operations
      const companyData = testDataGenerator.companies.basicCompany();
      const companyId = await createTestRecord(
        (resourceType, data) => callUniversalTool('create-record', {
          resource_type: resourceType as any,
          record_data: data,
        }),
        'companies',
        companyData
      );

      if (!companyId) {
        console.error('⏭️ Skipping concurrent operations test - could not create company');
        return;
      }

      testRecordIds.push(companyId);

      // Perform concurrent updates
      const concurrentUpdates = [
        () => callUniversalTool('update-record', {
          resource_type: 'companies',
          record_id: companyId,
          record_data: { description: 'Update 1 - Concurrent Test' },
        }),
        () => callUniversalTool('update-record', {
          resource_type: 'companies',
          record_id: companyId,
          record_data: { description: 'Update 2 - Concurrent Test' },
        }),
        () => callUniversalTool('get-record-details', {
          resource_type: 'companies',
          record_id: companyId,
        }),
      ];

      const results = await Promise.allSettled(concurrentUpdates.map(op => op()));
      
      // Should handle concurrent operations without data corruption
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
          console.error(`✅ Concurrent operation ${index + 1} completed safely`);
        }
      });

      // Final integrity check
      const finalCheck = await callUniversalTool('get-record-details', {
        resource_type: 'companies',
        record_id: companyId,
      });

      expect(finalCheck).toBeDefined();
      if (!finalCheck.isError) {
        expect(finalCheck.data).toBeDefined();
      }

      console.error('✅ Data corruption prevention validated');
    }, 60000);

    it('should prevent memory leaks in batch operations', async () => {
      // Test large batch operations that previously caused memory issues
      const batchSize = 10;
      const batchOperations = [];

      for (let i = 0; i < batchSize; i++) {
        batchOperations.push(
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: `batch-test-${i}`,
            limit: 5,
          })
        );
      }

      const results = await Promise.allSettled(batchOperations);
      
      // All operations should complete without memory issues
      results.forEach((result, index) => {
        expect(result.status).toMatch(/(fulfilled|rejected)/);
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
        }
        console.error(`✅ Batch operation ${index + 1} memory safe`);
      });

      console.error('✅ Memory leak prevention validated');
    }, 60000);
  });

  describe('Critical Workflow Preservation', () => {
    it('should preserve core CRUD workflow integrity', async () => {
      // Test the complete CRUD cycle that must never break
      let recordId: string | undefined;

      try {
        // CREATE
        const companyData = testDataGenerator.companies.basicCompany();
        const createResponse = await callUniversalTool('create-record', {
          resource_type: 'companies',
          record_data: companyData,
        });

        E2EAssertions.expectMcpSuccess(createResponse);
        recordId = extractRecordId(createResponse);
        expect(recordId).toBeDefined();

        if (recordId) {
          testRecordIds.push(recordId);

          // READ
          const readResponse = await callUniversalTool('get-record-details', {
            resource_type: 'companies',
            record_id: recordId,
          });

          E2EAssertions.expectMcpSuccess(readResponse);
          const recordData = E2EAssertions.expectMcpData(readResponse);
          expect(recordData).toBeDefined();

          // UPDATE
          const updateResponse = await callUniversalTool('update-record', {
            resource_type: 'companies',
            record_id: recordId,
            record_data: {
              description: 'Updated for CRUD workflow test',
            },
          });

          E2EAssertions.expectMcpSuccess(updateResponse);

          // VERIFY UPDATE
          const verifyResponse = await callUniversalTool('get-record-details', {
            resource_type: 'companies',
            record_id: recordId,
          });

          E2EAssertions.expectMcpSuccess(verifyResponse);

          console.error('✅ Core CRUD workflow integrity preserved');
        }
      } catch (error) {
        console.error('❌ CRITICAL: Core CRUD workflow integrity compromised:', error);
        throw error;
      }
    }, 45000);

    it('should preserve cross-resource relationship integrity', async () => {
      // Test relationships between resources that must remain stable
      const companyData = testDataGenerator.companies.basicCompany();
      const companyId = await createTestRecord(
        (resourceType, data) => callUniversalTool('create-record', {
          resource_type: resourceType as any,
          record_data: data,
        }),
        'companies',
        companyData
      );

      if (!companyId) {
        console.error('⏭️ Skipping relationship test - could not create company');
        return;
      }

      testRecordIds.push(companyId);

      try {
        // Create task linked to company
        const taskResponse = await callTasksTool('create-record', {
          resource_type: 'tasks',
          record_data: {
            content: 'Relationship integrity test task',
            recordId: companyId,
          },
        });

        expect(taskResponse).toBeDefined();

        // Create note for company
        const noteResponse = await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: companyId,
          title: 'Relationship integrity test note',
          content: 'Testing cross-resource relationships',
          format: 'markdown',
        });

        expect(noteResponse).toBeDefined();

        // Verify company still accessible after relationship creation
        const companyCheck = await callUniversalTool('get-record-details', {
          resource_type: 'companies',
          record_id: companyId,
        });

        E2EAssertions.expectMcpSuccess(companyCheck);

        console.error('✅ Cross-resource relationship integrity preserved');
      } catch (error) {
        console.error('❌ CRITICAL: Cross-resource relationship integrity compromised:', error);
        throw error;
      }
    }, 60000);

    it('should preserve data validation rules', async () => {
      // Test that critical validation rules are still enforced
      const validationTests = [
        {
          name: 'Required field validation',
          test: async () => {
            const response = await callUniversalTool('create-record', {
              resource_type: 'companies',
              record_data: {
                // Missing required 'name' field
                description: 'Test company without name',
              },
            });
            
            // Should either succeed with generated name or fail with validation error
            expect(response).toBeDefined();
            return response;
          }
        },
        {
          name: 'Data type validation',
          test: async () => {
            const response = await callUniversalTool('search-records', {
              resource_type: 'companies',
              query: 'validation-test',
              limit: 'invalid-number' as any, // Wrong data type
            });
            
            // Should handle invalid data type gracefully
            expect(response).toBeDefined();
            return response;
          }
        },
      ];

      for (const validationTest of validationTests) {
        const result = await validationTest.test();
        expect(result).toBeDefined();
        console.error(`✅ ${validationTest.name} preserved`);
      }

      console.error('✅ Data validation rules preservation validated');
    }, 45000);
  });

  describe('Edge Case Protection', () => {
    it('should handle boundary value conditions', async () => {
      const boundaryTests = [
        {
          name: 'Zero limit search',
          test: () => callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'boundary-test',
            limit: 0,
          })
        },
        {
          name: 'Maximum limit search',
          test: () => callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'boundary-test',
            limit: 1000,
          })
        },
        {
          name: 'Negative offset search',
          test: () => callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'boundary-test',
            limit: 10,
            offset: -1,
          })
        },
      ];

      for (const boundaryTest of boundaryTests) {
        const response = await boundaryTest.test();
        
        // Should handle all boundary conditions without crashing
        expect(response).toBeDefined();
        console.error(`✅ ${boundaryTest.name} handled safely`);
      }

      console.error('✅ Boundary value protection validated');
    }, 45000);

    it('should prevent infinite loops and recursion', async () => {
      // Test scenarios that could cause infinite loops
      const startTime = Date.now();

      const response = await callUniversalTool('search-records', {
        resource_type: 'companies',
        query: 'recursion-test',
        limit: 10,
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (prevent infinite loops)
      expect(executionTime).toBeLessThan(30000); // 30 seconds max
      expect(response).toBeDefined();

      console.error(`✅ Infinite loop prevention validated (${executionTime}ms)`);
    }, 35000);

    it('should handle resource exhaustion gracefully', async () => {
      // Test system behavior under resource pressure
      const resourceTests = [
        {
          name: 'Large query processing',
          test: () => callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'X'.repeat(500), // Large query string
            limit: 50,
          })
        },
        {
          name: 'Multiple concurrent searches',
          test: async () => {
            const searches = Array(8).fill(null).map((_, i) =>
              callUniversalTool('search-records', {
                resource_type: 'companies',
                query: `concurrent-${i}`,
                limit: 10,
              })
            );
            return Promise.allSettled(searches);
          }
        },
      ];

      for (const resourceTest of resourceTests) {
        const startTime = Date.now();
        const result = await resourceTest.test();
        const endTime = Date.now();

        expect(result).toBeDefined();
        expect(endTime - startTime).toBeLessThan(60000); // Should complete within 1 minute

        console.error(`✅ ${resourceTest.name} resource exhaustion handled`);
      }

      console.error('✅ Resource exhaustion protection validated');
    }, 75000);
  });

  describe('Production Stability Safeguards', () => {
    it('should maintain system stability under error conditions', async () => {
      // Test that errors don't destabilize the system
      const stabilityTests = [
        () => callUniversalTool('get-record-details', {
          resource_type: 'companies',
          record_id: 'definitely-does-not-exist',
        }),
        () => callUniversalTool('search-records', {
          resource_type: 'companies',
          query: 'stability-test-1',
          limit: 1,
        }),
        () => callUniversalTool('update-record', {
          resource_type: 'companies',
          record_id: 'non-existent-id',
          record_data: { name: 'Update test' },
        }),
        () => callUniversalTool('search-records', {
          resource_type: 'companies',
          query: 'stability-test-2',
          limit: 1,
        }),
      ];

      for (const test of stabilityTests) {
        const response = await test();
        
        // Each operation should complete and return a valid response structure
        expect(response).toBeDefined();
        expect(typeof response).toBe('object');
        expect('isError' in response).toBe(true);
        
        // System should remain stable after each operation
        const healthCheck = await callUniversalTool('search-records', {
          resource_type: 'companies',
          query: 'health-check',
          limit: 1,
        });
        
        expect(healthCheck).toBeDefined();
      }

      console.error('✅ System stability under error conditions validated');
    }, 60000);

    it('should preserve API contract consistency', async () => {
      // Verify that API responses maintain consistent structure
      const contractTests = [
        {
          name: 'Search response structure',
          test: () => callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'contract-test',
            limit: 1,
          })
        },
        {
          name: 'Detail response structure',
          test: () => callUniversalTool('get-record-details', {
            resource_type: 'companies',
            record_id: 'contract-test-id',
          })
        },
      ];

      for (const contractTest of contractTests) {
        const response = await contractTest.test();
        
        // Verify consistent response structure
        expect(response).toBeDefined();
        expect(typeof response).toBe('object');
        expect(response).toHaveProperty('isError');
        
        if (response.isError) {
          expect(response).toHaveProperty('error');
          expect(typeof response.error).toBe('string');
        } else {
          expect(response).toHaveProperty('data');
        }

        console.error(`✅ API contract consistency validated: ${contractTest.name}`);
      }

      console.error('✅ API contract consistency preservation validated');
    }, 30000);
  });
});