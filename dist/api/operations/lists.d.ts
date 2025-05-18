/**
 * List operations for Attio
 * Handles list management and list entry operations
 */
import { AttioList, AttioListEntry } from '../../types/attio.js';
import { RetryConfig } from './retry.js';
import { ListEntryFilters } from './types.js';
/**
 * Gets all lists in the workspace
 *
 * @param objectSlug - Optional object type to filter lists by (e.g., 'companies', 'people')
 * @param limit - Maximum number of lists to fetch (default: 20)
 * @param retryConfig - Optional retry configuration
 * @returns Array of list objects
 */
export declare function getAllLists(objectSlug?: string, limit?: number, retryConfig?: Partial<RetryConfig>): Promise<AttioList[]>;
/**
 * Gets details for a specific list
 *
 * @param listId - The ID of the list
 * @param retryConfig - Optional retry configuration
 * @returns List details
 */
export declare function getListDetails(listId: string, retryConfig?: Partial<RetryConfig>): Promise<AttioList>;
/**
 * Gets entries in a list with pagination and filtering
 *
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch
 * @param offset - Number of entries to skip
 * @param filters - Optional filters to apply
 * @param retryConfig - Optional retry configuration
 * @returns Array of list entries
 */
export declare function getListEntries(listId: string, limit?: number, offset?: number, filters?: ListEntryFilters, retryConfig?: Partial<RetryConfig>): Promise<AttioListEntry[]>;
/**
 * Adds a record to a list
 *
 * @param listId - The ID of the list
 * @param recordId - The ID of the record to add
 * @param retryConfig - Optional retry configuration
 * @returns The created list entry
 */
export declare function addRecordToList(listId: string, recordId: string, retryConfig?: Partial<RetryConfig>): Promise<AttioListEntry>;
/**
 * Removes a record from a list
 *
 * @param listId - The ID of the list
 * @param entryId - The ID of the list entry to remove
 * @param retryConfig - Optional retry configuration
 * @returns True if successful
 */
export declare function removeRecordFromList(listId: string, entryId: string, retryConfig?: Partial<RetryConfig>): Promise<boolean>;
//# sourceMappingURL=lists.d.ts.map