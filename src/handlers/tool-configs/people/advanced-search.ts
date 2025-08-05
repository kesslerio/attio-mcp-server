/**
 * Advanced search configurations for people
 */

import { advancedSearchPeople } from '../../../objects/people/index.js';
import type { AttioRecord } from '../../../types/attio.js';
import type { ToolConfig } from '../../tool-types.js';
import { getPersonName } from './formatters.js';

export const advancedSearchToolConfigs = {
  advancedSearch: {
    name: 'advanced-search-people',
    handler: advancedSearchPeople,
    formatResult: (response: any) => {
      const results =
        (response as { results?: AttioRecord[] }).results || response;
      return (results as AttioRecord[])
        .map(
          (person) =>
            `- ${getPersonName(person)} (ID: ${
              person.id?.record_id || 'unknown'
            })`
        )
        .join('\n');
    },
  } as ToolConfig,
};

export const advancedSearchToolDefinitions = [
  {
    name: 'advanced-search-people',
    description:
      'Search for people in your CRM using advanced filtering capabilities (contacts, leads, team members)',
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
                          "Attribute to filter on (e.g., 'name', 'email', 'phone')",
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
];
