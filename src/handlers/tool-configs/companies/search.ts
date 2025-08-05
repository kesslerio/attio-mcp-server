/**
 * Search-related company tool configurations
 */

import {
  advancedSearchCompanies,
  searchCompanies,
  searchCompaniesByDomain,
} from '../../../objects/companies/index.js';
import type {
  AdvancedSearchToolConfig,
  SearchToolConfig,
} from '../../tool-types.js';
import type { CompanyRecord } from './types.js';

// Company search tool configurations
export const searchToolConfigs = {
  search: {
    name: 'search-companies',
    handler: searchCompanies,
    formatResult: (results: CompanyRecord[]) => {
      return `Found ${results.length} companies:\n${results
        .map((company: any) => {
          const name = company.values?.name?.[0]?.value || 'Unnamed';
          const website = company.values?.website?.[0]?.value || '';
          const id = company.id?.record_id || 'unknown';
          return `- ${name}${website ? ` (${website})` : ''} (ID: ${id})`;
        })
        .join('\n')}`;
    },
  } as SearchToolConfig,

  searchByDomain: {
    name: 'search-companies-by-domain',
    handler: searchCompaniesByDomain,
    formatResult: (results: CompanyRecord[]) => {
      return `Found ${results.length} companies by domain:\n${results
        .map((company: any) => {
          const name = company.values?.name?.[0]?.value || 'Unnamed';
          const website = company.values?.website?.[0]?.value || '';
          const id = company.id?.record_id || 'unknown';
          return `- ${name}${website ? ` (${website})` : ''} (ID: ${id})`;
        })
        .join('\n')}`;
    },
  } as SearchToolConfig,

  advancedSearch: {
    name: 'advanced-search-companies',
    handler: advancedSearchCompanies,
    formatResult: (results: CompanyRecord[]) => {
      return `Found ${
        results.length
      } companies matching advanced search:\n${results
        .map((company: any) => {
          const name = company.values?.name?.[0]?.value || 'Unnamed';
          const website = company.values?.website?.[0]?.value || '';
          const id = company.id?.record_id || 'unknown';
          return `- ${name}${website ? ` (${website})` : ''} (ID: ${id})`;
        })
        .join('\n')}`;
    },
  } as AdvancedSearchToolConfig,
};

// Search tool definitions
export const searchToolDefinitions = [
  {
    name: 'search-companies',
    description:
      'Search for companies in your CRM (Attio) with automatic domain prioritization. Supports company names, domains, URLs, and email addresses. When a domain is detected, results are prioritized by domain matches for better accuracy.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            "Search query for companies. Can be a company name, domain (e.g., 'example.com'), URL (e.g., 'https://example.com'), or email address (e.g., 'user@example.com'). Domain-based queries will prioritize exact domain matches.",
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'advanced-search-companies',
    description:
      'Search for companies in your CRM using advanced filtering capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        filters: {
          type: 'object',
          description: 'Complex filter object for advanced searching',
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
                          "Attribute to filter on (e.g., 'name', 'website', 'industry')",
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
      required: ['filters'],
    },
  },
  {
    name: 'search-companies-by-domain',
    description:
      'Search for companies in your CRM by domain/website. Provides exact domain-based matching for highest accuracy.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description:
            "Domain to search for (e.g., 'example.com', 'subdomain.example.com'). The domain will be normalized for consistent matching.",
        },
      },
      required: ['domain'],
    },
  },
];
