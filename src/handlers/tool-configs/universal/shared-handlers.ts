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
        // Convert AttioList to AttioRecord format
        return {
          id: {
            record_id: list.id.list_id,
            list_id: list.id.list_id,
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
