/**
 * Advanced operations aggregator (barrel)
 * Exposes tool configs and definitions for universal advanced operations
 */
import { defineOperationTool } from '@/handlers/tools/operation-descriptor.js';

import { advancedSearchConfig } from '@/handlers/tool-configs/universal/operations/advanced-search.js';
import { searchByRelationshipConfig } from '@/handlers/tool-configs/universal/operations/relationship-search.js';
import { searchByContentConfig } from '@/handlers/tool-configs/universal/operations/content-search.js';
import { searchByTimeframeConfig } from '@/handlers/tool-configs/universal/operations/timeframe-search.js';
import { batchOperationsConfig } from '@/handlers/tool-configs/universal/operations/batch-operations.js';

import {
  advancedSearchSchema,
  searchByRelationshipSchema,
  searchByContentSchema,
  searchByTimeframeSchema,
  batchOperationsSchema,
} from '@/handlers/tool-configs/universal/schemas.js';

export const advancedOperationsToolConfigs = {
  records_search_advanced: advancedSearchConfig,
  records_search_by_relationship: searchByRelationshipConfig,
  records_search_by_content: searchByContentConfig,
  records_search_by_timeframe: searchByTimeframeConfig,
  records_batch: batchOperationsConfig,
};

export const advancedOperationsToolDefinitions = {
  records_search_advanced: defineOperationTool({
    name: 'records_search_advanced',
    facts: {
      operation: {
        authRequired: true,
        action: 'search',
        resourceTypes: [
          'companies',
          'people',
          'deals',
          'tasks',
          'lists',
          'records',
          'notes',
        ],
        customObjectSlugs: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'cursor', supported: false, cap: 100 },
      },
      guidance: {
        capability:
          'Search object records with nested filters; task/list/note filtering is restricted.',
        boundaries: 'mutate records; use write tools.',
        constraints:
          'Configured custom objects supported. Cursor support is conditional; cap 100; never mix cursor/offset. Resource, note-scope, timestamp, sort and strategy-query restrictions: docs/universal-tools/api-reference.md#records-search-guidance.',
        recovery: 'Discover valid attributes if filters fail.',
        alternatives: ['records_search', 'list_entries_filter_advanced'],
      },
    },
    inputSchema: advancedSearchSchema,
  }),
  records_search_by_relationship: defineOperationTool({
    name: 'records_search_by_relationship',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        action: 'search',
        resourceTypes: ['companies', 'people', 'deals'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'none', supported: false, cap: null },
      },
      guidance: {
        capability:
          'Find people by company, companies by person, or deals by company or person.',
        boundaries: 'change list memberships; use the list entry tools.',
        constraints:
          'Requires relationship_type and source_id; task and list relationships are unsupported; limit and offset are ignored.',
        recovery: 'Resolve identifiers with records_search first.',
        alternatives: ['records_get_list_memberships', 'list_entries_filter'],
      },
    },
    inputSchema: searchByRelationshipSchema,
  }),
  records_search_by_content: defineOperationTool({
    name: 'records_search_by_content',
    facts: {
      operation: {
        authRequired: true,
        action: 'search',
        resourceTypes: [],
        customObjectSlugs: false,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'none', supported: false, cap: null },
      },
      guidance: {
        capability: 'Reject note/activity/interaction body searches.',
        boundaries: 'search note/activity/communication text.',
        constraints:
          'Requires resource_type, content_type, search_query; all inputs fail validation, nonretryably, before upstream work.',
        recovery:
          'Use notes_list on a known record or records_get_interactions for metadata.',
        alternatives: ['records_search_advanced', 'notes_list'],
      },
    },
    inputSchema: searchByContentSchema,
  }),
  records_search_by_timeframe: defineOperationTool({
    name: 'records_search_by_timeframe',
    facts: {
      operation: {
        authRequired: true,
        action: 'search',
        resourceTypes: ['companies', 'people', 'deals', 'records'],
        customObjectSlugs: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'cursor', supported: true, cap: 100 },
      },
      guidance: {
        capability:
          'Search records by creation, modification or interaction time.',
        boundaries: 'change lifecycle state or schedule follow-ups.',
        constraints:
          'Requires resource_type and timeframe/date bounds; custom slugs must be configured. No tasks/lists/notes, extra filters or text query. People/companies reject updated_at/modified_at; use created_at or last_interaction. See docs/universal-tools/api-reference.md#timeframe-guidance.',
        recovery: 'Try without the window if too restrictive.',
        alternatives: ['records_search', 'records_search_advanced'],
      },
    },
    inputSchema: searchByTimeframeSchema,
  }),
  records_batch: defineOperationTool({
    name: 'records_batch',
    facts: {
      operation: {
        authRequired: true,
        action: 'batch',
        resourceTypes: [
          'companies',
          'people',
          'deals',
          'tasks',
          'records',
          'notes',
        ],
        customObjectSlugs: false,
        readOnly: false,
        destructive: true,
        idempotent: false,
        pagination: { kind: 'none', supported: false, cap: null },
      },
      guidance: {
        capability:
          'Run indexed concurrent create/update/delete; legacy get/search also supported.',
        boundaries: 'replay successes or bypass host approval.',
        constraints:
          'Max 100; unordered; separate dependent writes. Partial failures stay data. Notes: create/delete, never update. Custom slugs rejected. Paging and search restrictions: docs/universal-tools/api-reference.md#batch-guidance.',
        recovery:
          'Inspect each outcome before retry; use scoped tools for single company/deal writes.',
        alternatives: ['records_batch_search', 'records_create'],
      },
    },
    inputSchema: batchOperationsSchema,
  }),
};

export {
  advancedSearchConfig,
  searchByRelationshipConfig,
  searchByContentConfig,
  searchByTimeframeConfig,
  batchOperationsConfig,
};
