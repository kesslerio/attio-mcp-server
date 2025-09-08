/**
 * Advanced operations barrel (backward-compatible import path)
 * The actual implementations live under ./operations/*
 */

export {
  advancedOperationsToolConfigs,
  advancedOperationsToolDefinitions,
} from './operations/index.js';

export {
  advancedSearchConfig,
  searchByRelationshipConfig,
  searchByContentConfig,
  searchByTimeframeConfig,
  batchOperationsConfig,
} from './operations/index.js';

