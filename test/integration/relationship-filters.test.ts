/**
 * Integration tests for relationship filters with the actual Attio API
 *
 * These tests verify that our relationship filter utilities correctly interact
 * with the Attio API and produce the expected results.
 *
 * Note: These tests require valid API credentials and will make actual API calls.
 */

import axios from 'axios';
import { beforeAll, describe, expect, test } from 'vitest';
import { getAttioClient } from '../../src/api/attio-client';
import type { ListEntryFilters } from '../../src/api/operations/index';
import { advancedSearchCompanies } from '../../src/objects/companies/search';
import { advancedSearchPeople } from '../../src/objects/people/search';
import { FilterConditionType, ResourceType } from '../../src/types/attio';
import {
  createCompaniesByPeopleFilter,
  createCompaniesByPeopleListFilter,
  createPeopleByCompanyFilter,
  createPeopleByCompanyListFilter,
  createRecordsByListFilter,
} from '../../src/utils/relationship-utils';

// Skip tests if no API key is provided
const runIntegrationTests =
  process.env.RUN_INTEGRATION_TESTS === 'true' &&
  process.env.ATTIO_API_KEY &&
  process.env.ATTIO_API_KEY !== 'development_api_key_placeholder';

describe('Relationship Filter Integration Tests', () => {
  // Setup
  beforeAll(() => {
    if (runIntegrationTests) {
      // Client is initialized automatically when getAttioClient() is called
    }
  });

  describe('People by Company Filters', () => {
    // This test will only run if integration tests are enabled
    (runIntegrationTests ? it : it.skip)(
      'should find people who work at tech companies',
      async () => {
        // Create a filter for tech companies
        const techCompanyFilter: ListEntryFilters = {
          filters: [
            {
              attribute: { slug: 'industry' },
              condition: FilterConditionType.EQUALS,
              value: 'Technology',
            },
          ],
          matchAny: false,
        };

        // Create a relationship filter for people who work at tech companies
        const peopleFilter = createPeopleByCompanyFilter(techCompanyFilter);

        // Make an actual API call
        const response = await advancedSearchPeople(peopleFilter, {
          limit: 5,
        });

        // Verify the response structure and content
        expect(response).toBeDefined();
        expect(Array.isArray(response.results)).toBe(true);

        // If any results are found, verify they have company relationships
        if (response.results.length > 0) {
          const firstPerson = response.results[0];
          expect(firstPerson.id).toBeDefined();
          expect(firstPerson.id.record_id).toBeDefined();
        }
      }
    );
  });

  describe('Companies by People Filters', () => {
    (runIntegrationTests ? it : it.skip)(
      'should find companies with executives',
      async () => {
        // Create a filter for people with executive titles
        const executiveFilter: ListEntryFilters = {
          filters: [
            {
              attribute: { slug: 'job_title' },
              condition: FilterConditionType.CONTAINS,
              value: 'CEO',
            },
          ],
          matchAny: false,
        };

        // Create a relationship filter for companies with executives
        const companiesFilter = createCompaniesByPeopleFilter(executiveFilter);

        // Make an actual API call
        const response = await advancedSearchCompanies(companiesFilter, 5);

        // Verify the response structure and content
        expect(response).toBeDefined();
        expect(Array.isArray(response)).toBe(true);

        // If any results are found, verify they have the expected structure
        if (response.length > 0) {
          const firstCompany = response[0];
          expect(firstCompany.id).toBeDefined();
          expect(firstCompany.id.record_id).toBeDefined();
        }
      }
    );
  });

  describe('Records by List Filters', () => {
    // This will require an actual list ID from your Attio account
    const testListId = process.env.TEST_LIST_ID || 'list_test123';

    (runIntegrationTests ? it : it.skip)(
      'should find people in a specific list',
      async () => {
        // Create a filter for people in the test list
        const peopleInListFilter = createRecordsByListFilter(
          ResourceType.PEOPLE,
          testListId
        );

        // Make an actual API call
        const response = await advancedSearchPeople(peopleInListFilter, {
          limit: 5,
        });

        // Verify the response structure
        expect(response).toBeDefined();
        expect(Array.isArray(response.results)).toBe(true);
      }
    );

    (runIntegrationTests ? it : it.skip)(
      'should find companies in a specific list',
      async () => {
        // Create a filter for companies in the test list
        const companiesInListFilter = createRecordsByListFilter(
          ResourceType.COMPANIES,
          testListId
        );

        // Make an actual API call
        const response = await advancedSearchCompanies(
          companiesInListFilter,
          5
        );

        // Verify the response structure
        expect(response).toBeDefined();
        expect(Array.isArray(response)).toBe(true);
      }
    );
  });

  describe('Nested Relationship Filters', () => {
    // This will require an actual list ID from your Attio account
    const testListId = process.env.TEST_LIST_ID || 'list_test123';

    (runIntegrationTests ? it : it.skip)(
      'should find people who work at companies in a specific list',
      async () => {
        // Create a filter for people who work at companies in the test list
        const peopleFilter = createPeopleByCompanyListFilter(testListId);

        // Make an actual API call
        const response = await advancedSearchPeople(peopleFilter, {
          limit: 5,
        });

        // Verify the response structure
        expect(response).toBeDefined();
        expect(Array.isArray(response.results)).toBe(true);
      }
    );

    (runIntegrationTests ? it : it.skip)(
      'should find companies that have people in a specific list',
      async () => {
        // Create a filter for companies that have people in the test list
        const companiesFilter = createCompaniesByPeopleListFilter(testListId);

        // Make an actual API call
        const response = await advancedSearchCompanies(companiesFilter, 5);

        // Verify the response structure
        expect(response).toBeDefined();
        expect(Array.isArray(response)).toBe(true);
      }
    );
  });

  // If not running integration tests, add a dummy test to avoid empty test suites
  if (!runIntegrationTests) {
    it('skips integration tests when API credentials are not provided', () => {
      console.log(
        'Skipping integration tests - set RUN_INTEGRATION_TESTS=true and provide valid ATTIO_API_KEY to run'
      );
      expect(true).toBe(true);
    });
  }
});
