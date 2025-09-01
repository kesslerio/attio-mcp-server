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
  DetailedInfoType,
} from './types.js';

// Import extracted services from Issue #489 Phase 2 & 3
import { UniversalDeleteService } from '../../../services/UniversalDeleteService.js';
import { UniversalMetadataService } from '../../../services/UniversalMetadataService.js';
import { UniversalUtilityService } from '../../../services/UniversalUtilityService.js';
import { UniversalUpdateService } from '../../../services/UniversalUpdateService.js';
import { UniversalRetrievalService } from '../../../services/UniversalRetrievalService.js';
import { UniversalSearchService } from '../../../services/UniversalSearchService.js';
import { UniversalCreateService } from '../../../services/UniversalCreateService.js';

// Import existing handlers by resource type (used by handleUniversalGetDetailedInfo)
import {
  getCompanyBasicInfo,
  getCompanyContactInfo,
  getCompanyBusinessInfo,
  getCompanySocialInfo,
} from '../../../objects/companies/index.js';

import { getListDetails } from '../../../objects/lists.js';

import { getPersonDetails } from '../../../objects/people/index.js';

import { getObjectRecord } from '../../../objects/records/index.js';

import { getTask } from '../../../objects/tasks.js';

// Note: Using direct Attio API client calls instead of object-specific note functions

// Import Attio API client for direct note operations
import {
  getAttioClient,
  initializeAttioClient,
} from '../../../api/attio-client.js';
import {
  unwrapAttio,
  normalizeNote,
  normalizeNotes,
  coerceNoteFormat,
} from '../../../utils/attio-response.js';

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
): Promise<any> {
  const { resource_type, record_id, title, content, format, created_at } =
    params;

  try {
    // Use factory service for consistent behavior
    const { getCreateService } = await import('../../../services/create/index.js');
    const service = getCreateService();
    const result = await service.createNote({
      resource_type,
      record_id,
      title,
      content,
      format,
    });

    return result;
  } catch (error: any) {
    // Return error object for computeErrorWithContext detection
    return {
      error: error.message,
      success: false,
    };
  }
}

/**
 * Universal get notes handler - uses Attio notes API directly
 */
export async function handleUniversalGetNotes(
  params: UniversalGetNotesParams
): Promise<any[]> {
  const { resource_type, record_id, limit = 20, offset = 0 } = params;

  // Ensure API client is initialized
  let client;
  try {
    client = getAttioClient();
  } catch (error) {
    // Try to initialize from environment if not already done
    const apiKey = process.env.ATTIO_API_KEY;
    if (apiKey) {
      client = initializeAttioClient(apiKey);
    } else {
      throw new Error(
        'ATTIO_API_KEY not found in environment variables for list-notes'
      );
    }
  }
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  // Add filters if specified
  if (resource_type) {
    queryParams.set('parent_object', resource_type);
  }
  if (record_id) {
    queryParams.set('parent_record_id', record_id);
  }

  try {
    // Lightweight debug trace to aid E2E diagnostics
    console.error('[list-notes] GET', `/notes?${queryParams.toString()}`);
    // Base URL already includes /v2, so use relative path
    const response = await client.get(`/notes?${queryParams}`);
    const rawList = unwrapAttio<any>(response);

    // Handle both array responses and nested data arrays
    const noteArray = Array.isArray(rawList) ? rawList : rawList?.data || [];
    const notes = normalizeNotes(noteArray);

    // Return raw notes array (same pattern as create-record)
    return notes;
  } catch (error: any) {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Unknown error';
    const semanticMessage =
      status === 404
        ? 'record not found'
        : status === 400
          ? 'invalid request'
          : message.includes('not found')
            ? message
            : `invalid: ${message}`;

    // Throw error with semantic message (same pattern as create-record)
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
): Promise<any[]> {
  return handleUniversalGetNotes(params);
}

/**
 * Universal update note handler - updates existing notes
 */
export async function handleUniversalUpdateNote(
  params: UniversalUpdateNoteParams
): Promise<any> {
  const { note_id, title, content, is_archived } = params;
  const client = getAttioClient();

  const updateData: Record<string, unknown> = {};
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
): Promise<any[]> {
  const { resource_type, record_id, query, limit = 20, offset = 0 } = params;
  const client = getAttioClient();

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
      notes = notes.filter((note: any) => note.parent_object === parentObject);
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
  const client = getAttioClient();

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
): Promise<Record<string, unknown>> {
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
): Promise<Record<string, unknown>> {
  return UniversalMetadataService.discoverAttributes(resource_type, options);
}

/**
 * Universal get detailed info handler
 */
export async function handleUniversalGetDetailedInfo(
  params: UniversalDetailedInfoParams
): Promise<Record<string, unknown>> {
  const { resource_type, record_id, info_type } = params;

  // For now, we'll return the full record for non-company resource types
  // TODO: Implement specialized detailed info methods for other resource types
  if (resource_type !== UniversalResourceType.COMPANIES) {
    // Return the full record as a fallback for other resource types
    switch (resource_type) {
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

  // Company-specific detailed info
  switch (info_type) {
    case DetailedInfoType.BASIC:
      return getCompanyBasicInfo(record_id);

    case DetailedInfoType.CONTACT:
      return getCompanyContactInfo(record_id);

    case DetailedInfoType.BUSINESS:
      return getCompanyBusinessInfo(record_id);

    case DetailedInfoType.SOCIAL:
      return getCompanySocialInfo(record_id);

    case DetailedInfoType.CUSTOM:
      // Custom fields would be implemented here
      throw new Error('Custom detailed info not yet implemented');

    default:
      throw new Error(`Unsupported info type: ${info_type}`);
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
