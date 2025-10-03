/**
 * IT-301: Relationship filters integration suite
 *
 * Exercises relationship-based filtering helpers against the live Attio API to
 * ensure people and company queries return the expected structures.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  createPeopleByCompanyFilter,
  createCompaniesByPeopleFilter,
  createRecordsByListFilter,
  createPeopleByCompanyListFilter,
  createCompaniesByPeopleListFilter,
} from '@/utils/relationship-utils.js';
import { FilterConditionType, ResourceType } from '@/types/attio.js';
import type { ListEntryFilters } from '@/api/operations/index.js';
import { advancedSearchPeople } from '@/objects/people/search.js';
import { advancedSearchCompanies } from '@/objects/companies/search.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

const runIntegrationTests = shouldRunIntegrationTests();

const getTestListId = (): string => process.env.TEST_LIST_ID ?? 'list_test123';

describe.skipIf(!runIntegrationTests)('IT-301: Relationship filters', () => {
  beforeAll(() => {
    if (!process.env.ATTIO_API_KEY) {
      throw new Error(
        'ATTIO_API_KEY must be provided for relationship filters.'
      );
    }
  });

  it('IT-301.1: finds people who work at tech companies', async () => {
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

    const peopleFilter = createPeopleByCompanyFilter(techCompanyFilter);

    const response = await advancedSearchPeople(peopleFilter, {
      limit: 5,
    });

    expect(response).toBeDefined();
    expect(Array.isArray(response.results)).toBe(true);

    if (response.results.length > 0) {
      const firstPerson = response.results[0];
      expect(firstPerson.id?.record_id).toBeDefined();
    }
  });

  it('IT-301.2: finds companies with executive roles', async () => {
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

    const companiesFilter = createCompaniesByPeopleFilter(executiveFilter);

    const response = await advancedSearchCompanies(companiesFilter, 5);

    expect(response).toBeDefined();
    expect(Array.isArray(response)).toBe(true);

    if (response.length > 0) {
      const firstCompany = response[0];
      expect(firstCompany.id?.record_id).toBeDefined();
    }
  });

  it('IT-301.3: finds people in a specific list', async () => {
    const testListId = getTestListId();
    const peopleInListFilter = createRecordsByListFilter(
      ResourceType.PEOPLE,
      testListId
    );

    const response = await advancedSearchPeople(peopleInListFilter, {
      limit: 5,
    });

    expect(response).toBeDefined();
    expect(Array.isArray(response.results)).toBe(true);
  });

  it('IT-301.4: finds companies in a specific list', async () => {
    const testListId = getTestListId();
    const companiesInListFilter = createRecordsByListFilter(
      ResourceType.COMPANIES,
      testListId
    );

    const response = await advancedSearchCompanies(companiesInListFilter, 5);

    expect(response).toBeDefined();
    expect(Array.isArray(response)).toBe(true);
  });

  it('IT-301.5: finds people via nested list relationships', async () => {
    const testListId = getTestListId();
    const peopleFilter = createPeopleByCompanyListFilter(testListId);

    const response = await advancedSearchPeople(peopleFilter, {
      limit: 5,
    });

    expect(response).toBeDefined();
    expect(Array.isArray(response.results)).toBe(true);
  });

  it('IT-301.6: finds companies via nested list relationships', async () => {
    const testListId = getTestListId();
    const companiesFilter = createCompaniesByPeopleListFilter(testListId);

    const response = await advancedSearchCompanies(companiesFilter, 5);

    expect(response).toBeDefined();
    expect(Array.isArray(response)).toBe(true);
  });
});
