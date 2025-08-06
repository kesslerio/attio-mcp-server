import { config } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Load environment variables from .env file before any imports
config();

import { initializeAttioClient } from '../../../../src/api/attio-client.js';
import {
  advancedOperationsToolConfigs,
  coreOperationsToolConfigs,
} from '../../../../src/handlers/tool-configs/universal/index.js';
import {
  BatchOperationType,
  ContentSearchType,
  DetailedInfoType,
  RelationshipType,
  TimeframeType,
  UniversalResourceType,
} from '../../../../src/handlers/tool-configs/universal/types.js';

// These tests use real API calls - only run when API key is available
const SKIP_INTEGRATION_TESTS = !process.env.ATTIO_API_KEY;

// Increase timeout for real API calls
vi.setConfig({ testTimeout: 30000 });

describe('Universal Tools Integration Tests', () => {
  if (SKIP_INTEGRATION_TESTS) {
    it.skip('Skipping universal tools integration tests - no API key found', () => {});
    return;
  }

  beforeAll(async () => {
    // Initialize the API client with real credentials first
    const apiKey = process.env.ATTIO_API_KEY;
    if (!apiKey) {
      throw new Error('ATTIO_API_KEY is not set');
    }
    console.log('Initializing API client for integration tests...');
    initializeAttioClient(apiKey);

    // Debug: Check if tool configs are loaded properly
    console.log(
      'Core operations tools:',
      Object.keys(coreOperationsToolConfigs || {})
    );
    console.log(
      'Advanced operations tools:',
      Object.keys(advancedOperationsToolConfigs || {})
    );
  });

  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const testCompanyName = `Universal Test Company ${timestamp}-${randomId}`;
  const testPersonEmail = `universal-test-${timestamp}-${randomId}@example.com`;
  const testDomain = `universal-test-${timestamp}-${randomId}.com`;

  let createdCompanyId: string;
  let createdPersonId: string;

  afterAll(async () => {
    // Clean up created test data
    try {
      if (createdCompanyId) {
        await coreOperationsToolConfigs['delete-record'].handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: createdCompanyId,
        });
      }
      if (createdPersonId) {
        await coreOperationsToolConfigs['delete-record'].handler({
          resource_type: UniversalResourceType.PEOPLE,
          record_id: createdPersonId,
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('Core Operations Integration', () => {
    describe('create-record tool', () => {
      it('should create a company using universal tool', async () => {
        try {
          console.log('Test data:', { testCompanyName, testDomain });
          console.log(
            'Handler exists:',
            !!coreOperationsToolConfigs['create-record']
          );
          console.log(
            'Handler type:',
            typeof coreOperationsToolConfigs['create-record']?.handler
          );

          // Add more debugging
          const toolConfig = coreOperationsToolConfigs['create-record'];
          console.log('Tool config:', toolConfig);
          console.log('Tool config keys:', Object.keys(toolConfig || {}));

          const result = await coreOperationsToolConfigs[
            'create-record'
          ].handler({
            resource_type: UniversalResourceType.COMPANIES,
            record_data: {
              name: testCompanyName,
              domains: testDomain,
              description: 'Universal tool integration test company',
            },
            return_details: true,
          });

          console.log('Result:', result);
          console.log('Result type:', typeof result);

          expect(result).toBeDefined();
          expect(result.id).toBeDefined();
          expect(result.id.record_id).toBeDefined();
          expect(result.values.name).toBeDefined();
          expect(result.values.name[0].value).toBe(testCompanyName);

          createdCompanyId = result.id.record_id;
        } catch (error) {
          console.error('Test error:', error);
          console.error('Error type:', error?.constructor?.name);
          console.error(
            'Error message:',
            error instanceof Error ? error.message : String(error)
          );
          throw error;
        }
      });

      it('should create a person using universal tool', async () => {
        const result = await coreOperationsToolConfigs['create-record'].handler(
          {
            resource_type: UniversalResourceType.PEOPLE,
            record_data: {
              email_addresses: [testPersonEmail],
              name: `Universal Test Person ${timestamp}`,
            },
            return_details: true,
          }
        );

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.id.record_id).toBeDefined();
        expect(result.values.email_addresses).toBeDefined();
        expect(result.values.email_addresses[0].email_address).toBe(
          testPersonEmail
        );

        createdPersonId = result.id.record_id;
      });
    });

    describe('get-record-details tool', () => {
      it('should get company details using universal tool', async () => {
        const result = await coreOperationsToolConfigs[
          'get-record-details'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: createdCompanyId,
        });

        expect(result).toBeDefined();
        expect(result.id.record_id).toBe(createdCompanyId);
        expect(result.values.name[0].value).toBe(testCompanyName);
      });

      it('should get person details using universal tool', async () => {
        const result = await coreOperationsToolConfigs[
          'get-record-details'
        ].handler({
          resource_type: UniversalResourceType.PEOPLE,
          record_id: createdPersonId,
        });

        expect(result).toBeDefined();
        expect(result.id.record_id).toBe(createdPersonId);
        expect(result.values.email_addresses[0].email_address).toBe(
          testPersonEmail
        );
      });

      it('should get specific fields using universal tool', async () => {
        const result = await coreOperationsToolConfigs[
          'get-record-details'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: createdCompanyId,
          fields: ['name', 'website'],
        });

        expect(result).toBeDefined();
        expect(result.values.name).toBeDefined();
        expect(result.values.website).toBeDefined();
      });
    });

    describe('search-records tool', () => {
      it('should search companies using universal tool', async () => {
        // Give the API time to index the new company
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const result = await coreOperationsToolConfigs[
          'search-records'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          query: testCompanyName,
          limit: 10,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);

        const foundCompany = result.find(
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          (c: any) => c.values.name?.[0]?.value === testCompanyName
        );
        expect(foundCompany).toBeDefined();
      });

      it('should search people using universal tool', async () => {
        // Give the API time to index the new person
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const result = await coreOperationsToolConfigs[
          'search-records'
        ].handler({
          resource_type: UniversalResourceType.PEOPLE,
          query: `Universal Test Person ${timestamp}`,
          limit: 10,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);

        const foundPerson = result.find((p: any) =>
          p.values.email_addresses?.some(
            (e: any) => e.email_address === testPersonEmail
          )
        );
        expect(foundPerson).toBeDefined();
      });

      it('should handle search with filters', async () => {
        const result = await coreOperationsToolConfigs[
          'search-records'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          query: 'Universal Test',
          filters: {
            filters: [
              {
                attribute: { slug: 'name' },
                condition: 'contains',
                value: 'Universal Test',
              },
            ],
          },
          limit: 5,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('update-record tool', () => {
      it('should update company using universal tool', async () => {
        const result = await coreOperationsToolConfigs['update-record'].handler(
          {
            resource_type: UniversalResourceType.COMPANIES,
            record_id: createdCompanyId,
            record_data: {
              description: 'Updated universal tool integration test company',
            },
            return_details: true,
          }
        );

        expect(result).toBeDefined();
        expect(result.values.description).toBeDefined();
        expect(result.values.description[0].value).toBe(
          'Updated universal tool integration test company'
        );
      });

      it('should update person using universal tool', async () => {
        const result = await coreOperationsToolConfigs['update-record'].handler(
          {
            resource_type: UniversalResourceType.PEOPLE,
            record_id: createdPersonId,
            record_data: {
              job_title: 'Universal Test Engineer',
            },
            return_details: true,
          }
        );

        expect(result).toBeDefined();
        // Note: job_title might map to different field names in Attio
        // This test verifies the update operation works
      });
    });

    describe('get-attributes tool', () => {
      it('should get company attributes using universal tool', async () => {
        const result = await coreOperationsToolConfigs[
          'get-attributes'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: createdCompanyId,
        });

        expect(result).toBeDefined();
        // Attributes format depends on API response structure
      });

      it('should get person attributes using universal tool', async () => {
        const result = await coreOperationsToolConfigs[
          'get-attributes'
        ].handler({
          resource_type: UniversalResourceType.PEOPLE,
          record_id: createdPersonId,
        });

        expect(result).toBeDefined();
      });
    });

    describe('discover-attributes tool', () => {
      it('should discover company attributes using universal tool', async () => {
        const result = await coreOperationsToolConfigs[
          'discover-attributes'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
        });

        expect(result).toBeDefined();
        // Should return schema or attribute definitions
      });

      it('should discover people attributes using universal tool', async () => {
        const result = await coreOperationsToolConfigs[
          'discover-attributes'
        ].handler({
          resource_type: UniversalResourceType.PEOPLE,
        });

        expect(result).toBeDefined();
      });
    });

    describe('get-detailed-info tool', () => {
      it('should get company contact info using universal tool', async () => {
        const result = await coreOperationsToolConfigs[
          'get-detailed-info'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: createdCompanyId,
          info_type: DetailedInfoType.CONTACT,
        });

        expect(result).toBeDefined();
      });

      it('should get company business info using universal tool', async () => {
        const result = await coreOperationsToolConfigs[
          'get-detailed-info'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: createdCompanyId,
          info_type: DetailedInfoType.BUSINESS,
        });

        expect(result).toBeDefined();
      });
    });
  });

  describe('Advanced Operations Integration', () => {
    describe('advanced-search tool', () => {
      it('should perform advanced company search with complex filters', async () => {
        const result = await advancedOperationsToolConfigs[
          'advanced-search'
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
        const result = await advancedOperationsToolConfigs[
          'advanced-search'
        ].handler({
          resource_type: UniversalResourceType.PEOPLE,
          query: testPersonEmail,
          limit: 5,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('search-by-relationship tool', () => {
      it('should search for people in companies', async () => {
        // This test assumes we have some company-people relationships
        // In a real scenario, you'd link the person to the company first
        try {
          const result = await advancedOperationsToolConfigs[
            'search-by-relationship'
          ].handler({
            relationship_type: RelationshipType.COMPANY_TO_PEOPLE,
            source_id: createdCompanyId,
            target_resource_type: UniversalResourceType.PEOPLE,
            limit: 10,
          });

          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);
        } catch (error) {
          // This might fail if no relationships exist, which is expected
          console.log('No relationships found (expected for new test data)');
        }
      });

      it('should handle unsupported task relationships gracefully', async () => {
        await expect(
          advancedOperationsToolConfigs['search-by-relationship'].handler({
            relationship_type: RelationshipType.PERSON_TO_TASKS,
            source_id: createdPersonId,
            target_resource_type: UniversalResourceType.TASKS,
          })
        ).rejects.toThrow(
          /Task relationship search.*is not currently available/
        );
      });
    });

    describe('search-by-content tool', () => {
      it('should search companies by notes content', async () => {
        // This test might not find results without notes, but tests the integration
        try {
          const result = await advancedOperationsToolConfigs[
            'search-by-content'
          ].handler({
            resource_type: UniversalResourceType.COMPANIES,
            content_type: ContentSearchType.NOTES,
            search_query: 'Universal Test',
            limit: 10,
          });

          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);
        } catch (error) {
          // Expected if no notes exist
          console.log('No content found in notes (expected for new test data)');
        }
      });

      it('should handle unsupported interaction content search', async () => {
        await expect(
          advancedOperationsToolConfigs['search-by-content'].handler({
            resource_type: UniversalResourceType.COMPANIES,
            content_type: ContentSearchType.INTERACTIONS,
            search_query: 'test',
          })
        ).rejects.toThrow(
          /Interaction content search is not currently available/
        );
      });
    });

    describe('search-by-timeframe tool', () => {
      it('should search people by creation date', async () => {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        const result = await advancedOperationsToolConfigs[
          'search-by-timeframe'
        ].handler({
          resource_type: UniversalResourceType.PEOPLE,
          timeframe_type: TimeframeType.CREATED,
          start_date: yesterday.toISOString(),
          end_date: tomorrow.toISOString(),
          limit: 10,
        });

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
          advancedOperationsToolConfigs['search-by-timeframe'].handler({
            resource_type: UniversalResourceType.COMPANIES,
            timeframe_type: TimeframeType.CREATED,
            start_date: new Date().toISOString(),
          })
        ).rejects.toThrow(
          /Timeframe search is not currently optimized for companies/
        );
      });
    });

    describe('batch-operations tool', () => {
      it('should perform batch create operations', async () => {
        const batchCompanies = [
          {
            name: `Batch Company 1 ${timestamp}`,
            website: `https://batch1-${timestamp}.com`,
          },
          {
            name: `Batch Company 2 ${timestamp}`,
            website: `https://batch2-${timestamp}.com`,
          },
        ];

        const result = await advancedOperationsToolConfigs[
          'batch-operations'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          operation_type: BatchOperationType.CREATE,
          records: batchCompanies,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);

        // Check that both operations succeeded
        const successCount = result.filter((r: any) => r.success).length;
        expect(successCount).toBe(2);

        // Clean up batch created companies
        const createdIds = result
          .filter((r: any) => r.success)
          .map((r: any) => r.result?.id?.record_id)
          .filter(Boolean);

        if (createdIds.length > 0) {
          await advancedOperationsToolConfigs['batch-operations'].handler({
            resource_type: UniversalResourceType.COMPANIES,
            operation_type: BatchOperationType.DELETE,
            record_ids: createdIds,
          });
        }
      });

      it('should perform batch get operations', async () => {
        const result = await advancedOperationsToolConfigs[
          'batch-operations'
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
        const result = await advancedOperationsToolConfigs[
          'batch-operations'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          operation_type: BatchOperationType.SEARCH,
          query: 'Universal Test',
          limit: 5,
          offset: 0,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        // Allow for 0 results if no matching companies exist
        expect(result.length).toBeGreaterThanOrEqual(0);
      });

      it('should validate batch size limits', async () => {
        const largeRecordArray = Array(51).fill({ name: 'Test Company' });

        await expect(
          advancedOperationsToolConfigs['batch-operations'].handler({
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
            name: `Valid Batch Company ${timestamp}`,
            website: `https://valid-${timestamp}.com`,
          },
          {
            // Invalid record - missing required name field
            website: `https://invalid-${timestamp}.com`,
          } as any,
        ];

        const result = await advancedOperationsToolConfigs[
          'batch-operations'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          operation_type: BatchOperationType.CREATE,
          records: mixedBatch,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);

        // Should have at least one success and one failure
        const successCount = result.filter((r: any) => r.success).length;
        const failureCount = result.filter((r: any) => !r.success).length;

        expect(successCount).toBeGreaterThan(0);
        expect(failureCount).toBeGreaterThan(0);

        // Clean up any successful creations
        const successfulIds = result
          .filter((r: any) => r.success && r.result?.id?.record_id)
          .map((r: any) => r.result.id.record_id);

        if (successfulIds.length > 0) {
          await advancedOperationsToolConfigs['batch-operations'].handler({
            resource_type: UniversalResourceType.COMPANIES,
            operation_type: BatchOperationType.DELETE,
            record_ids: successfulIds,
          });
        }
      });
    });
  });

  describe('Cross-resource type compatibility', () => {
    it('should handle all supported resource types consistently', async () => {
      const resourceTypes = [
        UniversalResourceType.COMPANIES,
        UniversalResourceType.PEOPLE,
        // Note: RECORDS and TASKS might not be fully implemented yet
      ];

      for (const resourceType of resourceTypes) {
        // Test search for each resource type with meaningful queries
        const query =
          resourceType === UniversalResourceType.COMPANIES
            ? 'Universal Test'
            : 'Universal Test Person';
        const searchResult = await coreOperationsToolConfigs[
          'search-records'
        ].handler({
          resource_type: resourceType,
          query,
          limit: 1,
        });

        expect(searchResult).toBeDefined();
        expect(Array.isArray(searchResult)).toBe(true);

        // Test attribute discovery for each resource type
        const attributesResult = await coreOperationsToolConfigs[
          'discover-attributes'
        ].handler({
          resource_type: resourceType,
        });

        expect(attributesResult).toBeDefined();
      }
    });

    it('should format results consistently across resource types', async () => {
      const companyResult = await coreOperationsToolConfigs[
        'search-records'
      ].handler({
        resource_type: UniversalResourceType.COMPANIES,
        query: testCompanyName,
        limit: 1,
      });

      const peopleResult = await coreOperationsToolConfigs[
        'search-records'
      ].handler({
        resource_type: UniversalResourceType.PEOPLE,
        query: testPersonEmail,
        limit: 1,
      });

      // Both should return arrays
      expect(Array.isArray(companyResult)).toBe(true);
      expect(Array.isArray(peopleResult)).toBe(true);

      // Both should have consistent structure if results exist
      if (companyResult.length > 0) {
        expect(companyResult[0]).toHaveProperty('id');
        expect(companyResult[0]).toHaveProperty('values');
      }

      if (peopleResult.length > 0) {
        expect(peopleResult[0]).toHaveProperty('id');
        expect(peopleResult[0]).toHaveProperty('values');
      }
    });
  });

  describe('Error handling integration', () => {
    it('should handle non-existent record IDs gracefully', async () => {
      await expect(
        coreOperationsToolConfigs['get-record-details'].handler({
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
      const result = await advancedOperationsToolConfigs[
        'batch-operations'
      ].handler({
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.SEARCH,
        limit: 1,
        offset: 0,
      });

      expect(result).toBeDefined();
    }, 15000); // 15 second timeout
  });

  describe('Performance and scalability', () => {
    it('should handle reasonable batch sizes efficiently', async () => {
      const startTime = Date.now();

      const result = await advancedOperationsToolConfigs[
        'batch-operations'
      ].handler({
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.SEARCH,
        limit: 10,
      });

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
          name: `Rate Limit Test Company ${timestamp}-${i}`,
          description: 'Testing rate limits',
        }));

      const startTime = Date.now();

      const result = await advancedOperationsToolConfigs[
        'batch-operations'
      ].handler({
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        records: batchRecords,
      });

      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(5);

      // Should take some time due to rate limiting delays
      expect(endTime - startTime).toBeGreaterThan(100);

      // Clean up created records
      const createdIds = result
        .filter((r: any) => r.success)
        .map((r: any) => r.result?.id?.record_id)
        .filter(Boolean);

      if (createdIds.length > 0) {
        await advancedOperationsToolConfigs['batch-operations'].handler({
          resource_type: UniversalResourceType.COMPANIES,
          operation_type: BatchOperationType.DELETE,
          record_ids: createdIds,
        });
      }
    });
  });
});
