/**
 * List Mock Factory
 *
 * Generates mock AttioList data for list resources.
 *
 * This factory creates realistic list mock data matching the Attio API
 * response format for lists and list entries.
 */
import { TestEnvironment } from './test-environment.js';
import { UUIDMockGenerator } from './uuid-mock-generator.js';
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
export class ListMockFactory {
    /**
     * Generates a unique mock list ID in UUID format
     *
     * Uses deterministic UUID generation for consistent performance testing
     * while satisfying UUID validation requirements (addresses PR #483).
     */
    static generateMockId() {
        return UUIDMockGenerator.generateListUUID();
    }
    /**
     * Creates a mock AttioList with realistic data
     *
     * @param overrides - Optional overrides for specific fields
     * @returns Mock AttioList matching API response format
     */
    static create(overrides = {}) {
        const listId = this.generateMockId();
        const now = new Date().toISOString();
        const listNumber = this.extractNumberFromId(listId);
        // Generate realistic list data
        const title = overrides.title || overrides.name || `Mock List ${listNumber}`;
        const objectSlug = overrides.object_slug || overrides.parent_object || 'companies';
        const baseList = {
            id: {
                list_id: listId,
                workspace_id: overrides.workspace_id || 'mock-workspace-id'
            },
            title,
            name: overrides.name || title, // Some API responses use name, others use title
            description: overrides.description || `Mock list created for testing purposes - ${listNumber}`,
            object_slug: objectSlug,
            workspace_id: overrides.workspace_id || 'mock-workspace-id',
            created_at: overrides.created_at || now,
            updated_at: overrides.updated_at || now,
            entry_count: overrides.entry_count || Math.floor(Math.random() * 100)
        };
        // Add optional fields
        if (overrides.api_slug) {
            baseList.api_slug = overrides.api_slug;
        }
        if (overrides.workspace_member_access) {
            baseList.workspace_member_access = overrides.workspace_member_access;
        }
        // Add any additional overrides
        Object.entries(overrides).forEach(([key, value]) => {
            if (!['name', 'title', 'description', 'parent_object', 'object_slug', 'workspace_id', 'entry_count', 'created_at', 'updated_at', 'api_slug', 'workspace_member_access'].includes(key)) {
                baseList[key] = value;
            }
        });
        TestEnvironment.log(`Created mock list: ${listId}`, {
            title,
            objectSlug,
            entryCount: baseList.entry_count
        });
        return baseList;
    }
    /**
     * Creates multiple mock lists
     *
     * @param count - Number of lists to create
     * @param overrides - Optional overrides applied to all lists
     * @returns Array of mock AttioList objects
     */
    static createMultiple(count, overrides = {}) {
        return Array.from({ length: count }, (_, index) => {
            const listNumber = index + 1;
            return this.create({
                ...overrides,
                name: overrides.name || `Mock List ${listNumber}`,
                title: overrides.title || overrides.name || `Mock List ${listNumber}`
            });
        });
    }
    /**
     * Creates a company list mock
     */
    static createCompanyList(overrides = {}) {
        return this.create({
            ...overrides,
            parent_object: 'companies',
            object_slug: 'companies',
            name: overrides.name || 'Mock Company List',
            description: overrides.description || 'Mock company list for testing purposes'
        });
    }
    /**
     * Creates a person list mock
     */
    static createPersonList(overrides = {}) {
        return this.create({
            ...overrides,
            parent_object: 'people',
            object_slug: 'people',
            name: overrides.name || 'Mock People List',
            description: overrides.description || 'Mock people list for testing purposes'
        });
    }
    /**
     * Creates a deal list mock
     */
    static createDealList(overrides = {}) {
        return this.create({
            ...overrides,
            parent_object: 'deals',
            object_slug: 'deals',
            name: overrides.name || 'Mock Deal List',
            description: overrides.description || 'Mock deal list for testing purposes'
        });
    }
    /**
     * Creates a list entry mock
     *
     * @param listId - ID of the parent list
     * @param recordId - ID of the record being added to the list
     * @param overrides - Optional overrides for specific fields
     * @returns Mock AttioListEntry
     */
    static createListEntry(listId, recordId, overrides = {}) {
        const entryId = `mock-entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        const baseEntry = {
            id: {
                entry_id: entryId
            },
            list_id: listId,
            record_id: recordId,
            created_at: overrides.created_at || now,
            updated_at: overrides.updated_at || now
        };
        // Add optional fields
        if (overrides.parent_record_id) {
            baseEntry.parent_record_id = overrides.parent_record_id;
        }
        if (overrides.reference_id) {
            baseEntry.reference_id = overrides.reference_id;
        }
        if (overrides.object_id) {
            baseEntry.object_id = overrides.object_id;
        }
        if (overrides.record) {
            baseEntry.record = overrides.record;
        }
        TestEnvironment.log(`Created mock list entry: ${entryId}`, {
            listId,
            recordId
        });
        return baseEntry;
    }
    /**
     * Creates multiple list entries for a list
     *
     * @param listId - ID of the parent list
     * @param recordIds - Array of record IDs to add to the list
     * @param overrides - Optional overrides applied to all entries
     * @returns Array of mock AttioListEntry objects
     */
    static createMultipleListEntries(listId, recordIds, overrides = {}) {
        return recordIds.map(recordId => this.createListEntry(listId, recordId, overrides));
    }
    /**
     * Implementation of MockFactory interface
     */
    create(overrides = {}) {
        return ListMockFactory.create(overrides);
    }
    createMultiple(count, overrides = {}) {
        return ListMockFactory.createMultiple(count, overrides);
    }
    generateMockId() {
        return ListMockFactory.generateMockId();
    }
    /**
     * Private helper to extract number from generated ID
     */
    static extractNumberFromId(id) {
        const match = id.match(/(\d+)/);
        return match ? match[1].slice(-4) : Math.floor(Math.random() * 9999).toString();
    }
}
/**
 * Convenience export for direct usage
 */
export default ListMockFactory;
//# sourceMappingURL=ListMockFactory.js.map