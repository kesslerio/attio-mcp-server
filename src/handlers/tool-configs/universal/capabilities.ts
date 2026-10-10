/**
 * Static capability manifest (U7, KTD8).
 *
 * The manifest is a *projection* of the registry, not a second catalog:
 * names, descriptions, and both JSON Schema documents come from the same
 * mode-filtered descriptors that `tools/list` advertises
 * (`getToolsListPayload`). This module adds only what a descriptor cannot
 * express — operation semantics and selection guidance — authored once per
 * canonical tool name in `CAPABILITY_CATALOG`.
 *
 * Deliberate rules:
 * - Nothing here is inferred from a tool name. Operation metadata that is not
 *   authored is reported as `unannotated`, so a gap fails a check instead of
 *   becoming a guess (KTD8: explicit annotations replace regex inference).
 * - No Attio call is needed to build it, so discovery never needs a credential
 *   and cannot leak one.
 * - The manifest describes *configured* functionality. It never claims a
 *   token-specific grant, and a call still enforces authorization.
 * - Schema documents are carried as data. Entries do not embed recursive
 *   expansions of themselves, so both the manifest and health stay finite.
 */
import type { ToolOperationMetadata } from '@/handlers/tool-types.js';
import {
  formatCapabilityGuidance,
  type CapabilityGuidance,
} from '@/handlers/tools/standards/index.js';
import { isSearchOnlyMode } from '@/config/tool-mode.js';
import { capabilitiesResultContract } from '@/handlers/tools/result-schemas.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/** Shape of the published manifest. Bumped when the entry contract changes. */
export const CAPABILITY_MANIFEST_VERSION = 1;

/** Discovery surfaces the manifest can describe. */
export type CapabilityManifestMode = 'full' | 'search-only';

/** The manifest tool itself is only advertised in the full catalogue. */
export const CAPABILITIES_TOOL_NAME = 'capabilities_get';

/** Slugs documented by the input schemas that accept custom-object slugs. */
const STANDARD_RESOURCES = [
  'companies',
  'people',
  'deals',
  'tasks',
  'lists',
  'records',
  'notes',
] as const;

/** Only people and companies expose interaction metadata. */
const INTERACTION_RESOURCES = ['people', 'companies'] as const;

/** Connector compatibility search is limited to the ChatGPT baseline set. */
const CONNECTOR_RESOURCES = ['companies', 'people', 'lists', 'tasks'] as const;

/** Note creation targets the record families that carry notes. */
const NOTE_RESOURCES = ['companies', 'people', 'deals', 'notes'] as const;

/** Authored metadata for one tool: semantics plus selection guidance. */
export interface CatalogOperation {
  operation: ToolOperationMetadata;
  guidance: CapabilityGuidance;
}

/**
 * Fill the conservative defaults an entry may omit:
 * no custom-object slugs, and credential required.
 */
function operationOf(
  metadata: Partial<ToolOperationMetadata> & {
    action: ToolOperationMetadata['action'];
    resourceTypes: readonly string[];
    readOnly: boolean;
    destructive: boolean;
    idempotent: boolean;
  }
): ToolOperationMetadata {
  return {
    customObjectSlugs: false,
    authRequired: true,
    ...metadata,
    pagination: metadata.pagination ?? {
      kind: 'none',
      supported: false,
      cap: null,
    },
  };
}

/**
 * Authored metadata for every tool that can be advertised.
 *
 * Keys are canonical names. Adding a tool means adding one entry here; the
 * lint gate and `test/handlers/tools/capability-manifest.test.ts` fail when the
 * registry and this table disagree in either direction.
 */

/**
 * Live manifest for a request.
 *
 * `utils/mcp-discovery.ts` owns the registry projection, and the registry
 * imports this module through `universal/index.js`, so a static edge back to
 * discovery would read `universalToolDefinitions` before it is initialized.
 * The lookup is deferred to call time instead, which keeps one projection and
 * no import cycle.
 */
export async function readCapabilityManifest(): Promise<CapabilityManifest> {
  const discovery = await import('@/utils/mcp-discovery.js');
  return discovery.getCapabilityManifest();
}

/**
 * Per-operation metadata for every tool that can be advertised.
 *
 * Keys are canonical names. Adding a tool means adding one entry here; the
 * lint gate and `test/handlers/tools/capability-manifest.test.ts` fail when the
 * registry and this table disagree in either direction.
 */
