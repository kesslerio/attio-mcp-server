/**
 * Integration test for batch-update-companies functionality
 * Verifies that the fix for issue #154 works with the actual API
 *
 * This test requires a valid ATTIO_API_KEY in environment variables
 * To run: ATTIO_API_KEY=your_key npm test -- integration/batch-update-companies.integration.test.ts
 *
 * The test performs the following steps:
 * 1. Creates test companies to work with
 * 2. Updates these companies in a batch operation
 * 3. Verifies the updates were successful
 * 4. Cleans up by deleting the test companies
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  batchCreateCompanies,
  batchDeleteCompanies,
  batchUpdateCompanies,
} from '../../src/objects/batch-companies.js';
import { ResourceType } from '../../src/types/attio.js';

// Skip tests if no API key is available or SKIP_INTEGRATION_TESTS is set
const shouldRunTests =
  process.env.ATTIO_API_KEY && !process.env.SKIP_INTEGRATION_TESTS;

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

// Test suite
describe('Batch Company Operations - Integration', () => {
  // Skip all tests if API key not available
  beforeAll(() => {
    if (!shouldRunTests) {
      console.warn(
        'Skipping integration tests: No API key or SKIP_INTEGRATION_TESTS is set'
      );
    }
  });

  // Prepare test data and cleanup afterward
  let createdCompanies: Array<{ id: string; name: string }> = [];

  beforeAll(async () => {
    if (!shouldRunTests) return;

    try {
      // Create test companies
      const createResult = await batchCreateCompanies(TEST_COMPANIES);

      // Store created companies for later use
      createdCompanies = createResult.results
        .filter((r: any) => r.success)
        .map((r: any) => ({
          id: r.data.id?.record_id,
          name: r.data.values?.name?.[0]?.value,
        }));

      console.log(`Created ${createdCompanies.length} test companies`);
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  }, 30_000); // 30 second timeout

  // Clean up after tests
  afterAll(async () => {
    if (!shouldRunTests || createdCompanies.length === 0) return;

    try {
      // Delete all test companies
      const companyIds = createdCompanies.map((c) => c.id);
      await batchDeleteCompanies(companyIds);
      console.log(`Cleaned up ${companyIds.length} test companies`);
    } catch (error) {
      console.error('Error in test cleanup:', error);
    }
  }, 30_000); // 30 second timeout

  // Test batch update functionality
  it('should update multiple companies in a batch', async () => {
    if (!shouldRunTests || createdCompanies.length === 0) {
      return;
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
      const updateResult = await batchUpdateCompanies(updates);

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
    } catch (error) {
      console.error('Batch update failed:', error);
      throw error;
    }
  }, 30_000); // 30 second timeout
});
