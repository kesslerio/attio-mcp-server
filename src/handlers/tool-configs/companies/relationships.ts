/**
 * Relationship-based tool configurations for companies
 */

import {
  getCompanyLists,
  searchCompaniesByNotes,
  searchCompaniesByPeople,
  searchCompaniesByPeopleList,
} from '../../../objects/companies/index.js';
import type { AttioList } from '../../../types/attio.js';
import type { ToolConfig } from '../../tool-types.js';
import type { CompanyRecord } from './types.js';

// Company relationship tool configurations
export const relationshipToolConfigs = {
  searchByPeople: {
    name: 'search-companies-by-people',
    handler: searchCompaniesByPeople,
    formatResult: (results: CompanyRecord[]) => {
      return `Found ${results.length} companies with matching people:\n${results
        .map(
          (company: any) =>
            `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${
              company.id?.record_id || 'unknown'
            })`
        )
        .join('\n')}`;
    },
  } as ToolConfig,

  searchByPeopleList: {
    name: 'search-companies-by-people-list',
    handler: searchCompaniesByPeopleList,
    formatResult: (results: CompanyRecord[]) => {
      return `Found ${
        results.length
      } companies with employees in the list:\n${results
        .map(
          (company: any) =>
            `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${
              company.id?.record_id || 'unknown'
            })`
        )
        .join('\n')}`;
    },
  } as ToolConfig,

  searchByNotes: {
    name: 'search-companies-by-notes',
    handler: searchCompaniesByNotes,
    formatResult: (results: CompanyRecord[]) => {
      return `Found ${results.length} companies with matching notes:\n${results
        .map(
          (company: any) =>
            `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${
              company.id?.record_id || 'unknown'
            })`
        )
        .join('\n')}`;
    },
  } as ToolConfig,

  listsForCompany: {
    name: 'get-company-lists',
    handler: getCompanyLists,
    formatResult: (results: AttioList[]) => {
      return `Company belongs to ${results.length} lists:\n${results
        .map(
          (list: any) =>
            `- ${list.name || list.title} (ID: ${
              list.id?.list_id || list.id || 'unknown'
            })`
        )
        .join('\n')}`;
    },
  } as ToolConfig,
};

// Relationship tool definitions
export const relationshipToolDefinitions = [
  {
    name: 'search-companies-by-people',
    description:
      'Search for companies based on attributes of their associated people',
    inputSchema: {
      type: 'object',
      properties: {
        peopleFilter: {
          type: 'object',
          description: 'Filter conditions to apply to people',
          properties: {
            filters: {
              type: 'array',
              description: 'Array of filter conditions',
              items: {
                type: 'object',
                properties: {
                  attribute: {
                    type: 'object',
                    properties: {
                      slug: {
                        type: 'string',
                        description:
                          "Person attribute to filter on (e.g., 'name', 'email', 'phone')",
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
                    type: ['string', 'number', 'boolean'],
                    description: 'Value to filter by',
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
      required: ['peopleFilter'],
    },
  },
  {
    name: 'search-companies-by-people-list',
    description: 'Search for companies that have employees in a specific list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list containing people',
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
    name: 'search-companies-by-notes',
    description:
      'Search for companies that have notes containing specific text',
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
  {
    name: 'get-company-lists',
    description: 'Get lists that a company belongs to',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of list entries to check (default: 50)',
        },
      },
      required: ['companyId'],
    },
  },
];
