/**
 * Lists-related functionality
 */
import { 
  getAllLists, 
  getListDetails as getListDetailsOperation, 
  getListEntries as getListEntriesOperation, 
  addRecordToList as addRecordToListOperation, 
  removeRecordFromList as removeRecordFromListOperation 
} from "../api/attio-operations.js";
import { 
  AttioList, 
  AttioListEntry 
} from "../types/attio.js";

/**
 * Gets all lists in the workspace
 * 
 * @param objectSlug - Optional object type to filter lists by (e.g., 'companies', 'people')
 * @param limit - Maximum number of lists to fetch (default: 20)
 * @returns Array of list objects
 */
export async function getLists(objectSlug?: string, limit: number = 20): Promise<AttioList[]> {
  try {
    return await getAllLists(objectSlug, limit);
  } catch (error) {
    // Re-throw original errors to maintain error context
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Gets details for a specific list
 * 
 * @param listId - The ID of the list
 * @returns List details
 */
export async function getListDetails(listId: string): Promise<AttioList> {
  try {
    return await getListDetailsOperation(listId);
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Gets entries for a specific list
 * 
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch (default: 20)
 * @param offset - Number of entries to skip (default: 0)
 * @returns Array of list entries
 */
export async function getListEntries(
  listId: string, 
  limit: number = 20, 
  offset: number = 0
): Promise<AttioListEntry[]> {
  try {
    return await getListEntriesOperation(listId, limit, offset);
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Adds a record to a list
 * 
 * @param listId - The ID of the list
 * @param recordId - The ID of the record to add
 * @returns The created list entry
 */
export async function addRecordToList(
  listId: string, 
  recordId: string
): Promise<AttioListEntry> {
  try {
    return await addRecordToListOperation(listId, recordId);
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Removes a record from a list
 * 
 * @param listId - The ID of the list
 * @param entryId - The ID of the list entry to remove
 * @returns True if successful
 */
export async function removeRecordFromList(
  listId: string, 
  entryId: string
): Promise<boolean> {
  try {
    return await removeRecordFromListOperation(listId, entryId);
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}