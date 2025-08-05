/**
 * Rate-limited people-related tool configurations
 */

import { withRateLimiting } from '../rate-limited-handler.js';
import {
  paginatedPeopleToolConfigs,
  paginatedPeopleToolDefinitions,
} from './paginated-people.js';

/**
 * Rate-limited versions of paginated people tool configs
 */
export const rateLimitedPeopleToolConfigs = {
  advancedSearch: {
    ...paginatedPeopleToolConfigs.advancedSearch,
    name: 'rate-limited-search-people',
    handler: withRateLimiting(
      paginatedPeopleToolConfigs.advancedSearch.handler,
      'people-advanced-search'
    ),
  },

  searchByCreationDate: {
    ...paginatedPeopleToolConfigs.searchByCreationDate,
    name: 'rate-limited-search-people-by-creation-date',
    handler: withRateLimiting(
      paginatedPeopleToolConfigs.searchByCreationDate.handler,
      'people-creation-date'
    ),
  },

  searchByModificationDate: {
    ...paginatedPeopleToolConfigs.searchByModificationDate,
    name: 'rate-limited-search-people-by-modification-date',
    handler: withRateLimiting(
      paginatedPeopleToolConfigs.searchByModificationDate.handler,
      'people-modification-date'
    ),
  },

  searchByLastInteraction: {
    ...paginatedPeopleToolConfigs.searchByLastInteraction,
    name: 'rate-limited-search-people-by-last-interaction',
    handler: withRateLimiting(
      paginatedPeopleToolConfigs.searchByLastInteraction.handler,
      'people-last-interaction'
    ),
  },

  searchByActivity: {
    ...paginatedPeopleToolConfigs.searchByActivity,
    name: 'rate-limited-search-people-by-activity',
    handler: withRateLimiting(
      paginatedPeopleToolConfigs.searchByActivity.handler,
      'people-activity'
    ),
  },
};

/**
 * Rate-limited versions of paginated people tool definitions
 */
export const rateLimitedPeopleToolDefinitions =
  paginatedPeopleToolDefinitions.map((def) => ({
    ...def,
    name: `rate-limited-${def.name}`,
    description: `${def.description} (with rate limiting applied)`,
  }));