export const CAPABILITY_CATALOG: Readonly<Record<string, CatalogOperation>> =
  Object.freeze({
    // ---------------------------------------------------------------- static
    'aaa-health-check': {
      operation: operationOf({
        action: 'diagnostic',
        resourceTypes: [],
        customObjectSlugs: false,
        authRequired: false,
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability: 'Probe deployment liveness without touching Attio.',
        boundaries:
          'read workspace data, validate credentials, or report credential scopes.',
        constraints:
          'Always succeeds while the process is up; no credential is required.',
        recovery: 'If unavailable, restart the server or check sandbox logs.',
        alternatives: ['diagnostics_get'],
      },
    },
    diagnostics_get: {
      operation: operationOf({
        action: 'diagnostic',
        resourceTypes: [],
        authRequired: false,
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability:
          'Read sanitized runtime and context-storage diagnostics for the server.',
        boundaries:
          'expose credentials, auth state, or workspace data, or change configuration.',
        constraints:
          'Static read-only output; values come from the server environment, not from Attio.',
        recovery: 'Compare across deployments to isolate configuration drift.',
        alternatives: ['aaa-health-check', CAPABILITIES_TOOL_NAME],
      },
    },
    [CAPABILITIES_TOOL_NAME]: {
      operation: operationOf({
        action: 'read',
        resourceTypes: [],
        authRequired: false,
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability:
          'List every tool this server can serve, with its schemas and operation semantics.',
        boundaries:
          'report credential-specific grants, list workspace objects, or call Attio.',
        constraints:
          'Static and mode-filtered; a listed tool still enforces authorization when called.',
        recovery: 'Re-read after a mode or deployment change.',
        alternatives: ['tools/list', 'aaa-health-check'],
      },
    },

    // ------------------------------------------------- universal core: read
    records_search: {
      operation: operationOf({
        action: 'search',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'cursor', supported: true, cap: 100 },
      }),
      guidance: {
        capability: 'Find records across any supported object type.',
        boundaries:
          'create or modify records, or return more than one page per call.',
        constraints:
          'Max 100 results (default 10); pass the sealed next_cursor for this exact query and never mix cursor with offset.',
        recovery:
          'If attributes are unknown or a page is empty, discover searchable fields.',
        alternatives: [
          'records_search_advanced',
          'records_get_details',
          'search',
        ],
      },
    },
    records_get_details: {
      operation: operationOf({
        action: 'read',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability: 'Fetch one record with enriched attribute formatting.',
        boundaries: 'search or filter a result set, or return several records.',
        constraints:
          'Requires resource_type and record_id; fields filters output.',
        recovery: 'Resolve the identifier with records_search before retrying.',
        alternatives: ['records_search', 'records_get_info', 'fetch'],
      },
    },
    records_get_attributes: {
      operation: operationOf({
        action: 'metadata',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability: 'Read attribute metadata for a resource type.',
        boundaries: 'modify schema definitions or record data.',
        constraints: 'Requires resource_type; categories narrows the groups.',
        recovery: 'Use records_discover_attributes for grouped discovery.',
        alternatives: ['records_discover_attributes'],
      },
    },
    records_discover_attributes: {
      operation: operationOf({
        action: 'metadata',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability: 'Discover standard and custom attributes for a resource.',
        boundaries: 'alter schema, create fields, or read record values.',
        constraints: 'Requires resource_type; categories selects subsets.',
        recovery:
          'For select or status fields, list valid values before writing.',
        alternatives: ['records_get_attribute_options'],
      },
    },
    records_get_attribute_options: {
      operation: operationOf({
        action: 'metadata',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability:
          'List valid options for select, multi-select, and status attributes.',
        boundaries:
          'return options for text, number, or other non-option types.',
        constraints: 'Requires resource_type and the attribute slug or ID.',
        recovery:
          'Discover option-based attributes, then retry with that slug.',
        alternatives: ['records_discover_attributes'],
      },
    },
    records_get_info: {
      operation: operationOf({
        action: 'read',
        resourceTypes: INTERACTION_RESOURCES,
        authRequired: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability: 'Read an enriched contact, business, or social subset.',
        boundaries: 'search record lists or mutate data.',
        constraints:
          'Requires resource_type, record_id, and info_type; enum-restricted.',
        recovery: 'Fall back to records_get_details for the full payload.',
        alternatives: ['records_get_details'],
      },
    },
    records_get_interactions: {
      operation: operationOf({
        action: 'read',
        resourceTypes: INTERACTION_RESOURCES,
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability:
          'Read interaction timestamps and owners for one person or company.',
        boundaries:
          'return email bodies, activity feeds, or note text; Attio exposes only system-generated interaction attributes.',
        constraints: 'Requires resource_type people or companies.',
        recovery: 'Confirm the record exists, then search activity content.',
        alternatives: ['records_search_by_content', 'records_get_details'],
      },
    },
    records_get_list_memberships: {
      operation: operationOf({
        action: 'read',
        resourceTypes: ['lists', 'companies', 'people'],
        authRequired: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: false, cap: null },
      }),
      guidance: {
        capability: 'Find every list that contains one record.',
        boundaries: 'change membership, or read list entries themselves.',
        constraints:
          'Requires recordId; walks 5 lists in parallel by default (max 20).',
        recovery: 'Verify the record identifier with records_search first.',
        alternatives: ['list_entries_filter_by_parent_id'],
      },
    },

    // ------------------------------------------------ universal core: write
    records_create: {
      operation: operationOf({
        action: 'write',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: false,
        destructive: false,
        idempotent: false,
      }),
      guidance: {
        capability:
          'Create a record of any supported object type, including custom objects.',
        boundaries:
          'update existing records, attach files, or bypass required fields.',
        constraints:
          'Requires resource_type plus record_data matching discovered schema; a write may be reported as uncertain, so read it back.',
        recovery:
          'Confirm required fields and enum values, then retry once with corrected values.',
        alternatives: [
          'companies_create',
          'deals_create',
          'records_upsert',
          'records_batch',
        ],
      },
    },
    records_update: {
      operation: operationOf({
        action: 'write',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: false,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability: 'Patch fields on one existing record of any type.',
        boundaries: 'create records, delete data, or manage list memberships.',
        constraints:
          'Requires resource_type, record_id, and record_data; partial updates are validated against schema.',
        recovery: 'Inspect current values first, then retry the same patch.',
        alternatives: ['companies_update', 'deals_update', 'records_batch'],
      },
    },
    records_upsert: {
      operation: operationOf({
        action: 'write',
        resourceTypes: ['people', 'companies', 'deals'],
        customObjectSlugs: true,
        readOnly: false,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability:
          'Create or update one record by exact match on a unique attribute.',
        boundaries:
          'match fuzzily, touch more than one record, or accept a caller-supplied record_id as the match key.',
        constraints:
          'Requires resource_type, match {attribute,value} and values; multiple matches abort without writing; dry_run previews.',
        recovery:
          'On ambiguity, read the reported identifiers and update the intended one.',
        alternatives: ['records_create', 'records_update'],
      },
    },
    records_delete: {
      operation: operationOf({
        action: 'write',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: false,
        destructive: true,
        idempotent: true,
      }),
      guidance: {
        capability: 'Delete one record from its object type.',
        boundaries:
          'cascade to related data or clean up list memberships automatically.',
        constraints:
          'Requires resource_type and record_id; irreversible once confirmed.',
        recovery:
          'Confirm the target with records_get_details before deleting.',
        alternatives: ['list_entries_remove'],
      },
    },
    companies_create: {
      operation: operationOf({
        action: 'write',
        resourceTypes: ['companies'],
        authRequired: true,
        readOnly: false,
        destructive: false,
        idempotent: false,
      }),
      guidance: {
        capability: 'Create one company without naming a resource_type.',
        boundaries:
          'update existing companies, or create deals, people, or tasks.',
        constraints:
          'Requires record_data using company attribute slugs such as name, domains, or website.',
        recovery: 'Discover company attribute slugs, then retry the create.',
        alternatives: ['records_create', 'companies_update'],
      },
    },
    companies_update: {
      operation: operationOf({
        action: 'write',
        resourceTypes: ['companies'],
        authRequired: true,
        readOnly: false,
        destructive: true,
        idempotent: true,
      }),
      guidance: {
        capability: 'Update one company without naming a resource_type.',
        boundaries: 'create records, delete records, or update deals.',
        constraints: 'Requires record_id and record_data with company slugs.',
        recovery: 'Confirm the company identifier before patching.',
        alternatives: ['records_update', 'companies_create'],
      },
    },
    deals_create: {
      operation: operationOf({
        action: 'write',
        resourceTypes: ['deals'],
        authRequired: true,
        readOnly: false,
        destructive: false,
        idempotent: false,
      }),
      guidance: {
        capability: 'Create one deal without naming a resource_type.',
        boundaries:
          'update existing deals, or create companies, people, or tasks.',
        constraints:
          'Requires record_data with deal slugs such as name, stage, value, owner, or linked references.',
        recovery: 'List valid stage and owner options, then retry.',
        alternatives: ['records_create', 'deals_update'],
      },
    },
    deals_update: {
      operation: operationOf({
        action: 'write',
        resourceTypes: ['deals'],
        authRequired: true,
        readOnly: false,
        destructive: true,
        idempotent: true,
      }),
      guidance: {
        capability: 'Update one deal without naming a resource_type.',
        boundaries: 'create records, delete records, or update companies.',
        constraints: 'Requires record_id and record_data with deal slugs.',
        recovery: 'Read the deal and its current stage before patching.',
        alternatives: ['records_update', 'records_merge', 'deals_create'],
      },
    },
    notes_create: {
      operation: operationOf({
        action: 'write',
        resourceTypes: NOTE_RESOURCES,
        authRequired: true,
        readOnly: false,
        destructive: false,
        idempotent: false,
      }),
      guidance: {
        capability: 'Create a note attached to a record, with markdown.',
        boundaries: 'update or delete existing notes; this tool creates only.',
        constraints:
          'Requires resource_type, record_id, title, and content; markdown formatting is opt-in via format.',
        recovery: 'Resolve the parent record identifier, then create again.',
        alternatives: ['records_update', 'notes_list'],
      },
    },
    notes_list: {
      operation: operationOf({
        action: 'read',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'cursor', supported: true, cap: 100 },
      }),
      guidance: {
        capability: 'List notes on a record with timestamps and body text.',
        boundaries: 'create, edit, or delete notes.',
        constraints:
          'Requires resource_type and record_id; sorted by creation date; page cap 100.',
        recovery: 'Verify the record and its notes with records_get_details.',
        alternatives: ['records_search_by_content'],
      },
    },
    records_merge: {
      operation: operationOf({
        action: 'merge',
        resourceTypes: ['deals'],
        authRequired: true,
        readOnly: false,
        destructive: true,
        idempotent: false,
        pagination: { kind: 'none', supported: false, cap: null },
      }),
      guidance: {
        capability:
          'Dry-run, then merge two deal records through the native merge endpoint.',
        boundaries:
          'merge people or companies, merge more than one pair, or retry an indeterminate native merge.',
        constraints:
          'Execute requires dry_run=false, confirm=true, and the plan_fingerprint from that dry-run; both source ids are unreadable afterwards.',
        recovery:
          'On HTTP 202 ambiguity, read the surviving record later instead of reissuing the merge.',
        alternatives: ['records_update', 'records_delete'],
      },
    },

    // ------------------------------------------------ universal: advanced
    records_search_advanced: {
      operation: operationOf({
        action: 'search',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'cursor', supported: true, cap: 100 },
      }),
      guidance: {
        capability:
          'Search with nested filter groups, scoring, and ordering (for example deals by owner and stage).',
        boundaries: 'mutate records; use the write tools for that.',
        constraints:
          'Requires resource_type; supports filter groups and up to 100 items per page.',
        recovery: 'If filters are rejected, discover valid attributes.',
        alternatives: ['records_search', 'list_entries_filter_advanced'],
      },
    },
    records_search_by_relationship: {
      operation: operationOf({
        action: 'search',
        resourceTypes: ['companies', 'people', 'lists', 'tasks', 'records'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: true, cap: 100 },
      }),
      guidance: {
        capability:
          'Search records anchored by a relationship (list, company, or people).',
        boundaries: 'change list memberships; use the list entry tools.',
        constraints:
          'Requires resource_type and the related resource identifier; offset pages are a live view.',
        recovery: 'Resolve identifiers with records_search first.',
        alternatives: ['records_get_list_memberships', 'list_entries_filter'],
      },
    },
    records_search_by_content: {
      operation: operationOf({
        action: 'search',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: true, cap: 100 },
      }),
      guidance: {
        capability: 'Search inside notes, activity, and communication content.',
        boundaries: 'modify note content or attachments.',
        constraints:
          'Requires resource_type and content_query; fields narrows the scope; results are a bounded view, not a stable page sequence.',
        recovery: 'If results are too broad, use advanced filters instead.',
        alternatives: ['records_search_advanced', 'notes_list'],
      },
    },
    records_search_by_timeframe: {
      operation: operationOf({
        action: 'search',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'cursor', supported: true, cap: 100 },
      }),
      guidance: {
        capability: 'Search by creation, update, or interaction timeframe.',
        boundaries: 'change lifecycle state or schedule follow-ups.',
        constraints:
          'Requires resource_type plus a timeframe or explicit date boundaries.',
        recovery: 'If the window is too restrictive, search without it.',
        alternatives: ['records_search', 'records_search_advanced'],
      },
    },
    records_batch: {
      operation: operationOf({
        action: 'batch',
        resourceTypes: STANDARD_RESOURCES,
        customObjectSlugs: true,
        readOnly: false,
        destructive: true,
        idempotent: false,
        pagination: { kind: 'offset', supported: true, cap: 100 },
      }),
      guidance: {
        capability:
          'Run an ordered set of create, update, delete, get, or search operations in one call.',
        boundaries:
          'replay successful items automatically, or skip host approval guardrails.',
        constraints:
          'Mixed operations make the whole call non-read-only; up to 100 operations; every item is reported once and partial failures stay data.',
        recovery:
          'Inspect each item outcome before considering a retry; never re-run successful writes.',
        alternatives: ['records_batch_search', 'records_create'],
      },
    },
    records_batch_search: {
      operation: operationOf({
        action: 'batch',
        resourceTypes: STANDARD_RESOURCES,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: true, cap: 100 },
      }),
      guidance: {
        capability:
          'Run several searches together and return grouped outcomes per query.',
        boundaries: 'mutate or import data; use records_batch for writes.',
        constraints:
          'Provide a queries array (1-10 recommended) and resource_type; per-query failures are reported, not swallowed.',
        recovery: 'Retry a failed query on its own with records_search.',
        alternatives: ['records_batch', 'records_search'],
      },
    },

    // ------------------------------------------------ connector compatible
    search: {
      operation: operationOf({
        action: 'search',
        resourceTypes: CONNECTOR_RESOURCES,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: false, cap: 25 },
      }),
      guidance: {
        capability:
          'Run the lightweight compatibility search used by connector clients such as ChatGPT.',
        boundaries:
          'handle complex filters, batch queries, or rich record payloads.',
        constraints: 'Requires a query string; limit caps at 25 results.',
        recovery: 'For pagination or attribute filtering, use records_search.',
        alternatives: ['fetch', 'records_search'],
      },
    },
    fetch: {
      operation: operationOf({
        action: 'read',
        resourceTypes: CONNECTOR_RESOURCES,
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability:
          'Return the canonical record payload for a reference emitted by search.',
        boundaries:
          'perform writes, or resolve identifiers that search did not emit.',
        constraints:
          'Accepts a <resource>:<uuid> identifier and serializes JSON as text.',
        recovery: 'Re-run search to refresh the identifier, then fetch again.',
        alternatives: ['search', 'records_get_details'],
      },
    },

    // ------------------------------------------------ lists surface
    lists_list: {
      operation: operationOf({
        action: 'read',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: false, cap: null },
      }),
      guidance: {
        capability: 'List every CRM list visible to the workspace.',
        boundaries: 'create or modify lists.',
        constraints:
          'Returns all visible lists; no paging controls are exposed.',
        recovery: 'Inspect one list with lists_get for its schema.',
        alternatives: ['lists_get'],
      },
    },
    lists_get: {
      operation: operationOf({
        action: 'read',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability: 'Read the schema and configuration of one list.',
        boundaries: 'change list structure or read its entries.',
        constraints: 'Accepts a list UUID or slug.',
        recovery: 'Discover identifiers with lists_list first.',
        alternatives: ['list_entries_list', 'lists_create'],
      },
    },
    lists_create: {
      operation: operationOf({
        action: 'write',
        resourceTypes: ['lists'],
        readOnly: false,
        destructive: false,
        idempotent: false,
      }),
      guidance: {
        capability: 'Create a new CRM list, optionally from a template.',
        boundaries: 'update an existing list or manage its entries.',
        constraints:
          'Requires name and parent_object; template defaults apply before validation; dry-run previews without creating.',
        recovery: 'Confirm the result with lists_list, then configure it.',
        alternatives: ['lists_update_configuration'],
      },
    },
    lists_update_configuration: {
      operation: operationOf({
        action: 'write',
        resourceTypes: ['lists'],
        readOnly: false,
        destructive: true,
        idempotent: true,
      }),
      guidance: {
        capability: 'Update configuration of an existing list.',
        boundaries:
          'change the immutable parent_object, or manage list entries.',
        constraints:
          'Requires listId; immutable fields are rejected before the API call; dry-run previews.',
        recovery: 'Read the current configuration, then retry the patch.',
        alternatives: ['lists_get', 'lists_create'],
      },
    },
    list_entries_list: {
      operation: operationOf({
        action: 'read',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'cursor', supported: true, cap: null },
      }),
      guidance: {
        capability: 'Page through the records held in one list.',
        boundaries: 'filter entries or change memberships.',
        constraints:
          'Requires a list UUID (not a slug); default limit 20 under upstream page caps; continue with next_cursor only.',
        recovery: 'Use the filter tools when a condition is needed.',
        alternatives: ['list_entries_filter', 'list_entries_filter_advanced'],
      },
    },
    list_entries_filter: {
      operation: operationOf({
        action: 'search',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: true, cap: null },
      }),
      guidance: {
        capability:
          'Filter list entries by attribute, parent attribute, or parent record.',
        boundaries: 'modify entries or search several lists at once.',
        constraints:
          'Mode auto-detects from the parameters supplied; exactly one mode per call.',
        recovery: 'Confirm attribute slugs with records_discover_attributes.',
        alternatives: [
          'list_entries_list',
          'list_entries_filter_advanced',
          'list_entries_filter_by_parent_id',
        ],
      },
    },
    list_entries_filter_advanced: {
      operation: operationOf({
        action: 'search',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: true, cap: null },
      }),
      guidance: {
        capability: 'Filter list entries with nested filter groups.',
        boundaries: 'mutate entries or search across multiple lists.',
        constraints: 'Requires listId and a filters structure.',
        recovery: 'Falling back to single-attribute filtering is cheaper.',
        alternatives: ['list_entries_filter', 'list_entries_list'],
      },
    },
    list_entries_add: {
      operation: operationOf({
        action: 'write',
        resourceTypes: ['lists', 'companies', 'people'],
        readOnly: false,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability: 'Add an existing record to a list with initial values.',
        boundaries: 'create the record itself, or delete anything.',
        constraints:
          'Requires list UUID, record UUID, and object type; the record must exist first.',
        recovery: 'Create the record, then add it to the list.',
        alternatives: ['list_entries_manage', 'records_create'],
      },
    },
    list_entries_remove: {
      operation: operationOf({
        action: 'write',
        resourceTypes: ['lists'],
        readOnly: false,
        destructive: true,
        idempotent: true,
      }),
      guidance: {
        capability: 'Remove a membership entry from a list.',
        boundaries: 'delete the underlying record; only membership changes.',
        constraints: 'Requires listId and entryId (not the record UUID).',
        recovery: 'Locate the entry identifier with list_entries_list.',
        alternatives: ['list_entries_manage', 'list_entries_list'],
      },
    },
    list_entries_update: {
      operation: operationOf({
        action: 'write',
        resourceTypes: ['lists'],
        readOnly: false,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability: 'Update attributes on an existing list entry.',
        boundaries: 'update record attributes; use records_update for those.',
        constraints: 'Requires listId, entryId, and an attributes object.',
        recovery: 'Read valid attributes and values with lists_get.',
        alternatives: ['list_entries_manage', 'records_update'],
      },
    },
    list_entries_manage: {
      operation: operationOf({
        action: 'write',
        resourceTypes: ['lists', 'companies', 'people'],
        readOnly: false,
        destructive: true,
        idempotent: false,
      }),
      guidance: {
        capability:
          'Add, remove, or update list entries through one parameter-driven surface.',
        boundaries:
          'create records, change list configuration, or run more than one mode per call.',
        constraints:
          'Mode is inferred from the parameters given; supply parameters for exactly one mode.',
        recovery: 'Re-read the list entries to confirm which mode applied.',
        alternatives: ['list_entries_add', 'list_entries_remove'],
      },
    },
    list_entries_filter_by_parent: {
      operation: operationOf({
        action: 'search',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: true, cap: null },
      }),
      guidance: {
        capability: 'Filter entries by a parent record attribute.',
        boundaries: 'search multiple lists, or modify records.',
        constraints:
          'Requires listId, parentObjectType, parentAttributeSlug, condition, and value.',
        recovery: 'Verify parent attribute slugs before filtering.',
        alternatives: [
          'list_entries_filter',
          'list_entries_filter_by_parent_id',
        ],
      },
    },
    list_entries_filter_by_parent_id: {
      operation: operationOf({
        action: 'search',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: true, cap: null },
      }),
      guidance: {
        capability: 'Filter entries by an exact parent record identifier.',
        boundaries: 'search multiple lists.',
        constraints:
          'Requires listId and recordId; faster than attribute-based filtering.',
        recovery: 'For workspace-wide membership, list memberships instead.',
        alternatives: ['records_get_list_memberships', 'list_entries_filter'],
      },
    },

    // ------------------------------------------------ workspace members
    workspace_members_list: {
      operation: operationOf({
        action: 'read',
        resourceTypes: ['workspace_members'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'page', supported: true, cap: 100 },
      }),
      guidance: {
        capability:
          'List workspace members for assignment and access planning.',
        boundaries: 'change access levels or invite members.',
        constraints:
          'Optional search and page paging (1-100 per page, default 25).',
        recovery: 'Narrow with workspace_members_search for a named person.',
        alternatives: ['workspace_members_search', 'workspace_members_get'],
      },
    },
    workspace_members_search: {
      operation: operationOf({
        action: 'search',
        resourceTypes: ['workspace_members'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'none', supported: false, cap: null },
      }),
      guidance: {
        capability: 'Search workspace members by name, email, or role.',
        boundaries: 'modify member profiles or permissions.',
        constraints: 'Requires a query of at least 2 characters.',
        recovery: 'If nothing matches, read the full roster instead.',
        alternatives: ['workspace_members_list'],
      },
    },
    workspace_members_get: {
      operation: operationOf({
        action: 'read',
        resourceTypes: ['workspace_members'],
        readOnly: true,
        destructive: false,
        idempotent: true,
      }),
      guidance: {
        capability: 'Read profile and access details for one member.',
        boundaries: 'update member information or permissions.',
        constraints:
          'Requires a workspace_member_id taken from list or search results.',
        recovery: 'Confirm the identifier with workspace_members_list.',
        alternatives: ['workspace_members_list'],
      },
    },
  } as Record<string, CatalogOperation>);

/** One manifest entry: registry identity plus authored operation metadata. */
export interface CapabilityEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown> | null;
  outputSchema: Record<string, unknown> | null;
  annotations: Record<string, unknown>;
  operation: ToolOperationMetadata | null;
  guidance: (CapabilityGuidance & { summary: string }) | null;
  /** True when the registry offers no authored operation metadata for this name. */
  unannotated?: true;
}

