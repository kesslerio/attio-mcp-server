import { searchCompanies } from '../../../objects/companies/index.js';
import {
  searchPeopleByCompany,
  searchPeopleByCompanyList,
  searchPeopleByNotes,
} from '../../../objects/people/index.js';
import { AttioRecord } from '../../../types/attio.js';
import { ToolRequestArguments } from '../../../types/tool-types.js';
import { SearchToolConfig, ToolConfig } from '../../tool-types.js';
import { getPersonName } from './formatters.js';

// Type definitions for filter values
interface CompanyFilterValue {
  record_id?: string;
  value?: string | number | boolean;
}

interface CompanyFilter {
  attribute: {
    slug: string;
  };
  condition: string;
  value: CompanyFilterValue | string | number | boolean;
}

export const relationshipToolConfigs = {
  searchByCompany: {
    name: 'search-people-by-company',
    handler: async (args: ToolRequestArguments) => {
      const companyFilter = args.companyFilter as any;
      if (
        !companyFilter?.filters ||
        !Array.isArray(companyFilter.filters) ||
        companyFilter.filters.length === 0
      ) {
        throw new Error(
          'Invalid companyFilter format. Expected filters array with at least one filter'
        );
      }

      // Process the filters to extract company identifiers
      for (const filter of companyFilter.filters) {
        const typedFilter = filter as CompanyFilter;
        const slug = typedFilter.attribute?.slug;
        if (slug === 'companies.id') {
          let recordId: string;
          if (
            typeof typedFilter.value === 'object' &&
            typedFilter.value !== null &&
            'record_id' in typedFilter.value
          ) {
            recordId =
              (typedFilter.value as CompanyFilterValue).record_id || '';
          } else {
            recordId = String(typedFilter.value);
          }
          // Use the searchPeopleByCompany function
          return await searchPeopleByCompany(recordId);
        } else if (slug === 'companies.name') {
          const searchValue = String(typedFilter.value);
          const companies = await searchCompanies(searchValue);
          if (companies.length === 0) {
            throw new Error(`No company found with name: ${searchValue}`);
          }
          const companyId = companies[0].id?.record_id;
          if (!companyId) {
            throw new Error(
              `Company found but has no record ID: ${searchValue}`
            );
          }
          // Use the searchPeopleByCompany function
          return await searchPeopleByCompany(companyId);
        } else {
          throw new Error(
            `Unsupported filter type: '${slug}'. Supported filters are: 'companies.id' and 'companies.name'`
          );
        }
      }

      throw new Error('No valid filters found');
    },
    formatResult: (results: AttioRecord[]) =>
      `Found ${results.length} people matching the company filter:\n${results
        .map(
          (person) =>
            `- ${getPersonName(person)} (ID: ${
              person.id?.record_id || 'unknown'
            })`
        )
        .join('\n')}`,
  } as ToolConfig,

  searchByCompanyList: {
    name: 'search-people-by-company-list',
    handler: searchPeopleByCompanyList,
    formatResult: (results: AttioRecord[]) =>
      `Found ${
        results.length
      } people who work at companies in the specified list:\n${results
        .map(
          (person) =>
            `- ${getPersonName(person)} (ID: ${
              person.id?.record_id || 'unknown'
            })`
        )
        .join('\n')}`,
  } as ToolConfig,

  searchByNotes: {
    name: 'search-people-by-notes',
    handler: searchPeopleByNotes,
    formatResult: (results: AttioRecord[]) =>
      `Found ${results.length} people with matching notes:\n${results
        .map(
          (person) =>
            `- ${getPersonName(person)} (ID: ${
              person.id?.record_id || 'unknown'
            })`
        )
        .join('\n')}`,
  } as SearchToolConfig,
};

export const relationshipToolDefinitions = [
  {
    name: 'search-people-by-company',
    description:
      'Search for people based on attributes of their associated companies',
    inputSchema: {
      type: 'object',
      properties: {
        companyFilter: {
          type: 'object',
          description:
            "Filter conditions to apply to companies. Supported slugs: 'companies.id', 'companies.name'",
          properties: {
            filters: {
              type: 'array',
              description:
                'Array of filter conditions. The handler processes filters in order and uses the first valid one.',
              items: {
                type: 'object',
                properties: {
                  attribute: {
                    type: 'object',
                    properties: {
                      slug: {
                        type: 'string',
                        description:
                          "Company attribute to filter on. Currently supports: 'companies.id', 'companies.name'",
                      },
                    },
                    required: ['slug'],
                  },
                  condition: {
                    type: 'string',
                    description:
                      "Condition to apply (e.g., 'equals', 'contains', 'starts_with')",
                  },
                  value: {
                    type: ['string', 'number', 'boolean', 'object'],
                    description:
                      "Value to filter by. For company ID, use { record_id: 'id' }. For company name, use a string.",
                  },
                },
                required: ['attribute', 'condition', 'value'],
              },
            },
            matchAny: {
              type: 'boolean',
              description:
                'When true, matches any filter (OR logic). When false, matches all filters (AND logic)',
            },
          },
          required: ['filters'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
        },
      },
      required: ['companyFilter'],
    },
  },
  {
    name: 'search-people-by-company-list',
    description: 'Search for people who work at companies in a specific list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list containing companies',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
        },
      },
      required: ['listId'],
    },
  },
  {
    name: 'search-people-by-notes',
    description: 'Search for people that have notes containing specific text',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description: 'Text to search for in notes',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
        },
      },
      required: ['searchText'],
    },
  },
];
