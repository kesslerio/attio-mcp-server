/**
 * Universal tool type definitions for consolidated MCP operations
 *
 * These types support the universal tool consolidation effort to reduce
 * tool count from 70 to ~30 tools while maintaining full functionality.
 */

import type { ListEntryFilters } from '../../../api/operations/index.js';
import type { AttioRecord } from '../../../types/attio.js';
import type { ToolConfig } from '../../tool-types.js';

/**
 * Supported resource types for universal operations
 */
export enum UniversalResourceType {
  COMPANIES = 'companies',
  PEOPLE = 'people',
  RECORDS = 'records',
  TASKS = 'tasks',
  DEALS = 'deals',
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
}

/**
 * Universal search parameters
 */
export interface UniversalSearchParams {
  resource_type: UniversalResourceType;
  query?: string;
  filters?: ListEntryFilters;
  limit?: number;
  offset?: number;
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
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  record_data: Record<string, any>;
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
  info_type: DetailedInfoType;
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
  timeframe_type: TimeframeType;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Batch operations parameters
 */
export interface BatchOperationsParams {
  resource_type: UniversalResourceType;
  operation_type: BatchOperationType;
  records?: Array<Record<string, unknown>>;
  record_ids?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Universal tool configuration interface
 */
export interface UniversalToolConfig extends ToolConfig {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  handler: (params: any) => Promise<any>;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  formatResult: (results: any) => string;
}

/**
 * Resource type handler mapping interface
 */
export interface ResourceTypeHandler {
  [UniversalResourceType.COMPANIES]: (params: unknown) => Promise<unknown>;
  [UniversalResourceType.PEOPLE]: (params: unknown) => Promise<unknown>;
  [UniversalResourceType.RECORDS]: (params: unknown) => Promise<unknown>;
  [UniversalResourceType.DEALS]: (params: unknown) => Promise<unknown>;
  [UniversalResourceType.TASKS]: (params: unknown) => Promise<unknown>;
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
    attributes: unknown,
    resourceType: UniversalResourceType
  ) => string;
}
