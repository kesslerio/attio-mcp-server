/**
 * Validation-focused tests for advanced search functionality
 * These tests specifically bypass mocks to test actual validation logic
 */
import { describe, beforeAll, it, expect, vi } from 'vitest';
import { initializeAttioClient } from '../../src/api/attio-client.js';

// Clear any existing mocks before importing
vi.clearAllMocks();
vi.resetAllMocks();

// Unmock the specific module we want to test
vi.doUnmock('../../src/objects/companies/search.js');

// Import after clearing mocks
const { advancedSearchCompanies } = await import(
  '../../src/objects/companies/search.js'
);

// Skip tests if no API key or if explicitly disabled
const SKIP_TESTS =
  !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';

describe('Advanced Search Validation Tests', { timeout: 30000 }, () => {
  beforeAll(async () => {
    if (!SKIP_TESTS) {
      const apiKey = process.env.ATTIO_API_KEY as string;
      initializeAttioClient(apiKey);
      console.log('Running validation tests with API client');
    }
  });

  describe('advancedSearchCompanies validation', () => {
    if (SKIP_TESTS) {
      it.skip('Skipped: No API key available or tests disabled', () => {});
      return;
    }

    it('should throw appropriate error for missing filters object', async () => {
      await expect(advancedSearchCompanies(null as any)).rejects.toThrow(
        'Filters object is required'
      );
    });

    it('should throw appropriate error for missing filters array', async () => {
      const filters = {} as any;
      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        'must include a "filters" array'
      );
    });

    it('should throw appropriate error for non-array filters', async () => {
      const filters = {
        filters: 'not an array',
      } as any;
      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        'must be an array'
      );
    });

    it('should throw appropriate error for invalid filter structure', async () => {
      const filters = {
        filters: [
          {
            // Missing attribute
            condition: 'contains',
            value: 'test',
          },
        ],
      } as any;

      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        /missing attribute object/i
      );
    });

    it('should throw appropriate error for missing attribute.slug', async () => {
      const filters = {
        filters: [
          {
            attribute: {}, // Missing slug
            condition: 'contains',
            value: 'test',
          },
        ],
      } as any;

      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        /missing attribute.slug/i
      );
    });

    it('should throw appropriate error for missing condition', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            // Missing condition
            value: 'test',
          },
        ],
      } as any;

      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        /missing condition property/i
      );
    });
  });
});