/** The published manifest for the mode that produced `tools`. */
export interface CapabilityManifest {
  schemaVersion: number;
  mode: CapabilityManifestMode;
  toolCount: number;
  authorization: {
    enforcedAt: 'call-time';
    publishesCredentialGrants: false;
    note: string;
  };
  tools: CapabilityEntry[];
}

function asSchemaDocument(schema: unknown): Record<string, unknown> | null {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return null;
  }
  return schema as Record<string, unknown>;
}

/** True when `name` has authored operation metadata in this catalog. */
export function hasAuthoredCapability(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(CAPABILITY_CATALOG, name);
}

/** Authored operation metadata for a canonical tool name, if any. */
export function capabilityOperationFor(
  name: string
): ToolOperationMetadata | undefined {
  return CAPABILITY_CATALOG[name]?.operation;
}

/**
 * Project an advertised tool list into the capability manifest.
 *
 * `tools` must be the same mode-filtered descriptors `tools/list` returns, so
 * the manifest can never advertise a tool the server would not list.
 */
export function buildCapabilityManifest(
  tools: readonly Tool[]
): CapabilityManifest {
  const entries: CapabilityEntry[] = tools.map((tool) => {
    const authored = CAPABILITY_CATALOG[tool.name] as
      | CatalogOperation
      | undefined;
    const typed = tool as Tool & { annotations?: Record<string, unknown> };
    const guidance = authored
      ? {
          ...authored.guidance,
          summary: formatCapabilityGuidance(authored.guidance),
        }
      : null;

    return {
      name: tool.name,
      description: tool.description ?? '',
      inputSchema: asSchemaDocument(tool.inputSchema),
      outputSchema: asSchemaDocument(
        (tool as { outputSchema?: unknown }).outputSchema
      ),
      annotations: { ...(typed.annotations ?? {}) },
      operation: authored ? authored.operation : null,
      guidance,
      ...(authored ? {} : { unannotated: true as const }),
    };
  });

  return {
    schemaVersion: CAPABILITY_MANIFEST_VERSION,
    mode: isSearchOnlyMode() ? 'search-only' : 'full',
    toolCount: entries.length,
    authorization: {
      enforcedAt: 'call-time',
      publishesCredentialGrants: false,
      note: 'Entries describe configured functionality. Authorization is enforced on every call, so a listed tool can still be denied by the credential that reaches the server.',
    },
    tools: entries,
  };
}

