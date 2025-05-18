/**
 * Search operations for Attio objects
 * Handles basic and advanced search functionality
 */
import { AttioRecord, ResourceType } from '../../types/attio.js';
import { RetryConfig } from './retry.js';
import { ListEntryFilters } from './types.js';
/**
 * Generic function to search any object type by name, email, or phone (when applicable)
 *
 * @param objectType - The type of object to search (people or companies)
 * @param query - Search query string
 * @param retryConfig - Optional retry configuration
 * @returns Array of matching records
 */
export declare function searchObject<T extends AttioRecord>(objectType: ResourceType, query: string, retryConfig?: Partial<RetryConfig>): Promise<T[]>;
/**
 * Generic function to search any object type with advanced filtering capabilities
 *
 * @param objectType - The type of object to search (people or companies)
 * @param filters - Optional filters to apply
 * @param limit - Maximum number of results to return (optional)
 * @param offset - Number of results to skip (optional)
 * @param retryConfig - Optional retry configuration
 * @returns Array of matching records
 */
export declare function advancedSearchObject<T extends AttioRecord>(objectType: ResourceType, filters?: ListEntryFilters, limit?: number, offset?: number, retryConfig?: Partial<RetryConfig>): Promise<T[]>;
/**
 * Generic function to list any object type with pagination and sorting
 *
 * @param objectType - The type of object to list (people or companies)
 * @param limit - Maximum number of results to return
 * @param retryConfig - Optional retry configuration
 * @returns Array of records
 */
export declare function listObjects<T extends AttioRecord>(objectType: ResourceType, limit?: number, retryConfig?: Partial<RetryConfig>): Promise<T[]>;
//# sourceMappingURL=search.d.ts.map