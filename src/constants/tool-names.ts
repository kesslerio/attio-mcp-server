/**
 * Canonical v2 tool names and the one migration map.
 *
 * Advertised names are plural resource nouns plus a verb. `search`, `fetch`,
 * and `aaa-health-check` stay unchanged. `previous` is a prior default-catalog
 * name accepted only as a call-only alias. An alias renames; it does not
 * change arguments or resource_type, and it is never listed.
 *
 * Pre-v2 historical aliases (kebab names that were never the default catalog,
 * and `records_search_batch`) are removed. They do not resolve.
 */

export interface ToolNameMigrationEntry {
  /** Name advertised by tools/list and dispatched after alias resolution. */
  canonical: string;
  /** Prior default-catalog name. Absent when the name did not change. */
  previous?: string;
}

export const TOOL_NAME_MIGRATION = [
  { previous: 'search_records', canonical: 'records_search' },
  { previous: 'get_record_details', canonical: 'records_get_details' },
  { previous: 'create_record', canonical: 'records_create' },
  { previous: 'update_record', canonical: 'records_update' },
  { previous: 'upsert_record', canonical: 'records_upsert' },
  { previous: 'delete_record', canonical: 'records_delete' },
  { previous: 'merge_records', canonical: 'records_merge' },
  { previous: 'create_company', canonical: 'companies_create' },
  { previous: 'update_company', canonical: 'companies_update' },
  { previous: 'create_deal', canonical: 'deals_create' },
  { previous: 'update_deal', canonical: 'deals_update' },
  { previous: 'get_record_attributes', canonical: 'records_get_attributes' },
  {
    previous: 'discover_record_attributes',
    canonical: 'records_discover_attributes',
  },
  {
    previous: 'get_record_attribute_options',
    canonical: 'records_get_attribute_options',
  },
  { previous: 'get_record_info', canonical: 'records_get_info' },
  {
    previous: 'get_record_interactions',
    canonical: 'records_get_interactions',
  },
  { previous: 'create_note', canonical: 'notes_create' },
  { previous: 'list_notes', canonical: 'notes_list' },
  {
    previous: 'search_records_advanced',
    canonical: 'records_search_advanced',
  },
  {
    previous: 'search_records_by_relationship',
    canonical: 'records_search_by_relationship',
  },
  {
    previous: 'search_records_by_content',
    canonical: 'records_search_by_content',
  },
  {
    previous: 'search_records_by_timeframe',
    canonical: 'records_search_by_timeframe',
  },
  { previous: 'batch_records', canonical: 'records_batch' },
  { previous: 'batch_search_records', canonical: 'records_batch_search' },
  { previous: 'get-lists', canonical: 'lists_list' },
  {
    previous: 'get-record-list-memberships',
    canonical: 'records_get_list_memberships',
  },
  { previous: 'get-list-details', canonical: 'lists_get' },
  { previous: 'get-list-entries', canonical: 'list_entries_list' },
  { previous: 'filter-list-entries', canonical: 'list_entries_filter' },
  {
    previous: 'advanced-filter-list-entries',
    canonical: 'list_entries_filter_advanced',
  },
  { previous: 'add-record-to-list', canonical: 'list_entries_add' },
  { previous: 'remove-record-from-list', canonical: 'list_entries_remove' },
  { previous: 'update-list-entry', canonical: 'list_entries_update' },
  { previous: 'manage-list-entry', canonical: 'list_entries_manage' },
  {
    previous: 'filter-list-entries-by-parent',
    canonical: 'list_entries_filter_by_parent',
  },
  {
    previous: 'filter-list-entries-by-parent-id',
    canonical: 'list_entries_filter_by_parent_id',
  },
  { previous: 'create-list', canonical: 'lists_create' },
  {
    previous: 'update-list-configuration',
    canonical: 'lists_update_configuration',
  },
  {
    previous: 'list-workspace-members',
    canonical: 'workspace_members_list',
  },
  {
    previous: 'search-workspace-members',
    canonical: 'workspace_members_search',
  },
  { previous: 'get-workspace-member', canonical: 'workspace_members_get' },
  { previous: 'smithery_debug_config', canonical: 'diagnostics_get' },
  { canonical: 'aaa-health-check' },
  { canonical: 'search' },
  { canonical: 'fetch' },
] as const satisfies readonly ToolNameMigrationEntry[];

/**
 * Historical aliases removed rather than pointed at the new canonical names.
 * Calling one fails. They are not tools/list entries.
 */