/**
 * Input contract for `capabilities_get`.
 *
 * `names` narrows the projection to names the caller cares about; `include`
 * drops whole sections when a client only needs the operation table. Both are
 * selection aids, not size limits: a request that cannot serialize is reported
 * instead of silently trimmed.
 */
export const capabilitiesGetInputSchema = {
  type: 'object' as const,
  properties: {
    names: {
      type: 'array' as const,
      items: { type: 'string' as const },
      maxItems: 100,
      description:
        'Optional canonical tool names to include. Omit for the whole permitted catalog.',
    },
    include: {
      type: 'array' as const,
      items: {
        type: 'string' as const,
        enum: ['operations', 'schemas', 'guidance', 'annotations'] as const,
      },
      description:
        'Sections to return. Defaults to every section of the manifest.',
    },
  },
  required: [] as const,
  additionalProperties: false,
  examples: [
    {},
    { names: ['records_search', 'records_create'] },
    { include: ['operations'] },
  ],
};

/** MCP descriptor for the static discovery tool. */
export const capabilitiesGetToolDefinition = {
  name: CAPABILITIES_TOOL_NAME,
  description:
    'Publish the permitted capability manifest from static registry metadata. Never call Attio, report credential grants, or list workspace objects. Publishes schemas and operation facts (action, read/write, destructive, idempotent, auth, pagination) for each advertised tool; listing grants nothing.',
  inputSchema: capabilitiesGetInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
};

