/**
 * Advanced operations aggregator (barrel)
 * Exposes tool configs and definitions for universal advanced operations
 */

import { advancedSearchConfig } from './advanced-search.js';
import { searchByRelationshipConfig } from './relationship-search.js';
import { searchByContentConfig } from './content-search.js';
import { searchByTimeframeConfig } from './timeframe-search.js';
import { batchOperationsConfig } from './batch-operations.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';

import {
  advancedSearchSchema,
  searchByRelationshipSchema,
  searchByContentSchema,
  searchByTimeframeSchema,
  batchOperationsSchema,
} from '../schemas.js';

export const advancedOperationsToolConfigs = {
  records_search_advanced: advancedSearchConfig,
  records_search_by_relationship: searchByRelationshipConfig,
  records_search_by_content: searchByContentConfig,
  records_search_by_timeframe: searchByTimeframeConfig,
  records_batch: batchOperationsConfig,
};

export const advancedOperationsToolDefinitions = {
  records_search_advanced: {
    name: 'records_search_advanced',
    description: formatToolDescription({
      capability:
        'Run complex searches with nested filters across resource types.',
      boundaries: 'mutate records; use records.update or records.delete.',
      constraints:
        'Supports filter groups, scoring, pagination, and up to 100 items.',
      recoveryHint:
        'If filters fail, fetch valid attributes via records.discover_attributes.',
    }),
    inputSchema: advancedSearchSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  records_search_by_relationship: {
    name: 'records_search_by_relationship',
    description: formatToolDescription({
      capability:
        'Search records using relationship anchors (list, company, people).',
      boundaries: 'modify memberships; use list tools for writes.',
      constraints: 'Requires resource_type and related resource identifier.',
      recoveryHint: 'Use records.search to resolve IDs before calling.',
    }),
    inputSchema: searchByRelationshipSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  records_search_by_content: {
    name: 'records_search_by_content',
    description: formatToolDescription({
      capability: 'Search record content (notes, activity, communications).',
      boundaries: 'modify note content or attachments.',
      constraints:
        'Requires resource_type and content_query; optional fields array.',
      recoveryHint:
        'Narrow scope with fields or switch to records.search_advanced.',
    }),
    inputSchema: searchByContentSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  records_search_by_timeframe: {
    name: 'records_search_by_timeframe',
    description: formatToolDescription({
      capability:
        'Filter records by creation, update, or interaction timeframes.',
      boundaries: 'modify lifecycle state or scheduling follow-ups.',
      constraints:
        'Requires resource_type; provide timeframe or explicit date boundaries.',
      recoveryHint:
        'Call records.search if timeframe filters are too restrictive.',
    }),
    inputSchema: searchByTimeframeSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  records_batch: {
    name: 'records_batch',
    description: formatToolDescription({
      capability:
        'Execute batched record operations (create/update/delete/get/search).',
      boundaries: 'ignore approval guardrails; hosts may require confirmation.',
      requiresApproval: true,
      constraints:
        'operation_type must be specified; enforce per-operation limits.',
      recoveryHint:
        'Run records.search first to stage IDs or payloads for batching.',
    }),
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
