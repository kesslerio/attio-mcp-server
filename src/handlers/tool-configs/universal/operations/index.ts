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
          'Search object records with nested attribute filters; task, list, and note routes have restricted filtering.',
        boundaries: 'mutate records; use the write tools for that.',
        constraints:
          'Cursor continuation is conditional: query/timeframe routes support it, as do empty-query object searches excluding tasks, lists, and notes. Nonempty text queries outside those routes and basic tasks/lists/notes searches are bounded and return pagination.supported=false with no cursor. Supported pages cap at 100; defaults vary by resource and route; never mix cursor with offset. Nested attribute filtering applies to companies, people, deals, records, and configured custom objects. Basic task and list routes ignore filters; basic notes routes use only parent_object/parent_record_id (or linked_record_type/linked_record_id), not nested groups. People and companies reject updated_at/modified_at timeframe searches; use created_at or last_interaction instead. Timeframe and relationship query routes target object-record endpoints, not task, list, or note endpoints, and do not combine the supplied filters or text query. sort_by and sort_order are ignored; scoring and caller-selected ordering are not provided. Custom resource slugs must be configured in this server. On strategy-based routes, text query is ignored for records and configured custom objects; tasks use it only with search_type=content. Companies, people, and deals ignore text query when filters are supplied.',
        recovery: 'If filters are rejected, discover valid attributes.',
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
        resourceTypes: ['notes', 'people'],
        customObjectSlugs: false,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'none', supported: false, cap: null },
      },
      guidance: {
        capability:
          'Run the notes/notes company text-search route or people/activity last-month activity lookup.',
        boundaries:
          'search communication bodies or note text; notes/notes delegates to company record search; people/activity ignores search_query.',
        constraints:
          'Requires resource_type, content_type, and search_query; only notes/notes and people/activity are implemented; activity ignores limit and offset; no continuation cursor.',
        recovery: 'If results are too broad, use advanced filters instead.',
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
          'Search object records by supported creation, modification, or interaction timestamps.',
        boundaries: 'change lifecycle state or schedule follow-ups.',
        constraints:
          'Requires resource_type plus a timeframe or explicit date boundaries. People and companies reject updated_at/modified_at timeframe searches; use created_at or last_interaction instead. Timeframe and relationship query routes target object-record endpoints, not task, list, or note endpoints, and do not combine the supplied filters or text query. Custom resource slugs must be configured in this server.',
        recovery: 'If the window is too restrictive, search without it.',
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
          'Run create/update/delete operations concurrently with outcomes indexed by input; legacy operation_type also supports get and search; note writes accept create and delete only, never update.',
        boundaries:
          'replay successful items automatically, or skip host approval guardrails.',
        constraints:
          'May require explicit user approval from the host. Use scoped single-record tools for one company or deal write. Up to 100 operations; execution order is not guaranteed, so dependent writes must use separate calls; partial failures stay data. Writes ignore paging arguments; Legacy search with queries forwards limit/offset only for lists, records, tasks, and deals; companies and people ignore them. Legacy search reads queries, not a singular query field; without queries it forwards limit/offset to records_search; neither format provides a cursor. Lists are supported only by legacy get/search. Note writes accept create and delete only, never update; legacy get is also available; query-array searches reject notes, while search without queries uses bounded notes search. Custom resource slugs are rejected before execution. Query-array searches for records and tasks ignore each text query, so distinct queries can return the same records. Company, person, and deal searches ignore text query when filters are supplied.',
        recovery:
          'Inspect each item outcome before considering a retry; never re-run successful writes.',
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