/**
 * Handler for `capabilities_get`.
 *
 * The manifest builder lives in `utils/mcp-discovery.ts`, which also owns the
 * registry projection. It is imported lazily so this module stays loadable
 * from the registry itself without an import cycle.
 */
export const capabilitiesGetConfig = {
  name: CAPABILITIES_TOOL_NAME,
  ...capabilitiesResultContract,
  handler: async (args: Record<string, unknown> = {}) => {
    const manifest = await readCapabilityManifest();
    const names = Array.isArray(args?.names)
      ? (args.names as unknown[]).filter(
          (name): name is string => typeof name === 'string'
        )
      : null;
    const include = Array.isArray(args?.include)
      ? (args.include as unknown[]).filter(
          (section): section is string => typeof section === 'string'
        )
      : null;
    return projectManifestSections(manifest, { names, include });
  },
  structuredOutput: (payload: unknown): Record<string, unknown> => ({
    data: payload as Record<string, unknown>,
  }),
  formatResult: (manifest: Record<string, unknown>): string => {
    const tools = Array.isArray(manifest?.tools) ? manifest.tools : [];
    const mode = manifest?.mode ?? 'full';
    const lines = [
      `Capability manifest v${manifest?.schemaVersion ?? 1} (${mode}): ${tools.length} tools`,
    ];
    for (const entry of tools as Array<Record<string, unknown>>) {
      const operation = (entry.operation ?? {}) as Record<string, unknown>;
      const pagination = (operation.pagination ?? {}) as Record<
        string,
        unknown
      >;
      lines.push(
        `- ${entry.name}: ${operation.action ?? 'unknown'} ` +
          `read=${operation.readOnly ?? '?'} destructive=${operation.destructive ?? '?'} ` +
          `idempotent=${operation.idempotent ?? '?'} ` +
          `pagination=${pagination.kind ?? 'none'} auth=${operation.authRequired ?? '?'}`
      );
    }
    return lines.join('\n');
  },
};

