/**
 * Date based search tool configurations for people
 */

import {
  searchPeopleByCreationDate,
  searchPeopleByModificationDate,
} from '../../../objects/people/index.js';
import type { AttioRecord } from '../../../types/attio.js';
import type { DateBasedSearchToolConfig } from '../../tool-types.js';
import { getPersonName } from './formatters.js';

export const dateSearchToolConfigs = {
  searchByCreationDate: {
    name: 'search-people-by-creation-date',
    handler: searchPeopleByCreationDate,
    formatResult: (results: AttioRecord[]) =>
      `Found ${
        results.length
      } people created in the specified date range:\n${results
        .map(
          (person) =>
            `- ${getPersonName(person)} (ID: ${
              person.id?.record_id || 'unknown'
            }, Created: ${person.values?.created_at || 'unknown'})`
        )
        .join('\n')}`,
  } as DateBasedSearchToolConfig,

  searchByModificationDate: {
    name: 'search-people-by-modification-date',
    handler: searchPeopleByModificationDate,
    formatResult: (results: AttioRecord[]) =>
      `Found ${
        results.length
      } people modified in the specified date range:\n${results
        .map(
          (person) =>
            `- ${getPersonName(person)} (ID: ${
              person.id?.record_id || 'unknown'
            }, Modified: ${person.values?.updated_at || 'unknown'})`
        )
        .join('\n')}`,
  } as DateBasedSearchToolConfig,
};

export const dateSearchToolDefinitions = [
  {
    name: 'search-people-by-creation-date',
    description: 'Search for people by their creation date',
    inputSchema: {
      type: 'object',
      properties: {
        dateRange: {
          type: 'object',
          description: 'Date range for filtering',
          properties: {
            start: {
              type: 'string',
              description:
                "Start date in ISO format or relative date expression (e.g., '2023-01-01')",
            },
            end: {
              type: 'string',
              description:
                "End date in ISO format or relative date expression (e.g., '2023-12-31')",
            },
            preset: {
              type: 'string',
              description:
                "Predefined date range (e.g., 'today', 'this_week', 'last_month')",
            },
          },
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
      required: ['dateRange'],
    },
  },
  {
    name: 'search-people-by-modification-date',
    description: 'Search for people by their last modification date',
    inputSchema: {
      type: 'object',
      properties: {
        dateRange: {
          type: 'object',
          description: 'Date range for filtering',
          properties: {
            start: {
              type: 'string',
              description:
                "Start date in ISO format or relative date expression (e.g., '2023-01-01')",
            },
            end: {
              type: 'string',
              description:
                "End date in ISO format or relative date expression (e.g., '2023-12-31')",
            },
            preset: {
              type: 'string',
              description:
                "Predefined date range (e.g., 'today', 'this_week', 'last_month')",
            },
          },
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
      required: ['dateRange'],
    },
  },
];
