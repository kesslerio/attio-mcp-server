/**
 * IT-001: Batch company operations
 *
 * Validates create, update, and cleanup workflows for company batch operations
 * using the live Attio API. Requires ATTIO_API_KEY unless integration tests are
 * explicitly skipped via SKIP_INTEGRATION_TESTS=true.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  batchCreateCompanies,
  batchUpdateCompanies,
  batchDeleteCompanies,
} from '@/objects/batch-companies.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

const runIntegrationTests = shouldRunIntegrationTests();

// Test configuration
const TEST_PREFIX = `test_batch_${Date.now().toString().slice(-6)}`;
const TEST_COMPANIES = [
  {
    name: `${TEST_PREFIX}_Company1`,
    industry: 'Initial Industry',
    description: 'Test company 1',
  },
  {
    name: `${TEST_PREFIX}_Company2`,
    industry: 'Initial Industry',
    description: 'Test company 2',
  },
  {
    name: `${TEST_PREFIX}_Company3`,
    industry: 'Initial Industry',
    description: 'Test company 3',
  },
];

describe.skipIf(!runIntegrationTests)(
  'IT-001: Batch company operations',
  () => {
    // Prepare test data and cleanup afterward
    let createdCompanies: Array<{ id: string; name: string }> = [];

    beforeAll(async () => {
      try {
        // Create test companies
        const createResult = await batchCreateCompanies({
          companies: TEST_COMPANIES,
        });

        // Store created companies for later use
        createdCompanies = createResult.results
          .filter((r: any) => r.success)
          .map((r: any) => ({
            id: r.data.id?.record_id,
            name: r.data.values?.name?.[0]?.value,
          }));

        console.log(`Created ${createdCompanies.length} test companies`);
      } catch (error: unknown) {
        console.error('Error in test setup:', error);
        throw error;
      }
    }, 30000); // 30 second timeout

    // Clean up after tests
    afterAll(async () => {
      if (createdCompanies.length === 0) return;

      try {
        // Delete all test companies
        const companyIds = createdCompanies.map((c) => c.id);
        await batchDeleteCompanies(companyIds);
        console.log(`Cleaned up ${companyIds.length} test companies`);
      } catch (error: unknown) {
        console.error('Error in test cleanup:', error);
      }
    }, 30000); // 30 second timeout

    // Test batch update functionality
    it('IT-001.1: updates multiple companies in a batch', async () => {
      if (createdCompanies.length === 0) {
        throw new Error(
          'Expected seed companies to be created before tests ran.'
        );
      }

      // Prepare updates with the format that was failing in issue #154
      const updates = createdCompanies.map((company) => ({
        id: company.id,
        attributes: {
          industry: 'Updated Batch Industry',
        },
      }));

      try {
        // Execute the batch update
        const updateResult = await batchUpdateCompanies({ updates });

        // Verify the results
        expect(updateResult.summary.total).toBe(updates.length);
        expect(updateResult.summary.succeeded).toBe(updates.length);
        expect(updateResult.summary.failed).toBe(0);

        // Verify each company was updated successfully
        updateResult.results.forEach((result: any) => {
          expect(result.success).toBe(true);
          expect(result.data.values?.industry?.[0]?.value).toBe(
            'Updated Batch Industry'
          );
        });

        console.log(
          `Successfully updated ${updateResult.summary.succeeded} companies in batch`
        );
      } catch (error: unknown) {
        console.error('Batch update failed:', error);
        throw error;
      }
    }, 30000); // 30 second timeout
  }
);
