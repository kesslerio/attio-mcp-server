/**
 * List Mock Factory
 *
 * Generates mock AttioList data for list resources.
 *
 * This factory creates realistic list mock data matching the Attio API
 * response format for lists and list entries.
 */
import type { AttioList, AttioListEntry, AttioRecord } from '../../../src/types/attio.js';
import type { MockFactory } from './TaskMockFactory.js';
/**
 * Interface for mock list factory options
 */
export interface MockListOptions {
    name?: string;
    title?: string;
    description?: string;
    parent_object?: string;
    object_slug?: string;
    workspace_id?: string;
    entry_count?: number;
    created_at?: string;
    updated_at?: string;
    api_slug?: string;
    workspace_member_access?: string;
    [key: string]: unknown;
}
/**
 * Interface for mock list entry factory options
 */
export interface MockListEntryOptions {
    list_id?: string;
    record_id?: string;
    parent_record_id?: string;
    reference_id?: string;
    object_id?: string;
    record?: Partial<AttioRecord>;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}
/**
 * ListMockFactory - Generates mock AttioList data for lists
 *
 * Creates mock list data that matches the Attio API response format
 * for both lists and list entries.
 *
 * @example
 * ```typescript
 * // Basic list
 * const list = ListMockFactory.create();
 *
 * // Company list with custom data
 * const companyList = ListMockFactory.create({
 *   name: 'Important Clients',
 *   parent_object: 'companies'
 * });
 *
 * // Multiple lists
 * const lists = ListMockFactory.createMultiple(5);
 * ```
 */
export declare class ListMockFactory implements MockFactory<AttioList> {
    /**
     * Generates a unique mock list ID in UUID format
     *
     * Uses deterministic UUID generation for consistent performance testing
     * while satisfying UUID validation requirements (addresses PR #483).
     */
    static generateMockId(): string;
    /**
     * Creates a mock AttioList with realistic data
     *
     * @param overrides - Optional overrides for specific fields
     * @returns Mock AttioList matching API response format
     */
    static create(overrides?: MockListOptions): AttioList;
    /**
     * Creates multiple mock lists
     *
     * @param count - Number of lists to create
     * @param overrides - Optional overrides applied to all lists
     * @returns Array of mock AttioList objects
     */
    static createMultiple(count: number, overrides?: MockListOptions): AttioList[];
    /**
     * Creates a company list mock
     */
    static createCompanyList(overrides?: MockListOptions): AttioList;
    /**
     * Creates a person list mock
     */
    static createPersonList(overrides?: MockListOptions): AttioList;
    /**
     * Creates a deal list mock
     */
    static createDealList(overrides?: MockListOptions): AttioList;
    /**
     * Creates a list entry mock
     *
     * @param listId - ID of the parent list
     * @param recordId - ID of the record being added to the list
     * @param overrides - Optional overrides for specific fields
     * @returns Mock AttioListEntry
     */
    static createListEntry(listId: string, recordId: string, overrides?: MockListEntryOptions): AttioListEntry;
    /**
     * Creates multiple list entries for a list
     *
     * @param listId - ID of the parent list
     * @param recordIds - Array of record IDs to add to the list
     * @param overrides - Optional overrides applied to all entries
     * @returns Array of mock AttioListEntry objects
     */
    static createMultipleListEntries(listId: string, recordIds: string[], overrides?: MockListEntryOptions): AttioListEntry[];
    /**
     * Implementation of MockFactory interface
     */
    create(overrides?: MockListOptions): AttioList;
    createMultiple(count: number, overrides?: MockListOptions): AttioList[];
    generateMockId(): string;
    /**
     * Private helper to extract number from generated ID
     */
    private static extractNumberFromId;
}
/**
 * Convenience export for direct usage
 */
export default ListMockFactory;
//# sourceMappingURL=ListMockFactory.d.ts.map