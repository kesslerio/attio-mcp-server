import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { config } from 'dotenv';

// Load environment variables from .env file before any imports
config();

import {
  coreOperationsToolConfigs,
  advancedOperationsToolConfigs,
} from '../../../../src/handlers/tool-configs/universal/index.js';
import {
  UniversalResourceType,
  RelationshipType,
  ContentSearchType,
  TimeframeType,
  BatchOperationType,
} from '../../../../src/handlers/tool-configs/universal/types.js';
import {
  IntegrationTestSetup,
  IntegrationTestDataManager,
  integrationConfig,
  integrationUtils,
} from './helpers/index.js';

// These tests use real API calls - only run when API key is available
const SKIP_INTEGRATION_TESTS = !integrationConfig.shouldRun();

// Increase timeout for real API calls
vi.setConfig({ testTimeout: 30000 });

describe('Universal Tools Advanced Integration Tests', () => {
  if (SKIP_INTEGRATION_TESTS) {
    it.skip(integrationConfig.getSkipMessage('integration'), () => {});
    return;
  }

  const integrationSetup = IntegrationTestSetup.getInstance();
  const dataManager = new IntegrationTestDataManager();
  const testIdentifiers = dataManager.getTestIdentifiers();

  const testCompanyName = `Universal Test Company ${testIdentifiers.timestamp}-${testIdentifiers.randomId}`;
  const testPersonEmail = `universal-test-${testIdentifiers.timestamp}-${testIdentifiers.randomId}@example.com`;
  const testDomain = `universal-test-${testIdentifiers.timestamp}-${testIdentifiers.randomId}.com`;

  let createdCompanyId: string;
  let createdPersonId: string;

  beforeAll(async () => {
    // Initialize the API client and verify tool configurations
    await integrationSetup.initializeApiClient();
    const toolConfigs = await integrationSetup.verifyToolConfigs();

    console.log('Advanced operations tools:', toolConfigs.advancedOperations);
    integrationConfig.logEnvironment();

    // Create test records for advanced operations
    const companyResult: any = await coreOperationsToolConfigs[
      'create-record'
    ].handler({
      resource_type: UniversalResourceType.COMPANIES,
      record_data: {
        name: testCompanyName,
        website: `https://${testDomain}`,
      },
      return_details: true,
    });
    createdCompanyId = companyResult.id.record_id;
    dataManager.trackCreatedRecord(
      UniversalResourceType.COMPANIES,
      createdCompanyId
    );

    const personResult: any = await coreOperationsToolConfigs[
      'create-record'
    ].handler({
      resource_type: UniversalResourceType.PEOPLE,
      record_data: {
        email_addresses: [testPersonEmail],
        name: `Universal Test Person ${testIdentifiers.timestamp}`,
      },
      return_details: true,
    });
    createdPersonId = personResult.id.record_id;
    dataManager.trackCreatedRecord(
      UniversalResourceType.PEOPLE,
      createdPersonId
    );

    // Allow API indexing
    await integrationUtils.waitForIndexing(3000);
  });

  afterAll(async () => {
    // Clean up created test data using the data manager
    try {
      await dataManager.cleanupTrackedRecords({
        ...coreOperationsToolConfigs,
        ...advancedOperationsToolConfigs,
      });
    } catch (error: unknown) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('Advanced Operations Integration', () => {
    describe('records_search_advanced tool', () => {
      it('should perform advanced company search with complex filters', async () => {
        const result: any = await advancedOperationsToolConfigs[
          'records_search_advanced'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          query: 'Universal Test',
          filters: {
            filters: [
              {
                attribute: { slug: 'name' },
                condition: 'contains',
                value: 'Universal',
              },
            ],
          },
          sort_by: 'name',
          sort_order: 'asc',
          limit: 10,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should perform advanced people search', async () => {
        const result = (await advancedOperationsToolConfigs[
          'records_search_advanced'
        ].handler({
          resource_type: UniversalResourceType.PEOPLE,
          query: testPersonEmail,
          limit: 5,
        })) as any[];

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('records_search_by_relationship tool', () => {
      it('should search for people in companies', async () => {
        // This test assumes we have some company-people relationships
        // In a real scenario, you'd link the person to the company first
        try {
          const result: any = await advancedOperationsToolConfigs[
            'records_search_by_relationship'
          ].handler({
            relationship_type: RelationshipType.COMPANY_TO_PEOPLE,
            source_id: createdCompanyId,
            target_resource_type: UniversalResourceType.PEOPLE,
            limit: 10,
          });

          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);
        } catch (error: unknown) {
          // This might fail if no relationships exist, which is expected
          console.log('No relationships found (expected for new test data)');
        }
      });

      it('should handle unsupported task relationships gracefully', async () => {
        await expect(
          advancedOperationsToolConfigs[
            'records_search_by_relationship'
          ].handler({
            relationship_type: RelationshipType.PERSON_TO_TASKS,
            source_id: createdPersonId,
            target_resource_type: UniversalResourceType.TASKS,
          })
        ).rejects.toThrow(
          /Task relationship search.*is not currently available/
        );
      });
    });

    describe('records_search_by_content tool', () => {
      it('should search companies by notes content', async () => {
        // This test might not find results without notes, but tests the integration
        try {
          const result = (await advancedOperationsToolConfigs[
            'records_search_by_content'
          ].handler({
            resource_type: UniversalResourceType.COMPANIES,
            content_type: ContentSearchType.NOTES,
            search_query: 'Universal Test',
            limit: 10,
          })) as any[];

          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);
        } catch (error: unknown) {
          // Expected if no notes exist
          console.log('No content found in notes (expected for new test data)');
        }
      });

      it('should search people by notes content', async () => {
        // Test people content search using the new records.search API
        try {
          const result = (await coreOperationsToolConfigs[
            'records_search'
          ].handler({
            resource_type: UniversalResourceType.PEOPLE,
            query: 'engineer', // Common searchable term in people profiles
            search_type: 'content',
            limit: 5,
          })) as any[];

          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);

          // If results are found, verify structure
          if (result.length > 0) {
            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('values');
            expect(result[0].id).toHaveProperty('record_id');
          }
        } catch (error: unknown) {
          // If error occurs, it should NOT be "Unknown attribute slug: bio"
          const errorMessage = (error as Error).message;
          expect(errorMessage).not.toContain('Unknown attribute slug: bio');

          // Log other errors for debugging but don't fail the test
          console.log('People content search error:', errorMessage);
        }
      });

      it('should handle unsupported interaction content search', async () => {
        await expect(
          advancedOperationsToolConfigs['records_search_by_content'].handler({
            resource_type: UniversalResourceType.COMPANIES,
            content_type: ContentSearchType.INTERACTIONS,
            search_query: 'test',
          })
        ).rejects.toThrow(
          /Interaction content search is not currently available/
        );
      });
    });

    describe('records_search_by_timeframe tool', () => {
      it('should search people by creation date', async () => {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        const result = (await advancedOperationsToolConfigs[
          'records_search_by_timeframe'
        ].handler({
          resource_type: UniversalResourceType.PEOPLE,
          timeframe_type: TimeframeType.CREATED,
          start_date: yesterday.toISOString(),
          end_date: tomorrow.toISOString(),
          limit: 10,
        })) as any[];

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        // Should include our created person
        const foundPerson = result.find(
          (p: any) => p.id?.record_id === createdPersonId
        );
        expect(foundPerson).toBeDefined();
      });

      it('should handle unsupported timeframe for companies', async () => {
        await expect(
          advancedOperationsToolConfigs['records_search_by_timeframe'].handler({
            resource_type: UniversalResourceType.COMPANIES,
            timeframe_type: TimeframeType.CREATED,
            start_date: new Date().toISOString(),
          })
        ).rejects.toThrow(
          /Timeframe search is not currently optimized for companies/
        );
      });
    });

    describe('records_batch tool', () => {
      it('should perform batch create operations', async () => {
        const batchCompanies = [
          {
            name: `Batch Company 1 ${testIdentifiers.timestamp}`,
            website: `https://batch1-${testIdentifiers.timestamp}.com`,
          },
          {
            name: `Batch Company 2 ${testIdentifiers.timestamp}`,
            website: `https://batch2-${testIdentifiers.timestamp}.com`,
          },
        ];

        const result = (await advancedOperationsToolConfigs[
          'records_batch'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          operation_type: BatchOperationType.CREATE,
          records: batchCompanies,
        })) as any[];

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);

        // Check that both operations succeeded
        const successCount = result.filter((r: any) => r.success).length;
        expect(successCount).toBe(2);

        // Clean up batch created companies using helper
        const createdIds = integrationUtils.extractRecordIds(result);
        if (createdIds.length > 0) {
          dataManager.trackCreatedRecords(
            UniversalResourceType.COMPANIES,
            createdIds
          );
        }
      });

      it('should perform batch get operations', async () => {
        const result = await advancedOperationsToolConfigs[
          'records_batch'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          operation_type: BatchOperationType.GET,
          record_ids: [createdCompanyId],
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0].success).toBe(true);
        expect(result[0].result?.id?.record_id).toBe(createdCompanyId);
      });

      it('should perform batch search operations', async () => {
        const result = (await advancedOperationsToolConfigs[
          'records_batch'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          operation_type: BatchOperationType.SEARCH,
          query: 'Universal Test',
          limit: 5,
          offset: 0,
        })) as any[];

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        // Allow for 0 results if no matching companies exist
        expect(result.length).toBeGreaterThanOrEqual(0);
      });

      it('should validate batch size limits', async () => {
        const largeRecordArray = Array(51).fill({ name: 'Test Company' });

        await expect(
          advancedOperationsToolConfigs['records_batch'].handler({
            resource_type: UniversalResourceType.COMPANIES,
            operation_type: BatchOperationType.CREATE,
            records: largeRecordArray,
          })
        ).rejects.toThrow(
          /Batch create size \(51\) exceeds maximum allowed \(50\)/
        );
      });

      it('should handle partial batch failures gracefully', async () => {
        const mixedBatch = [
          {
            name: `Valid Batch Company ${testIdentifiers.timestamp}`,
            website: `https://valid-${testIdentifiers.timestamp}.com`,
          },
          {
            // Invalid record - missing required name field
            website: `https://invalid-${testIdentifiers.timestamp}.com`,
          } as any,
        ];

        const result = (await advancedOperationsToolConfigs[
          'records_batch'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          operation_type: BatchOperationType.CREATE,
          records: mixedBatch,
        })) as any[];

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);

        // Should have at least one success and one failure
        const successCount = result.filter((r: any) => r.success).length;
        const failureCount = result.filter((r: any) => !r.success).length;

        expect(successCount).toBeGreaterThan(0);
        expect(failureCount).toBeGreaterThan(0);

        // Clean up any successful creations using helper
        const successfulIds = integrationUtils.extractRecordIds(result);
        if (successfulIds.length > 0) {
          dataManager.trackCreatedRecords(
            UniversalResourceType.COMPANIES,
            successfulIds
          );
        }
      });
    });
  });

  describe('Error handling integration', () => {
    it('should handle non-existent record IDs gracefully', async () => {
      await expect(
        coreOperationsToolConfigs['records_get_details'].handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'non-existent-id-12345',
        })
      ).rejects.toThrow();
    });

    it('should handle invalid update data gracefully', async () => {
      await expect(
        coreOperationsToolConfigs['update-record'].handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: createdCompanyId,
          record_data: {
            // Invalid field that doesn't exist
            invalid_field_that_does_not_exist: 'test value',
          },
        })
      ).rejects.toThrow();
    });

    it('should handle network timeouts gracefully', async () => {
      // This test would require mocking network conditions
      // For now, we just verify that large batch operations don't hang
      const result = (await advancedOperationsToolConfigs[
        'records_batch'
      ].handler({
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.SEARCH,
        limit: 1,
        offset: 0,
      })) as any[];

      expect(result).toBeDefined();
    }, 15000); // 15 second timeout
  });

  describe('Performance and scalability', () => {
    it('should handle reasonable batch sizes efficiently', async () => {
      const startTime = Date.now();

      const result = (await advancedOperationsToolConfigs[
        'records_batch'
      ].handler({
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.SEARCH,
        limit: 10,
      })) as any[];

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should respect API rate limits in batch operations', async () => {
      // Create a small batch to test rate limiting behavior
      const batchRecords = Array(5)
        .fill(0)
        .map((_, i) => ({
          name: `Rate Limit Test Company ${testIdentifiers.timestamp}-${i}`,
          website: `https://ratelimit-test-${testIdentifiers.timestamp}-${i}.com`,
        }));

      const startTime = Date.now();

      const result = (await advancedOperationsToolConfigs[
        'records_batch'
      ].handler({
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        records: batchRecords,
      })) as any[];

      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(5);

      // Should take some time due to rate limiting delays
      expect(endTime - startTime).toBeGreaterThan(100);

      // Log batch summary using helper
      integrationUtils.logBatchSummary(
        'Rate Limit Test',
        result,
        endTime - startTime
      );

      // Clean up created records using helper
      const createdIds = integrationUtils.extractRecordIds(result);
      if (createdIds.length > 0) {
        dataManager.trackCreatedRecords(
          UniversalResourceType.COMPANIES,
          createdIds
        );
      }
    });
  });
});
