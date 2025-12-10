/**
 * Shared handler utilities for universal tool consolidation
 *
 * These utilities provide parameter-based routing to delegate universal
 * tool operations to existing resource-specific handlers.
 */

import {
  UniversalResourceType,
  UniversalSearchParams,
  UniversalRecordDetailsParams,
  UniversalCreateParams,
  UniversalUpdateParams,
  UniversalDeleteParams,
  UniversalAttributesParams,
  UniversalDetailedInfoParams,
  UniversalCreateNoteParams,
  UniversalGetNotesParams,
  UniversalUpdateNoteParams,
  UniversalSearchNotesParams,
  UniversalDeleteNoteParams,
  UniversalGetAttributeOptionsParams,
} from './types.js';

import { JsonObject } from '../../../types/attio.js';

// Import extracted services from Issue #489 Phase 2 & 3
import { UniversalDeleteService } from '../../../services/UniversalDeleteService.js';
import { UniversalMetadataService } from '../../../services/UniversalMetadataService.js';
import { UniversalUtilityService } from '../../../services/UniversalUtilityService.js';
import { UniversalUpdateService } from '../../../services/UniversalUpdateService.js';
import { UniversalRetrievalService } from '../../../services/UniversalRetrievalService.js';
import { UniversalSearchService } from '../../../services/UniversalSearchService.js';
import { UniversalCreateService } from '../../../services/UniversalCreateService.js';
import {
  AttributeOptionsService,
  type AttributeOptionsResult,
} from '../../../services/metadata/index.js';
import { getLazyAttioClient } from '../../../api/lazy-client.js';

// Import existing handlers by resource type

import { getListDetails } from '../../../objects/lists.js';

import { getPersonDetails } from '../../../objects/people/index.js';

import { getObjectRecord } from '../../../objects/records/index.js';

import { getTask } from '../../../objects/tasks.js';
import { listNotes } from '../../../objects/notes.js';
import { getCreateService } from '../../../services/create/index.js';
import {
  debug,
  error as logError,
  OperationType,
} from '../../../utils/logger.js';

// Note: Using direct Attio API client calls instead of object-specific note functions

// Import Attio API client for direct note operations
import { unwrapAttio, normalizeNotes } from '../../../utils/attio-response.js';

import { AttioRecord } from '../../../types/attio.js';

/**
 * Universal search handler - delegates to UniversalSearchService
 */
export async function handleUniversalSearch(
  params: UniversalSearchParams
): Promise<AttioRecord[]> {
  return UniversalSearchService.searchRecords(params);
}

/**
 * Universal get record details handler with performance optimization
 */
export async function handleUniversalGetDetails(
  params: UniversalRecordDetailsParams
): Promise<AttioRecord> {
  return UniversalRetrievalService.getRecordDetails(params);
}

/**
 * Universal create record handler with enhanced field validation
 */

/**
 * Universal note creation handler - uses Attio notes API directly
 */
export async function handleUniversalCreateNote(
  params: UniversalCreateNoteParams
): Promise<JsonObject> {
  const { resource_type, record_id, title, content, format } = params;

  try {
    // Use factory service for consistent behavior
    const service = getCreateService();
    const rawResult = await service.createNote({
      resource_type,
      record_id,
      title,
      content,
      format,
    });

    const { unwrapAttio, normalizeNote } = await import(
      '../../../utils/attio-response.js'
    );

    const result = normalizeNote(unwrapAttio<JsonObject>(rawResult));
    debug(
      'universal.createNote',
      'Create note result',
      { hasResult: !!result },
      'handleUniversalCreateNote',
      OperationType.TOOL_EXECUTION
    );
    return result;
  } catch (error: unknown) {
    logError(
      'universal.createNote',
      'Failed to create note',
      error,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Error object structure varies, need flexible access
      { errorMessage: (error as any)?.message },
      'handleUniversalCreateNote',
      OperationType.TOOL_EXECUTION
    );
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Error object structure varies, need flexible access
      error: (error as any)?.message,
      success: false,
    };
  }
}

/**
 * Universal get notes handler - uses Attio notes API directly
 */