export const REMOVED_PRE_V2_TOOL_ALIASES = [
  'search-records',
  'get-record-details',
  'get-attributes',
  'discover-attributes',
  'get-detailed-info',
  'get-record-interactions',
  'advanced-search',
  'search-by-relationship',
  'search-by-content',
  'search-by-timeframe',
  'batch-operations',
  'batch-search',
  'create-record',
  'update-record',
  'delete-record',
  'create-note',
  'list-notes',
  'smithery-debug-config',
  'records_search_batch',
] as const;

/** Search-only mode allows these canonical operations and no aliases. */
export const SEARCH_ONLY_CANONICAL_TOOL_NAMES = [
  'search',
  'fetch',
  'aaa-health-check',
] as const;

const canonicalName = (name: string): string => {
  const entry = TOOL_NAME_MIGRATION.find((item) => item.canonical === name);
  if (!entry) {
    throw new Error(`Unknown canonical tool name: ${name}`);
  }
  return entry.canonical;
};

export const TOOL_NAMES = {
  SEARCH_RECORDS: canonicalName('records_search'),
  GET_RECORD_DETAILS: canonicalName('records_get_details'),
  GET_RECORD_ATTRIBUTES: canonicalName('records_get_attributes'),
  DISCOVER_RECORD_ATTRIBUTES: canonicalName('records_discover_attributes'),
  GET_RECORD_ATTRIBUTE_OPTIONS: canonicalName('records_get_attribute_options'),
  GET_RECORD_INFO: canonicalName('records_get_info'),
  GET_RECORD_INTERACTIONS: canonicalName('records_get_interactions'),
  SEARCH_RECORDS_ADVANCED: canonicalName('records_search_advanced'),
  SEARCH_RECORDS_BY_RELATIONSHIP: canonicalName(
    'records_search_by_relationship'
  ),
  SEARCH_RECORDS_BY_CONTENT: canonicalName('records_search_by_content'),
  SEARCH_RECORDS_BY_TIMEFRAME: canonicalName('records_search_by_timeframe'),
  BATCH_RECORDS: canonicalName('records_batch'),
  BATCH_SEARCH_RECORDS: canonicalName('records_batch_search'),
  CREATE_RECORD: canonicalName('records_create'),
  UPDATE_RECORD: canonicalName('records_update'),
  UPSERT_RECORD: canonicalName('records_upsert'),
  DELETE_RECORD: canonicalName('records_delete'),
  MERGE_RECORDS: canonicalName('records_merge'),
  CREATE_COMPANY: canonicalName('companies_create'),
  UPDATE_COMPANY: canonicalName('companies_update'),
  CREATE_DEAL: canonicalName('deals_create'),
  UPDATE_DEAL: canonicalName('deals_update'),
  CREATE_NOTE: canonicalName('notes_create'),
  LIST_NOTES: canonicalName('notes_list'),
  SMITHERY_DEBUG_CONFIG: canonicalName('diagnostics_get'),
  LISTS_LIST: canonicalName('lists_list'),
  RECORDS_GET_LIST_MEMBERSHIPS: canonicalName('records_get_list_memberships'),
  LISTS_GET: canonicalName('lists_get'),
  LIST_ENTRIES_LIST: canonicalName('list_entries_list'),
  LIST_ENTRIES_FILTER: canonicalName('list_entries_filter'),
  LIST_ENTRIES_FILTER_ADVANCED: canonicalName('list_entries_filter_advanced'),
  LIST_ENTRIES_ADD: canonicalName('list_entries_add'),
  LIST_ENTRIES_REMOVE: canonicalName('list_entries_remove'),
  LIST_ENTRIES_UPDATE: canonicalName('list_entries_update'),
  LIST_ENTRIES_MANAGE: canonicalName('list_entries_manage'),
  LIST_ENTRIES_FILTER_BY_PARENT: canonicalName(
    'list_entries_filter_by_parent'
  ),
  LIST_ENTRIES_FILTER_BY_PARENT_ID: canonicalName(
    'list_entries_filter_by_parent_id'
  ),
  LISTS_CREATE: canonicalName('lists_create'),
  LISTS_UPDATE_CONFIGURATION: canonicalName('lists_update_configuration'),
  WORKSPACE_MEMBERS_LIST: canonicalName('workspace_members_list'),
  WORKSPACE_MEMBERS_SEARCH: canonicalName('workspace_members_search'),
  WORKSPACE_MEMBERS_GET: canonicalName('workspace_members_get'),
  AAA_HEALTH_CHECK: canonicalName('aaa-health-check'),
  SEARCH: canonicalName('search'),
  FETCH: canonicalName('fetch'),
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

export const ALL_TOOL_NAMES = Object.values(TOOL_NAMES);
export const TOOL_COUNT = ALL_TOOL_NAMES.length;

export function isToolName(name: string): name is ToolName {
  return (ALL_TOOL_NAMES as readonly string[]).includes(name);
}

export function canonicalToolNames(): readonly string[] {
  return TOOL_NAME_MIGRATION.map((entry) => entry.canonical);
}

function previousOf(
  entry: (typeof TOOL_NAME_MIGRATION)[number]
): string | undefined {
  if (!('previous' in entry)) {
    return undefined;
  }
  return entry.previous;
}

export function migrationAliasMap(): ReadonlyMap<string, string> {
  const aliases = new Map<string, string>();
  for (const entry of TOOL_NAME_MIGRATION) {
    const previous = previousOf(entry);
    if (previous) {
      aliases.set(previous, entry.canonical);
    }
  }
  return aliases;
}

export function assertToolNameMigrationIntegrity(): void {
  const canonicals = new Set<string>();
  const previousNames = new Set<string>();

  for (const entry of TOOL_NAME_MIGRATION) {
    if (canonicals.has(entry.canonical)) {
      throw new Error(`Duplicate canonical tool name: ${entry.canonical}`);
    }
    canonicals.add(entry.canonical);

    const previous = previousOf(entry);
    if (!previous) {
      continue;
    }
    if (previous === entry.canonical) {
      throw new Error(`Self-target tool alias: ${previous}`);
    }
    if (previousNames.has(previous)) {
      throw new Error(`Duplicate migration alias: ${previous}`);
    }
    previousNames.add(previous);
  }

  for (const previous of previousNames) {
    if (canonicals.has(previous)) {
      throw new Error(
        `Migration alias collides with a canonical name: ${previous}`
      );
    }
  }

  for (const removed of REMOVED_PRE_V2_TOOL_ALIASES) {
    if (canonicals.has(removed) || previousNames.has(removed)) {
      throw new Error(
        `Removed pre-v2 alias overlaps the migration map: ${removed}`
      );
    }
  }

  const aliasTargets = new Set(migrationAliasMap().values());
  for (const target of aliasTargets) {
    if (!canonicals.has(target)) {
      throw new Error(`Alias target is not canonical: ${target}`);
    }
    if (previousNames.has(target)) {
      throw new Error(`Alias target is itself an alias: ${target}`);
    }
  }

  for (const name of SEARCH_ONLY_CANONICAL_TOOL_NAMES) {
    const entry = TOOL_NAME_MIGRATION.find((item) => item.canonical === name);
    if (!entry) {
      throw new Error(`Search-only tool is not in the migration map: ${name}`);
    }
    if (previousOf(entry)) {
      throw new Error(`Search-only tool must not have an alias: ${name}`);
    }
  }
}

export interface AdvertisedNameViolation {
  tool: string;
  code: string;
  message: string;
}

function tokenPattern(token: string): RegExp {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`);
}

/**
 * Catalog agreement for tools/list, the schema linter, and CLI discovery.
 * Alias names and removed historical names must not be advertised or suggested.
 */
export function findAdvertisedNameViolations(
  tools: ReadonlyArray<{ name?: string; description?: string }>
): AdvertisedNameViolation[] {
  assertToolNameMigrationIntegrity();
  const violations: AdvertisedNameViolation[] = [];
  const seen = new Set<string>();
  const canonical = new Set(canonicalToolNames());
  const forbiddenAdvice = [
    ...migrationAliasMap().keys(),
    ...REMOVED_PRE_V2_TOOL_ALIASES,
  ];

  for (const tool of tools) {
    const name = tool.name ?? '';
    if (!name) {
      continue;
    }
    if (seen.has(name)) {
      violations.push({
        tool: name,
        code: 'tool.name_duplicate',
        message: `Duplicate advertised tool name: ${name}`,
      });
    }
    seen.add(name);

    if (!canonical.has(name)) {
      violations.push({
        tool: name,
        code: 'tool.name_not_canonical',
        message: `Advertised name ${name} is not in the v2 canonical map`,
      });
    }

    const description = tool.description ?? '';
    for (const token of forbiddenAdvice) {
      if (tokenPattern(token).test(description)) {
        violations.push({
          tool: name,
          code: 'tool.description_historical_alias',
          message: `Description mentions historical name ${token}`,
        });
      }
    }
  }

  return violations;
}
