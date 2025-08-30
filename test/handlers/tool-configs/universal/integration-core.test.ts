import { config } from 'dotenv';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { coreOperationsToolConfigs } from '../../../../src/handlers/tool-configs/universal/index.js';
import { coreOperationsToolConfigs } from '../../../../src/handlers/tool-configs/universal/index.js';

import { coreOperationsToolConfigs } from '../../../../src/handlers/tool-configs/universal/index.js';
import {
  UniversalResourceType,
  DetailedInfoType,
} from '../../../../src/handlers/tool-configs/universal/types.js';
import {
  IntegrationTestSetup,
  IntegrationTestDataManager,
  integrationConfig,
  integrationUtils,
} from './helpers/index.js';

// These tests use real API calls - only run when API key is available

// Increase timeout for real API calls
vi.setConfig({ testTimeout: 30000 });

describe('Universal Tools Core Integration Tests', () => {
  if (SKIP_INTEGRATION_TESTS) {
    it.skip(integrationConfig.getSkipMessage('integration'), () => {});
    return;
  }



  let createdCompanyId: string;
  let createdPersonId: string;

  beforeAll(async () => {
    // Initialize the API client and verify tool configurations
    await integrationSetup.initializeApiClient();

    console.log('Core operations tools:', toolConfigs.coreOperations);
    integrationConfig.logEnvironment();
  });

  afterAll(async () => {
    // Clean up created test data using the data manager
    if (createdCompanyId) {
      dataManager.trackCreatedRecord(
        UniversalResourceType.COMPANIES,
        createdCompanyId
      );
    }
    if (createdPersonId) {
      dataManager.trackCreatedRecord(
        UniversalResourceType.PEOPLE,
        createdPersonId
      );
    }

    try {
      await dataManager.cleanupTrackedRecords(coreOperationsToolConfigs);
    } catch (error: unknown) {
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
          console.log('Tool config:', toolConfig);
          console.log('Tool config keys:', Object.keys(toolConfig || {}));

            'create-record'
          ].handler({
            resource_type: UniversalResourceType.COMPANIES,
            record_data: {
              name: testCompanyName,
              website: `https://${testDomain}`,
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
        } catch (error: unknown) {
          console.error('Test error:', error);
          console.error('Error type:', error?.constructor?.name);
          console.error('Error message:', error?.message);
          throw error;
        }
      });

      it('should create a person using universal tool', async () => {
          {
            resource_type: UniversalResourceType.PEOPLE,
            record_data: {
              email_addresses: [testPersonEmail],
              name: `Universal Test Person ${testIdentifiers.timestamp}`,
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
        // Give the API time to index the new company using helper
        await integrationUtils.waitForIndexing(2000);

          'search-records'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          query: testCompanyName,
          limit: 10,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);

          (c: unknown) => c.values.name?.[0]?.value === testCompanyName
        );
        expect(foundCompany).toBeDefined();
      });

      it('should search people using universal tool', async () => {
        // Give the API time to index the new person using helper
        await integrationUtils.waitForIndexing(2000);

          'search-records'
        ].handler({
          resource_type: UniversalResourceType.PEOPLE,
          query: `Universal Test Person ${testIdentifiers.timestamp}`,
          limit: 10,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);

          p.values.email_addresses?.some(
            (e: unknown) => e.email_address === testPersonEmail
          )
        );
        expect(foundPerson).toBeDefined();
      });

      it('should handle search with filters', async () => {
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
          {
            resource_type: UniversalResourceType.COMPANIES,
            record_id: createdCompanyId,
            record_data: {
              name: `${testCompanyName} (Updated)`,
            },
            return_details: true,
          }
        );

        expect(result).toBeDefined();
        expect(result.values.name).toBeDefined();
        expect(result.values.name[0].value).toBe(
          `${testCompanyName} (Updated)`
        );
      });

      it('should update person using universal tool', async () => {
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
          'get-attributes'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: createdCompanyId,
        });

        expect(result).toBeDefined();
        // Attributes format depends on API response structure
      });

      it('should get person attributes using universal tool', async () => {
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
          'discover-attributes'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
        });

        expect(result).toBeDefined();
        // Should return schema or attribute definitions
      });

      it('should discover people attributes using universal tool', async () => {
          'discover-attributes'
        ].handler({
          resource_type: UniversalResourceType.PEOPLE,
        });

        expect(result).toBeDefined();
      });
    });

    describe('get-detailed-info tool', () => {
      it('should get company contact info using universal tool', async () => {
          'get-detailed-info'
        ].handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: createdCompanyId,
          info_type: DetailedInfoType.CONTACT,
        });

        expect(result).toBeDefined();
      });

      it('should get company business info using universal tool', async () => {
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

  describe('Cross-resource type compatibility', () => {
    it('should handle all supported resource types consistently', async () => {
        UniversalResourceType.COMPANIES,
        UniversalResourceType.PEOPLE,
        // Note: RECORDS and TASKS might not be fully implemented yet
      ];

      for (const resourceType of resourceTypes) {
        // Test search for each resource type with meaningful queries
          resourceType === UniversalResourceType.COMPANIES
            ? 'Universal Test'
            : 'Universal Test Person';
          'search-records'
        ].handler({
          resource_type: resourceType,
          query,
          limit: 1,
        });

        expect(searchResult).toBeDefined();
        expect(Array.isArray(searchResult)).toBe(true);

        // Test attribute discovery for each resource type
          'discover-attributes'
        ].handler({
          resource_type: resourceType,
        });

        expect(attributesResult).toBeDefined();
      }
    });

    it('should format results consistently across resource types', async () => {
        'search-records'
      ].handler({
        resource_type: UniversalResourceType.COMPANIES,
        query: testCompanyName,
        limit: 1,
      });

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
});
