/**
 * Universal tool type definitions for consolidated MCP operations
 *
 * These types support the universal tool consolidation effort to reduce
 * tool count from 70 to ~30 tools while maintaining full functionality.
 */

import { AttioRecord } from '../../../types/attio.js';
import { ToolConfig } from '../../tool-types.js';
import { ListEntryFilters } from '../../../api/operations/index.js';

/**
 * Supported resource types for universal operations
 */
export enum UniversalResourceType {
  COMPANIES = 'companies',
  PEOPLE = 'people',
  LISTS = 'lists',
  RECORDS = 'records',
  TASKS = 'tasks',
  DEALS = 'deals',
  NOTES = 'notes',
}

/**
 * Information types for detailed info retrieval
 */
export enum DetailedInfoType {
  CONTACT = 'contact',
  BUSINESS = 'business',
  SOCIAL = 'social',
  BASIC = 'basic',
  CUSTOM = 'custom',
}

/**
 * Universal note creation parameters
 */
export interface UniversalCreateNoteParams {
  resource_type: UniversalResourceType;
  record_id: string;
  title: string;
  content: string;
  format?: 'markdown' | 'plaintext';
  created_at?: string;
}

/**
 * Universal get notes parameters
 */
export interface UniversalGetNotesParams {
  resource_type?: UniversalResourceType;
  record_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * Universal update note parameters
 */
export interface UniversalUpdateNoteParams {
  note_id: string;
  title?: string;
  content?: string;
  is_archived?: boolean;
}

/**
 * Universal search notes parameters
 */
export interface UniversalSearchNotesParams {
  resource_type?: UniversalResourceType;
  record_id?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

/**
 * Universal delete note parameters
 */
export interface UniversalDeleteNoteParams {
  note_id: string;
}

/**
 * Operation types for batch operations
 */
export enum BatchOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SEARCH = 'search',
  GET = 'get',
}

/**
 * Temporal filter types for timeframe searches
 */
export enum TimeframeType {
  CREATED = 'created',
  MODIFIED = 'modified',
  LAST_INTERACTION = 'last_interaction',
}

/**
 * Content search types for content-based searches
 */
export enum ContentSearchType {
  NOTES = 'notes',
  ACTIVITY = 'activity',
  INTERACTIONS = 'interactions',
}

/**
 * Relationship search types for cross-entity searches
 */
export enum RelationshipType {
  COMPANY_TO_PEOPLE = 'company_to_people',
  PEOPLE_TO_COMPANY = 'people_to_company',
  PERSON_TO_TASKS = 'person_to_tasks',
  COMPANY_TO_TASKS = 'company_to_tasks',
  COMPANY_TO_DEALS = 'company_to_deals',
}

/**
 * Search type options for different search modes
 */
export enum SearchType {
  BASIC = 'basic',
  CONTENT = 'content',
  RELATIONSHIP = 'relationship',
  TIMEFRAME = 'timeframe',
}

/**
 * Match type options for search matching
 */
export enum MatchType {
  EXACT = 'exact',
  PARTIAL = 'partial',
  FUZZY = 'fuzzy',
}

/**
 * Sort options for search results
 */
export enum SortType {
  RELEVANCE = 'relevance',
  CREATED = 'created',
  MODIFIED = 'modified',
  NAME = 'name',
}

/**
 * Relative timeframe options for date filtering (Issue #475)
 * Updated to match sales playbook requirements and schema enum values
 */
export type RelativeTimeframe =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'last_7_days'
  | 'last_14_days' // Added for sales playbook "Deal Recovery" use case
  | 'last_30_days'
  | 'last_90_days';

/**
 * Date field options for timeframe filtering
 */
export type DateField = 'created_at' | 'updated_at' | 'due_date';

/**
 * Universal search parameters
 */
export interface UniversalSearchParams {
  resource_type: UniversalResourceType;
  query?: string;
  filters?: ListEntryFilters;
  limit?: number;
  offset?: number;
  search_type?: SearchType;
  fields?: string[];
  match_type?: MatchType;
  sort?: SortType;
  // New TC-010: Relationship search parameters
  relationship_target_type?: UniversalResourceType;
  relationship_target_id?: string;
  // New TC-012: Timeframe search parameters
  timeframe_attribute?: string;
  start_date?: string;
  end_date?: string;
  date_operator?: 'greater_than' | 'less_than' | 'between' | 'equals';
  // New TC-011: Enhanced content search parameters
  content_fields?: string[];
  use_or_logic?: boolean;