/**
 * Sections the health probe publishes.
 *
 * Health is a credential-free liveness probe, so it carries the *operation*
 * facts for its permitted set and leaves the schema documents to
 * `capabilities_get` and `tools/list`. This is an explicit, self-described
 * projection, not a shorter catalog: the names and facts are identical.
 */
export const HEALTH_CAPABILITY_SECTIONS = [
  'operations',
  'annotations',
  'guidance',
] as const;

/** Health-shaped projection of the live manifest. */
export function healthCapabilityProjection(
  manifest: CapabilityManifest
): Record<string, unknown> {
  return {
    ...projectManifestSections(manifest, {
      include: [...HEALTH_CAPABILITY_SECTIONS],
    }),
    projection: {
      sections: [...HEALTH_CAPABILITY_SECTIONS],
      schemaSource: 'capabilities_get',
      note: 'Health publishes the operation facts for the permitted set; input and output schema documents come from capabilities_get or tools/list.',
    },
  };
}

/**
 * Narrow a manifest without touching its completeness: unknown names are
 * reported, never guessed, and dropping a section is explicit.
 */
export function projectManifestSections(
  manifest: CapabilityManifest,
  options: { names?: string[] | null; include?: string[] | null }
): Record<string, unknown> {
  const includeAll = !options.include || options.include.length === 0;
  const wants = (section: string) =>
    includeAll || (options.include ?? []).includes(section);

  let tools = [...manifest.tools];
  if (options.names && options.names.length > 0) {
    const requested = new Set(options.names);
    const present = new Set(manifest.tools.map((entry) => entry.name));
    const unknown = [...requested].filter((name) => !present.has(name));
    if (unknown.length > 0) {
      throw Object.assign(
        new Error(`capabilities_get: unknown tool names ${unknown.join(', ')}`),
        { code: 'VALIDATION_ERROR' }
      );
    }
    tools = tools.filter((entry) => requested.has(entry.name));
  }

  const projected = tools.map((entry) => {
    const out: Record<string, unknown> = {
      name: entry.name,
      description: entry.description,
    };
    if (wants('schemas') && entry.inputSchema) {
      out.inputSchema = entry.inputSchema;
    }
    if (wants('schemas') && entry.outputSchema) {
      out.outputSchema = entry.outputSchema;
    }
    if (wants('annotations')) {
      out.annotations = entry.annotations;
    }
    if (wants('operations') && entry.operation) {
      out.operation = entry.operation;
    }
    if (wants('guidance') && entry.guidance) {
      out.guidance = entry.guidance;
    }
    if (entry.unannotated) {
      out.unannotated = true;
    }
    return out;
  });

  return {
    schemaVersion: manifest.schemaVersion,
    mode: manifest.mode,
    toolCount: projected.length,
    authorization: manifest.authorization,
    tools: projected,
  };
}
