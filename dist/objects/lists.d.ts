import { BatchConfig, BatchResponse, ListEntryFilters } from "../api/operations/index.js";
import { AttioList, AttioListEntry } from "../types/attio.js";
/**
 * Gets all lists in the workspace
 *
 * @param objectSlug - Optional object type to filter lists by (e.g., 'companies', 'people')
 * @param limit - Maximum number of lists to fetch (default: 20)
 * @returns Array of list objects
 */
export declare function getLists(objectSlug?: string, limit?: number): Promise<AttioList[]>;
/**
 * Gets details for a specific list
 *
 * @param listId - The ID of the list
 * @returns List details
 */
export declare function getListDetails(listId: string): Promise<AttioList>;
/**
 * Gets entries for a specific list
 *
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch (default: 20)
 * @param offset - Number of entries to skip (default: 0)
 * @param filters - Optional filters to apply to the list entries
 * @returns Array of list entries
 */
export declare function getListEntries(listId: string, limit?: number, offset?: number, filters?: ListEntryFilters): Promise<AttioListEntry[]>;
/**
 * Adds a record to a list
 *
 * @param listId - The ID of the list
 * @param recordId - The ID of the record to add
 * @returns The created list entry
 */
export declare function addRecordToList(listId: string, recordId: string): Promise<AttioListEntry>;
/**
 * Removes a record from a list
 *
 * @param listId - The ID of the list
 * @param entryId - The ID of the list entry to remove
 * @returns True if successful
 */
export declare function removeRecordFromList(listId: string, entryId: string): Promise<boolean>;
/**
 * Gets details for multiple lists in batch
 *
 * @param listIds - Array of list IDs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with list details for each ID
 */
export declare function batchGetListsDetails(listIds: string[], batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<AttioList>>;
/**
 * Gets entries for multiple lists in batch
 *
 * @param listConfigs - Array of list configurations with ID, limit, and offset
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with list entries for each configuration
 */
export declare function batchGetListsEntries(listConfigs: Array<{
    listId: string;
    limit?: number;
    offset?: number;
}>, batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<AttioListEntry[]>>;
//# sourceMappingURL=lists.d.ts.map