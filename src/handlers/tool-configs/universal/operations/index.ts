/**
 * Advanced operations aggregator (barrel)
 * Exposes tool configs and definitions for universal advanced operations
 */

import { advancedSearchConfig } from './advanced-search.js';
import { searchByRelationshipConfig } from './relationship-search.js';
import { searchByContentConfig } from './content-search.js';
import { searchByTimeframeConfig } from './timeframe-search.js';
import { batchOperationsConfig } from './batch-operations.js';

import {
  advancedSearchSchema,
  searchByRelationshipSchema,
  searchByContentSchema,
  searchByTimeframeSchema,
  batchOperationsSchema,
} from '../schemas.js';

export const advancedOperationsToolConfigs = {
  'advanced-search': advancedSearchConfig,
  'search-by-relationship': searchByRelationshipConfig,
  'search-by-content': searchByContentConfig,
  'search-by-timeframe': searchByTimeframeConfig,
  'batch-operations': batchOperationsConfig,
};

export const advancedOperationsToolDefinitions = {
  'advanced-search': {
    name: 'advanced-search',
    description:
      'Advanced search with complex filtering across all resource types',
    inputSchema: advancedSearchSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  'search-by-relationship': {
    name: 'search-by-relationship',
    description: 'Search records by their relationships to other entities',
    inputSchema: searchByRelationshipSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  'search-by-content': {
    name: 'search-by-content',
    description: 'Search within notes, activity, and interaction content',
    inputSchema: searchByContentSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  'search-by-timeframe': {
    name: 'search-by-timeframe',
    description:
      'Search records by temporal criteria (creation, modification, interaction dates)',
    inputSchema: searchByTimeframeSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  'batch-operations': {
    name: 'batch-operations',
    description:
      'Perform bulk operations (create, update, delete, get, search)',
    inputSchema: batchOperationsSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
    },
  },
};

export {
  advancedSearchConfig,
  searchByRelationshipConfig,
  searchByContentConfig,
  searchByTimeframeConfig,
  batchOperationsConfig,
};
