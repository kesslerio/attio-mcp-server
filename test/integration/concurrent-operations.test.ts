import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import { initializeAttioClient } from '../../src/api/attio-client';

// These tests use real API calls - only run when API key is available

describe('Concurrent Operations - Integration Tests', () => {
  if (SKIP_INTEGRATION_TESTS) {
    it.skip('Skipping integration tests - no API key found', () => {});
    return;
  }

  const testCompanies: string[] = [];

  beforeAll(() => {
    // Initialize the Attio client with test API key
    initializeAttioClient(apiKey);
  });

  afterEach(async () => {
    // Cleanup: Delete any test companies created
    for (const companyId of testCompanies) {
      try {
        await deleteCompany(companyId);
      } catch (error: unknown) {
        // Ignore errors during cleanup
      }
    }
    testCompanies.length = 0;
  });

  describe('Concurrent Updates', () => {
    it('should handle concurrent attribute updates', async () => {
      // Create a test company
        name: `Concurrent Update Test ${Date.now()}`,
        counter: 0,
        description: 'Initial description',
      });
      testCompanies.push(company.id.record_id);

      // Define concurrent updates
        { attribute: 'website', value: 'https://concurrent1.com' },
        { attribute: 'industry', value: 'Technology' },
        { attribute: 'description', value: 'Updated description' },
        { attribute: 'employee_range', value: '11-50' },
        { attribute: 'foundation_date', value: '2024-01-01' },
      ];

      // Execute updates concurrently
        updateCompanyAttribute(
          company.id.record_id,
          update.attribute,
          update.value
        )
      );


      // Check results

      console.log(
        `Concurrent updates: ${successful.length} succeeded, ${failed.length} failed`
      );

      // Verify final state

      // At least some updates should have succeeded
      expect(successful.length).toBeGreaterThan(0);

      // Check if any of the expected values are present
        if (Array.isArray(value) && value.length > 0) {
          return (
            value[0].value === update.value ||
            value[0].option?.title === update.value
          );
        }
        return false;
      });

      expect(hasExpectedValues).toBe(true);
    });

    it('should handle race conditions in full company updates', async () => {
        name: `Race Condition Test ${Date.now()}`,
        version: 1,
      });
      testCompanies.push(company.id.record_id);

      // Simulate race condition with conflicting updates
        website: 'https://version1.com',
        description: 'Version 1 description',
        industry: 'Finance',
      };

        website: 'https://version2.com',
        description: 'Version 2 description',
        industry: 'Healthcare',
      };

      // Execute conflicting updates concurrently
      const [result1, result2] = await Promise.allSettled([
        updateCompany(company.id.record_id, update1),
        updateCompany(company.id.record_id, update2),
      ]);

      // Both might succeed (last write wins) or one might fail
        (r) => r.status === 'fulfilled'
      ).length;
      expect(successCount).toBeGreaterThan(0);

      // Verify final state

      // Website should be one of the two values
      expect([update1.website, update2.website]).toContain(finalWebsite);
    });
  });

  describe('Concurrent Creates and Deletes', () => {
    it('should handle concurrent company creation', async () => {

      // Create multiple companies concurrently
        .fill(0)
        .map((_, i) =>
          createCompany({
            name: `${baseName} - ${i}`,
            unique_id: `${Date.now()}-${i}`,
          })
        );


      // Track created companies
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          testCompanies.push(result.value.id.record_id);
        }
      });

      expect(successful.length).toBe(numCompanies);
    });

    it('should handle create and immediate delete race condition', async () => {
        name: `Delete Race Test ${Date.now()}`,
      });

      // Immediately try to update and delete concurrently
      const [updateResult, deleteResult] = await Promise.allSettled([
        updateCompanyAttribute(
          company.id.record_id,
          'description',
          'Updated before delete'
        ),
        deleteCompany(company.id.record_id),
      ]);

      // One should succeed, one might fail
        (r) => r.status === 'fulfilled'
      ).length;
      expect(successCount).toBeGreaterThan(0);

      // If delete succeeded, company should not exist
      if (deleteResult.status === 'fulfilled') {
        await expect(getCompanyDetails(company.id.record_id)).rejects.toThrow();
      } else {
        // If update succeeded, add to cleanup
        testCompanies.push(company.id.record_id);
      }
    });
  });

  describe('Concurrent Searches and Updates', () => {
    it('should handle searches during updates', async () => {

      // Create test companies
        createCompany({ name: `${uniquePrefix}_A` }),
        createCompany({ name: `${uniquePrefix}_B` }),
        createCompany({ name: `${uniquePrefix}_C` }),
      ]);

      companies.forEach((c) => testCompanies.push(c.id.record_id));

      // Perform concurrent searches and updates
        searchCompanies(uniquePrefix),
        updateCompanyAttribute(
          companies[0].id.record_id,
          'description',
          'Updated A'
        ),
        searchCompanies(uniquePrefix),
        updateCompanyAttribute(
          companies[1].id.record_id,
          'description',
          'Updated B'
        ),
        searchCompanies(uniquePrefix),
      ];


      // All operations should complete successfully
      expect(successful.length).toBe(operations.length);

      // Extract search results
        .filter((r, i) => [0, 2, 4].includes(i) && r.status === 'fulfilled')
        .map((r) => (r as any).value);

      // All searches should find the companies
      searchResults.forEach((result) => {
        expect(result.length).toBeGreaterThanOrEqual(companies.length);
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle high volume of concurrent operations', async () => {
        name: `Stress Test Company ${Date.now()}`,
      });
      testCompanies.push(company.id.record_id);


      // Mix of different operations
      for (let i = 0; i < operationCount; i++) {
        switch (operationType) {
          case 0:
            operations.push(
              updateCompanyAttribute(
                company.id.record_id,
                'description',
                `Update ${i}`
              )
            );
            break;
          case 1:
            operations.push(getCompanyDetails(company.id.record_id));
            break;
          case 2:
            operations.push(
              updateCompany(company.id.record_id, { counter: i })
            );
            break;
          case 3:
            operations.push(searchCompanies(company.values?.name || ''));
            break;
        }
      }



      console.log(`Stress test completed in ${duration}ms`);
      console.log(`${successful.length} succeeded, ${failed.length} failed`);

      // Most operations should succeed
      expect(successful.length).toBeGreaterThan(operationCount * 0.7);
    });
  });
});