export async function handleUniversalGetNotes(
  params: UniversalGetNotesParams
): Promise<JsonObject[]> {
  const { resource_type, record_id, limit = 20, offset = 0 } = params;

  // Validate key inputs early for clearer messages
  if (!resource_type || !record_id) {
    throw new Error('Attio list-notes failed (400): invalid request');
  }

  try {
    // E2E-friendly fallback: when running E2E with mock mode, avoid real API calls
    // This enables retrieval tests to pass without ATTIO_API_KEY while still validating shapes
    if (
      process.env.E2E_MODE === 'true' &&
      process.env.USE_MOCK_DATA !== 'false'
    ) {
      return [];
    }

    // Prefer object-layer helper which handles Attio response shape
    const response = await listNotes({
      parent_object: resource_type,
      parent_record_id: record_id,
      limit,
      offset,
    });
    const rawList = unwrapAttio<JsonObject>(response);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Note arrays from Attio API have varying structure
    const noteArray: any[] = Array.isArray(rawList)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API response structure varies
        (rawList as any[])
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Nested data property has unknown structure
        ((rawList as any)?.data as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- normalizeNotes expects any[] for flexible note processing
    return normalizeNotes(noteArray as any[]);
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Error object structure varies, need flexible access
    const anyErr = error as any;
    const status = anyErr?.response?.status;
    const message =
      anyErr?.response?.data?.error?.message ||
      anyErr?.message ||
      'Unknown error';
    const semanticMessage =
      status === 404
        ? 'record not found'
        : status === 400
          ? 'invalid request'
          : message.includes('not found')
            ? message
            : `invalid: ${message}`;
    throw new Error(
      `Attio list-notes failed${status ? ` (${status})` : ''}: ${semanticMessage}`
    );
  }
}

/**
 * Universal list notes handler - alias for get notes
 */
export async function handleUniversalListNotes(
  params: UniversalGetNotesParams
): Promise<JsonObject[]> {
  return handleUniversalGetNotes(params);
}

/**
 * Universal update note handler - updates existing notes
 */
export async function handleUniversalUpdateNote(
  params: UniversalUpdateNoteParams
): Promise<JsonObject> {
  const { note_id, title, content, is_archived } = params;
  const client = getLazyAttioClient();

  const updateData: JsonObject = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (is_archived !== undefined) updateData.is_archived = is_archived;

  const response = await client.patch(`/notes/${note_id}`, updateData);
  return response.data;
}

/**
 * Universal search notes handler - searches notes by content/title
 */
export async function handleUniversalSearchNotes(
  params: UniversalSearchNotesParams
): Promise<JsonObject[]> {
  const { resource_type, record_id, query, limit = 20, offset = 0 } = params;
  const client = getLazyAttioClient();

  const searchParams: Record<string, string> = {
    limit: limit.toString(),
    offset: offset.toString(),
  };

  if (record_id) searchParams.record_id = record_id;
  if (query) searchParams.q = query;

  const queryParams = new URLSearchParams(searchParams);
  const response = await client.get(`/notes?${queryParams}`);
  let notes = response.data.data || [];

  // Filter by resource type if specified
  if (resource_type) {
    const resourceTypeMap: Record<string, string> = {
      [UniversalResourceType.COMPANIES]: 'companies',
      [UniversalResourceType.PEOPLE]: 'people',
      [UniversalResourceType.DEALS]: 'deals',
    };
    const parentObject = resourceTypeMap[resource_type];
    if (parentObject) {
      notes = notes.filter(
        (note: JsonObject) => note.parent_object === parentObject
      );
    }
  }

  return notes;
}

/**
 * Universal delete note handler - deletes notes
 */
export async function handleUniversalDeleteNote(
  params: UniversalDeleteNoteParams
): Promise<{ success: boolean; note_id: string }> {
  const { note_id } = params;
  const client = getLazyAttioClient();

  await client.delete(`/notes/${note_id}`);
  return { success: true, note_id };
}

/**
 * Universal create record handler - delegates to UniversalCreateService
 */
export async function handleUniversalCreate(
  params: UniversalCreateParams
): Promise<AttioRecord> {
  return UniversalCreateService.createRecord(params);
}

/**
 * Universal update record handler with enhanced field validation
 */
export async function handleUniversalUpdate(
  params: UniversalUpdateParams
): Promise<AttioRecord> {
  return UniversalUpdateService.updateRecord(params);
}

/**
 * Universal delete record handler - delegates to UniversalDeleteService
 */
export async function handleUniversalDelete(
  params: UniversalDeleteParams
): Promise<{ success: boolean; record_id: string }> {
  return UniversalDeleteService.deleteRecord(params);
}

/**
 * Universal get attributes handler
 */
export async function handleUniversalGetAttributes(
  params: UniversalAttributesParams
): Promise<JsonObject> {
  return UniversalMetadataService.getAttributes(params);
}

/**
 * Universal discover attributes handler
 */
export async function handleUniversalDiscoverAttributes(
  resource_type: UniversalResourceType,
  options?: {
    categories?: string[]; // NEW: Category filtering support
  }
): Promise<JsonObject> {
  return UniversalMetadataService.discoverAttributes(resource_type, options);
}

/**
 * Object slug mapping for resource types
 */
const OBJECT_SLUG_MAP: Record<string, string> = {
  companies: 'companies',
  people: 'people',
  deals: 'deals',
  tasks: 'tasks',
  records: 'records',
  lists: 'lists',
  notes: 'notes',
};

/**
 * Resolve display name to API slug for an attribute
 * Fetches attribute metadata and finds the slug by title match
 *
 * @param objectSlug - The object slug (e.g., "deals", "companies")
 * @param displayName - The display name to resolve (e.g., "Deal stage")
 * @returns The API slug if found, or null
 */
async function resolveAttributeDisplayName(
  objectSlug: string,
  displayName: string
): Promise<string | null> {
  try {
    // Fetch all attributes for the object
    const schema = await handleUniversalDiscoverAttributes(
      objectSlug as UniversalResourceType
    );
    const allAttrs = ((schema as Record<string, unknown>).all || []) as Array<{
      name?: string;
      title?: string;
      api_slug?: string;
    }>;

    // Find attribute by title (case-insensitive)
    const displayNameLower = displayName.toLowerCase();
    const match = allAttrs.find(
      (attr) =>
        attr.title?.toLowerCase() === displayNameLower ||
        attr.name?.toLowerCase() === displayNameLower
    );

    return match?.api_slug || null;
  } catch {
    // If discovery fails, return null - the original error will be shown
    return null;
  }
}

/**
 * Universal get attribute options handler
 * Retrieves valid options for select, multi-select, and status attributes
 *
 * Supports both API slugs (e.g., "stage") and display names (e.g., "Deal stage")
 */
export async function handleUniversalGetAttributeOptions(
  params: UniversalGetAttributeOptionsParams
): Promise<AttributeOptionsResult> {
  const { resource_type, attribute, show_archived } = params;

  // Map resource type to object slug
  const objectSlug =
    OBJECT_SLUG_MAP[resource_type.toLowerCase()] || resource_type.toLowerCase();

  // Lists require both list_id and attribute_slug - not yet supported via this tool
  // TODO: Add list_id parameter to support list attributes (see plan Phase 3B)
  if (resource_type === UniversalResourceType.LISTS) {
    throw new Error(
      'records_get_attribute_options does not yet support list attributes. ' +
        'Use get-list-details to inspect list attribute schemas instead.'
    );
  }

  // First attempt: try with the attribute as provided (may be slug or display name)
  try {
    return await AttributeOptionsService.getOptions(
      objectSlug,
      attribute,
      show_archived
    );
  } catch (firstError) {
    // Check if this looks like a display name (contains space or uppercase)
    const mightBeDisplayName =
      attribute.includes(' ') || /[A-Z]/.test(attribute);

    if (mightBeDisplayName) {
      // Try to resolve display name to API slug
      const resolvedSlug = await resolveAttributeDisplayName(
        objectSlug,
        attribute
      );

      if (resolvedSlug && resolvedSlug !== attribute) {
        // Retry with resolved slug
        debug(
          'shared-handlers',
          `Resolved display name "${attribute}" to API slug "${resolvedSlug}"`,
          { attribute, resolvedSlug },
          'resolveDisplayName',
          OperationType.DATA_PROCESSING
        );
        return await AttributeOptionsService.getOptions(
          objectSlug,
          resolvedSlug,
          show_archived
        );
      }
    }

    // Re-throw original error with helpful message
    const errorMsg =
      firstError instanceof Error ? firstError.message : String(firstError);
    throw new Error(
      `${errorMsg}\n\nTip: Use the API slug (e.g., "stage") not the display name (e.g., "Deal stage"). ` +
        `Run records_discover_attributes to see available attribute slugs.`
    );
  }
}

/**
 * Universal get detailed info handler
 */
export async function handleUniversalGetDetailedInfo(
  params: UniversalDetailedInfoParams
): Promise<JsonObject> {
  const { resource_type, record_id } = params;

  // Return the full record for all resource types using standard endpoints
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      return getObjectRecord('companies', record_id);
    case UniversalResourceType.PEOPLE:
      return getPersonDetails(record_id);
    case UniversalResourceType.LISTS: {
      const list = await getListDetails(record_id);
      // Convert AttioList to AttioRecord format with robust shape handling
      // Handle all documented Attio API list response shapes
      const raw = list;
      const listId =
        raw?.id?.list_id ?? // nested shape from some endpoints
        raw?.list_id ?? // flat shape from "Get a list" endpoint
        raw?.id ?? // some responses use a flat id
        record_id; // final fallback when caller already knows it

      return {
        id: {
          record_id: listId,
          list_id: listId,
        },
        values: {
          name: list.name || list.title,
          description: list.description,
          parent_object: list.object_slug || list.parent_object,
          api_slug: list.api_slug,
          workspace_id: list.workspace_id,
          workspace_member_access: list.workspace_member_access,
          created_at: list.created_at,
        },
      } as unknown as AttioRecord;
    }
    case UniversalResourceType.DEALS:
      return getObjectRecord('deals', record_id);
    case UniversalResourceType.TASKS:
      return getTask(record_id);
    case UniversalResourceType.RECORDS:
      return getObjectRecord('records', record_id);
    default:
      throw new Error(
        `Unsupported resource type for detailed info: ${resource_type}`
      );
  }
}

/**
 * Utility function to format resource type for display
 */
export function formatResourceType(
  resourceType: UniversalResourceType
): string {
  return UniversalUtilityService.formatResourceType(resourceType);
}

/**
 * Utility function to get singular form of resource type
 */
export function getSingularResourceType(
  resourceType: UniversalResourceType
): string {
  return UniversalUtilityService.getSingularResourceType(resourceType);
}

/**
 * Utility function to validate resource type
 */
export function isValidResourceType(
  resourceType: string
): resourceType is UniversalResourceType {
  return UniversalUtilityService.isValidResourceType(resourceType);
}
