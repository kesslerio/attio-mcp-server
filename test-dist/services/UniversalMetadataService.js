/**
 * UniversalMetadataService - Centralized metadata and attribute operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal metadata discovery and attribute management across all resource types.
 */
import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import { getAttioClient } from '../api/attio-client.js';
import { secureValidateCategories } from '../utils/validation/field-validation.js';
// Import resource-specific attribute functions
import { getCompanyAttributes, discoverCompanyAttributes, } from '../objects/companies/index.js';
import { getListAttributes } from '../objects/lists.js';
/**
 * UniversalMetadataService provides centralized metadata and attribute operations
 */
export class UniversalMetadataService {
    /**
     * Discover attributes for a specific resource type
     * Special handling for tasks which use /tasks API instead of /objects/tasks
     */
    static async discoverAttributesForResourceType(resourceType, options) {
        // Handle tasks as special case - they don't use /objects/{type}/attributes
        if (resourceType === UniversalResourceType.TASKS) {
            return this.discoverTaskAttributes(options);
        }
        const client = getAttioClient();
        try {
            // Convert resource type to API slug (e.g., UniversalResourceType.PEOPLE -> 'people')
            const resourceSlug = resourceType.toLowerCase();
            let path = `/objects/${resourceSlug}/attributes`;
            // NEW: Add category filtering to query parameters with security validation
            if (options?.categories && options.categories.length > 0) {
                // Validate and sanitize category names to prevent injection attacks
                const validatedCategories = secureValidateCategories(options.categories, 'category filtering in get-attributes');
                if (validatedCategories.length > 0) {
                    const categoriesParam = validatedCategories.join(',');
                    path += `?categories=${encodeURIComponent(categoriesParam)}`;
                }
            }
            const response = await client.get(path);
            const attributes = response.data.data || [];
            // Create mapping from title to api_slug for compatibility
            const mappings = {};
            attributes.forEach((attr) => {
                if (attr.title &&
                    attr.api_slug &&
                    typeof attr.title === 'string' &&
                    typeof attr.api_slug === 'string') {
                    mappings[attr.title] = attr.api_slug;
                }
            });
            return {
                attributes: attributes,
                mappings: mappings,
                count: attributes.length,
                resource_type: resourceType,
            };
        }
        catch (error) {
            console.error(`Failed to discover attributes for ${resourceType}:`, error);
            throw new Error(`Failed to discover ${resourceType} attributes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Special discovery method for task attributes
     * Since tasks don't use the standard /objects/{type}/attributes endpoint,
     * we return the known task attributes based on the task API structure.
     */
    static async discoverTaskAttributes(options) {
        // Define task attributes based on the actual task API structure
        // From /src/api/operations/tasks.ts and field mappings
        const attributes = [
            {
                id: 'content',
                api_slug: 'content',
                title: 'Content',
                type: 'text',
                category: 'basic', // NEW: Add category for filtering
                description: 'The main text/description of the task',
                required: true,
            },
            {
                id: 'status',
                api_slug: 'is_completed', // Correct Attio API field name
                title: 'Status',
                type: 'text',
                category: 'basic', // NEW: Add category for filtering
                description: 'Task completion status (e.g., pending, completed)',
                required: false,
            },
            {
                id: 'assignee',
                api_slug: 'assignee',
                title: 'Assignee',
                type: 'person-reference',
                category: 'business', // NEW: Add category for filtering
                description: 'Person assigned to this task',
                required: false,
            },
            {
                id: 'assignee_id',
                api_slug: 'assignee_id',
                title: 'Assignee ID',
                type: 'text',
                category: 'business', // NEW: Add category for filtering
                description: 'ID of the workspace member assigned to this task',
                required: false,
            },
            {
                id: 'due_date',
                api_slug: 'due_date',
                title: 'Due Date',
                type: 'date',
                category: 'basic', // NEW: Add category for filtering
                description: 'When the task is due (ISO date format)',
                required: false,
            },
            {
                id: 'linked_records',
                api_slug: 'linked_records',
                title: 'Linked Records',
                type: 'record-reference',
                category: 'business', // NEW: Add category for filtering
                description: 'Records this task is associated with',
                required: false,
            },
        ];
        // Create compatible structure with other resource types
        const mappings = {};
        attributes.forEach((attr) => {
            mappings[attr.title] = attr.api_slug;
        });
        // Add common field mappings for task creation
        mappings['title'] = 'content';
        mappings['name'] = 'content';
        mappings['description'] = 'content';
        mappings['assignee'] = 'assignee_id';
        mappings['due'] = 'due_date';
        mappings['record'] = 'record_id';
        // NEW: Apply category filtering if categories parameter was provided
        let filteredAttributes = attributes;
        if (options?.categories && options.categories.length > 0) {
            filteredAttributes = attributes.filter((attr) => options.categories.includes(attr.category));
        }
        return {
            attributes: filteredAttributes,
            mappings: mappings,
            count: filteredAttributes.length, // NEW: Use filtered count
            resource_type: UniversalResourceType.TASKS,
            // Task-specific metadata
            api_endpoint: '/tasks',
            supports_objects_api: false,
        };
    }
    /**
     * Get attributes for a specific record of any resource type
     */
    static async getAttributesForRecord(resourceType, recordId) {
        const client = getAttioClient();
        try {
            // Convert resource type to API slug (e.g., UniversalResourceType.PEOPLE -> 'people')
            const resourceSlug = resourceType.toLowerCase();
            const response = await client.get(`/objects/${resourceSlug}/records/${recordId}`);
            return response?.data?.data?.values || {};
        }
        catch (error) {
            console.error(`Failed to get attributes for ${resourceType} record ${recordId}:`, error);
            throw new Error(`Failed to get record attributes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Filter attributes by category
     */
    static filterAttributesByCategory(attributes, requestedCategories) {
        if (!requestedCategories || requestedCategories.length === 0) {
            return attributes; // Return all attributes if no categories specified
        }
        // Handle array of attributes
        if (Array.isArray(attributes)) {
            const filtered = attributes.filter((attr) => {
                // Check various possible category field names
                const category = attr.category || attr.type || attr.attribute_type || attr.group;
                return (category &&
                    typeof category === 'string' &&
                    requestedCategories.includes(category));
            });
            return filtered;
        }
        // Handle object with attributes property
        if (typeof attributes === 'object' && attributes !== null) {
            const attrs = attributes;
            if (Array.isArray(attrs.attributes)) {
                const filtered = this.filterAttributesByCategory(attrs.attributes, requestedCategories);
                return {
                    ...attrs,
                    attributes: filtered,
                    count: Array.isArray(filtered) ? filtered.length : 0,
                };
            }
        }
        // If neither array nor object with attributes, return as-is
        return attributes;
    }
    /**
     * Universal get attributes handler
     */
    static async getAttributes(params) {
        const { resource_type, record_id, categories } = params;
        let result;
        switch (resource_type) {
            case UniversalResourceType.COMPANIES:
                if (record_id) {
                    result = await getCompanyAttributes(record_id);
                }
                else {
                    // Return schema-level attributes if no record_id provided
                    result = await discoverCompanyAttributes();
                }
                break;
            case UniversalResourceType.PEOPLE:
                if (record_id) {
                    result = await this.getAttributesForRecord(resource_type, record_id);
                }
                else {
                    // Return schema-level attributes if no record_id provided
                    result = await this.discoverAttributesForResourceType(resource_type, {
                        categories,
                    });
                }
                break;
            case UniversalResourceType.LISTS:
                result = await getListAttributes();
                break;
            case UniversalResourceType.RECORDS:
                if (record_id) {
                    result = await this.getAttributesForRecord(resource_type, record_id);
                }
                else {
                    result = await this.discoverAttributesForResourceType(resource_type, {
                        categories,
                    });
                }
                break;
            case UniversalResourceType.DEALS:
                if (record_id) {
                    result = await this.getAttributesForRecord(resource_type, record_id);
                }
                else {
                    result = await this.discoverAttributesForResourceType(resource_type, {
                        categories,
                    });
                }
                break;
            case UniversalResourceType.TASKS:
                if (record_id) {
                    result = await this.getAttributesForRecord(resource_type, record_id);
                }
                else {
                    result = await this.discoverAttributesForResourceType(resource_type, {
                        categories,
                    });
                }
                break;
            default:
                throw new Error(`Unsupported resource type for get attributes: ${resource_type}`);
        }
        // Apply category filtering if categories parameter was provided
        const filtered = this.filterAttributesByCategory(result, categories);
        return filtered;
    }
    /**
     * Universal discover attributes handler
     */
    static async discoverAttributes(resource_type, options) {
        switch (resource_type) {
            case UniversalResourceType.COMPANIES:
                return discoverCompanyAttributes();
            case UniversalResourceType.PEOPLE:
                return this.discoverAttributesForResourceType(resource_type, options);
            case UniversalResourceType.LISTS:
                return getListAttributes();
            case UniversalResourceType.RECORDS:
                return this.discoverAttributesForResourceType(resource_type, options);
            case UniversalResourceType.DEALS:
                return this.discoverAttributesForResourceType(resource_type, options);
            case UniversalResourceType.TASKS:
                return this.discoverAttributesForResourceType(resource_type, options);
            default:
                throw new Error(`Unsupported resource type for discover attributes: ${resource_type}`);
        }
    }
}