  // Issue #475: Enhanced date filtering parameters
  date_from?: string;
  date_to?: string;
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  timeframe?: RelativeTimeframe;
  date_field?: 'created_at' | 'updated_at';
}

/**
 * Universal record details parameters
 */
export interface UniversalRecordDetailsParams {
  resource_type: UniversalResourceType;
  record_id: string;
  fields?: string[];
}

/**
 * Universal create record parameters
 */
export interface UniversalCreateParams {
  resource_type: UniversalResourceType;
  record_data: Record<string, unknown>;
  return_details?: boolean;
}

/**
 * Universal update record parameters
 */
export interface UniversalUpdateParams {
  resource_type: UniversalResourceType;
  record_id: string;
  record_data: Record<string, unknown>;
  return_details?: boolean;
}

/**
 * Universal delete record parameters
 */
export interface UniversalDeleteParams {
  resource_type: UniversalResourceType;
  record_id: string;
}

/**
 * Universal attributes parameters
 */
export interface UniversalAttributesParams {
  resource_type: UniversalResourceType;
  record_id?: string;
  categories?: string[];
  fields?: string[];
}

/**
 * Universal detailed info parameters
 */
export interface UniversalDetailedInfoParams {
  resource_type: UniversalResourceType;
  record_id: string;
}

/**
 * Advanced search parameters
 */
export interface AdvancedSearchParams {
  resource_type: UniversalResourceType;
  query?: string;
  filters?: ListEntryFilters;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Relationship search parameters
 */
export interface RelationshipSearchParams {
  relationship_type: RelationshipType;
  source_id: string;
  target_resource_type?: UniversalResourceType;
  listId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Content search parameters
 */
export interface ContentSearchParams {
  resource_type: UniversalResourceType;
  content_type: ContentSearchType;
  search_query: string;
  limit?: number;
  offset?: number;
}

/**
 * Timeframe search parameters
 */
export interface TimeframeSearchParams {
  resource_type: UniversalResourceType;
  timeframe_type?: TimeframeType;
  start_date?: string;
  end_date?: string;
  // New parameters to support relative timeframe searches (Issue #475)
  relative_range?: string;
  invert_range?: boolean;
  date_field?: 'created_at' | 'updated_at' | 'modified_at';
  limit?: number;
  offset?: number;
}

/**
 * Batch operations parameters
 */
export interface BatchOperationsParams {
  resource_type: UniversalResourceType;
  // New flexible format
  operations?: Array<{
    operation: 'create' | 'update' | 'delete';
    record_data: Record<string, unknown>;
  }>;
  // Legacy format
  operation_type?: BatchOperationType;
  records?: Array<Record<string, unknown>>;
  record_ids?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Universal tool configuration interface
 */
export interface UniversalToolConfig extends ToolConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (params: any) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatResult: (results: any, ...args: any[]) => string;
}

/**
 * Resource type handler mapping interface
 */
export interface ResourceTypeHandler {
  [UniversalResourceType.COMPANIES]: (
    params: Record<string, unknown>
  ) => Promise<unknown>;
  [UniversalResourceType.PEOPLE]: (
    params: Record<string, unknown>
  ) => Promise<unknown>;
  [UniversalResourceType.LISTS]: (
    params: Record<string, unknown>
  ) => Promise<unknown>;
  [UniversalResourceType.RECORDS]: (
    params: Record<string, unknown>
  ) => Promise<unknown>;
  [UniversalResourceType.TASKS]: (
    params: Record<string, unknown>
  ) => Promise<unknown>;
}

/**
 * Universal tool result formatting interface
 */
export interface UniversalResultFormatter {
  formatSearch: (
    results: AttioRecord[],
    resourceType: UniversalResourceType
  ) => string;
  formatDetails: (
    record: AttioRecord,
    resourceType: UniversalResourceType
  ) => string;
  formatCreate: (
    record: AttioRecord,
    resourceType: UniversalResourceType
  ) => string;
  formatUpdate: (
    record: AttioRecord,
    resourceType: UniversalResourceType
  ) => string;
  formatDelete: (
    success: boolean,
    recordId: string,
    resourceType: UniversalResourceType
  ) => string;
  formatAttributes: (
    attributes: Record<string, unknown>,
    resourceType: UniversalResourceType
  ) => string;
}
