/**
 * Paginated people-related tool configurations
 */

import {
  paginatedSearchPeople,
  paginatedSearchPeopleByActivity,
  paginatedSearchPeopleByCreationDate,
  paginatedSearchPeopleByLastInteraction,
  paginatedSearchPeopleByModificationDate,
} from '../../objects/paginated-people.js';
import type { Person } from '../../types/attio.js';
import type { PaginatedResponse } from '../../utils/pagination.js';

/**
 * Config type for paginated search tools
 */
interface PaginatedSearchToolConfig {
  name: string;
  handler: (...args: any[]) => Promise<PaginatedResponse<Person>>;
  formatResult: (result: PaginatedResponse<Person>) => string;
}

/**
 * Formats a paginated people response for display
 *
 * @param result - The paginated response
 * @returns Formatted string with results and pagination info
 */
function formatPaginatedPeopleResult(
  result: PaginatedResponse<Person>
): string {
  const { results, pagination } = result;

  // Format pagination information
  const paginationInfo = `Page ${pagination.currentPage} of ${pagination.totalPages} (${pagination.totalCount} total results)`;

  // Format result list
  const resultList = results
    .map(
      (person: Person) =>
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${
          person.id?.record_id || 'unknown'
        })`
    )
    .join('\n');

  // Include navigation hints if applicable
  let navHints = '';
  if (pagination.hasMore) {
    navHints +=
      '\n\nTo see more results, use the "page" parameter to navigate to the next page.';
  }

  return `Found ${results.length} people (${paginationInfo}):\n${resultList}${navHints}`;
}

/**
 * Paginated people tool configurations
 */
export const paginatedPeopleToolConfigs = {
  advancedSearch: {
    name: 'paginated-search-people',
    handler: paginatedSearchPeople,
    formatResult: formatPaginatedPeopleResult,
  } as PaginatedSearchToolConfig,

  searchByCreationDate: {
    name: 'paginated-search-people-by-creation-date',
    handler: paginatedSearchPeopleByCreationDate,
    formatResult: formatPaginatedPeopleResult,
  } as PaginatedSearchToolConfig,

  searchByModificationDate: {
    name: 'paginated-search-people-by-modification-date',
    handler: paginatedSearchPeopleByModificationDate,
    formatResult: formatPaginatedPeopleResult,
  } as PaginatedSearchToolConfig,

  searchByLastInteraction: {
    name: 'paginated-search-people-by-last-interaction',
    handler: paginatedSearchPeopleByLastInteraction,
    formatResult: formatPaginatedPeopleResult,
  } as PaginatedSearchToolConfig,

  searchByActivity: {
    name: 'paginated-search-people-by-activity',
    handler: paginatedSearchPeopleByActivity,
    formatResult: formatPaginatedPeopleResult,
  } as PaginatedSearchToolConfig,
};

/**
 * Tool definitions for paginated people search
 */
export const paginatedPeopleToolDefinitions = [
  {
    name: 'paginated-search-people',
    description:
      'Search for people using advanced filtering capabilities with pagination',
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
        page: {
          type: 'number',
          description: 'Page number to return (default: 1)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20, max: 100)',
        },
      },
      required: ['filters'],
    },
  },
  {
    name: 'paginated-search-people-by-creation-date',
    description: 'Search for people by their creation date with pagination',
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
                'Start date in ISO format or relative date expression',
            },
            end: {
              type: 'string',
              description: 'End date in ISO format or relative date expression',
            },
            preset: {
              type: 'string',
              description:
                "Predefined date range (e.g., 'today', 'this_week', 'last_month')",
            },
          },
        },
        page: {
          type: 'number',
          description: 'Page number to return (default: 1)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20, max: 100)',
        },
      },
      required: ['dateRange'],
    },
  },
  {
    name: 'paginated-search-people-by-modification-date',
    description:
      'Search for people by their last modification date with pagination',
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
                'Start date in ISO format or relative date expression',
            },
            end: {
              type: 'string',
              description: 'End date in ISO format or relative date expression',
            },
            preset: {
              type: 'string',
              description:
                "Predefined date range (e.g., 'today', 'this_week', 'last_month')",
            },
          },
        },
        page: {
          type: 'number',
          description: 'Page number to return (default: 1)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20, max: 100)',
        },
      },
      required: ['dateRange'],
    },
  },
  {
    name: 'paginated-search-people-by-last-interaction',
    description:
      'Search for people by their last interaction date with pagination',
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
                'Start date in ISO format or relative date expression',
            },
            end: {
              type: 'string',
              description: 'End date in ISO format or relative date expression',
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
        page: {
          type: 'number',
          description: 'Page number to return (default: 1)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20, max: 100)',
        },
      },
      required: ['dateRange'],
    },
  },
  {
    name: 'paginated-search-people-by-activity',
    description: 'Search for people by their activity history with pagination',
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
                    'Start date in ISO format or relative date expression',
                },
                end: {
                  type: 'string',
                  description:
                    'End date in ISO format or relative date expression',
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
          },
          required: ['dateRange'],
        },
        page: {
          type: 'number',
          description: 'Page number to return (default: 1)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20, max: 100)',
        },
      },
      required: ['activityFilter'],
    },
  },
];
