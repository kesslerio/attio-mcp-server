/**
 * Activity and interaction search tool configurations for people
 */

import {
  searchPeopleByActivity,
  searchPeopleByLastInteraction,
} from '../../../objects/people/index.js';
import type { AttioRecord } from '../../../types/attio.js';
import type { DateBasedSearchToolConfig } from '../../tool-types.js';
import { getPersonName } from './formatters.js';

export const activitySearchToolConfigs = {
  searchByLastInteraction: {
    name: 'search-people-by-last-interaction',
    handler: searchPeopleByLastInteraction,
    formatResult: (results: AttioRecord[]) =>
      `Found ${
        results.length
      } people with interactions in the specified date range:\n${results
        .map(
          (person) =>
            `- ${getPersonName(person)} (ID: ${
              person.id?.record_id || 'unknown'
            }, Last Interaction: ${
              (person.values as any)?.last_interaction?.interacted_at ||
              'unknown'
            })`
        )
        .join('\n')}`,
  } as DateBasedSearchToolConfig,

  searchByActivity: {
    name: 'search-people-by-activity',
    handler: searchPeopleByActivity,
    formatResult: (results: AttioRecord[]) =>
      `Found ${results.length} people with matching activity:\n${results
        .map(
          (person) =>
            `- ${getPersonName(person)} (ID: ${
              person.id?.record_id || 'unknown'
            }, Last Interaction: ${
              (person.values as any)?.last_interaction?.interacted_at ||
              'unknown'
            })`
        )
        .join('\n')}`,
  } as DateBasedSearchToolConfig,
};

export const activitySearchToolDefinitions = [
  {
    name: 'search-people-by-last-interaction',
    description: 'Search for people by their last interaction date',
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
        interactionType: {
          type: 'string',
          description:
            'Type of interaction to filter by (any, email, calendar, phone, meeting, custom)',
          enum: ['any', 'email', 'calendar', 'phone', 'meeting', 'custom'],
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
    name: 'search-people-by-activity',
    description: 'Search for people by their activity history',
    inputSchema: {
      type: 'object',
      properties: {
        activityFilter: {
          type: 'object',
          description: 'Activity filter configuration',
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
              required: ['start', 'end'],
            },
            interactionType: {
              type: 'string',
              description:
                'Type of interaction to filter by (any, email, calendar, phone, meeting, custom)',
              enum: ['any', 'email', 'calendar', 'phone', 'meeting', 'custom'],
            },
          },
          required: ['dateRange'],
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
      required: ['activityFilter'],
    },
  },
];
