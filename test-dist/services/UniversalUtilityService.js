/**
 * UniversalUtilityService - Centralized utility functions
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal utility functions for resource type formatting, validation, and data conversion.
 */
import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
/**
 * UniversalUtilityService provides centralized utility functions
 */
export class UniversalUtilityService {
    /**
     * Utility function to format resource type for display
     */
    static formatResourceType(resourceType) {
        switch (resourceType) {
            case UniversalResourceType.COMPANIES:
                return 'company';
            case UniversalResourceType.PEOPLE:
                return 'person';
            case UniversalResourceType.LISTS:
                return 'list';
            case UniversalResourceType.RECORDS:
                return 'record';
            case UniversalResourceType.DEALS:
                return 'deal';
            case UniversalResourceType.TASKS:
                return 'task';
            default:
                return resourceType;
        }
    }
    /**
     * Utility function to get singular form of resource type
     */
    static getSingularResourceType(resourceType) {
        return this.formatResourceType(resourceType);
    }
    /**
     * Utility function to validate resource type
     */
    static isValidResourceType(resourceType) {
        return Object.values(UniversalResourceType).includes(resourceType);
    }
    /**
     * Converts an AttioTask to an AttioRecord for universal tool compatibility.
     *
     * This function provides proper type conversion from the task-specific format
     * to the generic record format used by universal tools, ensuring data integrity
     * without unsafe type casting.
     *
     * @param task - The AttioTask object to convert
     * @returns An AttioRecord representation of the task with properly mapped fields
     *
     * @example
     * const task = await getTask('task-123');
     * const record = UniversalUtilityService.convertTaskToRecord(task);
     * // record.values now contains: content, status, assignee, due_date, linked_records
     */
    static convertTaskToRecord(task) {
        // Note: Debug logging moved to development utilities
        // More robust ID handling
        let record_id;
        let workspace_id = '';
        if (task.id) {
            // Handle different possible ID structures
            if (typeof task.id === 'string') {
                record_id = task.id;
            }
            else if (typeof task.id === 'object' && task.id !== null) {
                if ('task_id' in task.id) {
                    record_id = task.id.task_id;
                }
                else if ('id' in task.id) {
                    record_id = task.id.id;
                }
                else {
                    throw new Error(`Task ID structure not recognized: ${JSON.stringify(task.id)}`);
                }
                workspace_id =
                    task.id.workspace_id || '';
            }
            else {
                throw new Error(`Task ID structure not recognized: ${JSON.stringify(task.id)}`);
            }
        }
        else {
            throw new Error(`Task missing id property: ${JSON.stringify(task)}`);
        }
        const baseRecord = {
            id: {
                record_id,
                task_id: record_id, // Issue #480: Preserve task_id for E2E test compatibility
                object_id: 'tasks',
                workspace_id,
            },
            values: {
                // Map task properties to proper AttioRecord array format
                content: [{ value: task.content }],
                status: [{ value: task.status }],
                assignee: task.assignee
                    ? [
                        {
                            value: typeof task.assignee === 'string'
                                ? task.assignee
                                : task.assignee.id,
                            name: typeof task.assignee === 'string'
                                ? undefined
                                : task.assignee.name,
                        },
                    ]
                    : undefined,
                due_date: task.due_date ? [{ value: task.due_date }] : undefined,
                linked_records: task.linked_records || undefined,
            },
            created_at: task.created_at,
            updated_at: task.updated_at,
        };
        // Add flat field compatibility for test environments (Issue #480 pattern)
        const flatFields = {
            content: task.content,
            status: task.status,
            due_date: task.due_date,
            assignee_id: typeof task.assignee === 'string' ? task.assignee : task.assignee?.id,
        };
        // Add assignee object format if assignee provided
        if (task.assignee) {
            flatFields.assignee = {
                id: typeof task.assignee === 'string' ? task.assignee : task.assignee.id,
                type: typeof task.assignee === 'string'
                    ? 'person'
                    : task.assignee.type || 'person',
                name: typeof task.assignee === 'string' ? undefined : task.assignee.name,
            };
        }
        return { ...baseRecord, ...flatFields };
    }
    /**
     * Extract display name from AttioRecord values with proper field priority
     *
     * Centralizes the logic for determining display names from record field values.
     * Handles both direct object access and array-wrapped values patterns used
     * throughout the codebase. Eliminates code duplication between formatResult functions.
     *
     * Field Priority Order:
     * 1. name (checks both 'value' and 'full_name' properties)
     * 2. full_name
     * 3. title
     * 4. content
     * 5. fallback to 'Unnamed'
     *
     * @param values - The record values object (can be from record.values or direct values)
     * @returns The extracted display name string or 'Unnamed' if no suitable field found
     *
     * @example
     * ```typescript
     * const displayName = UniversalUtilityService.extractDisplayName(record.values);
     * // For tasks: "Follow up with client" (from content field)
     * // For companies: "Acme Corp" (from name field)
     * // For empty record: "Unnamed"
     * ```
     */
    static extractDisplayName(values) {
        if (!values || typeof values !== 'object') {
            return 'Unnamed';
        }
        // Helper function to safely extract value from field
        const extractFieldValue = (field) => {
            if (!field)
                return null;
            if (Array.isArray(field) && field.length > 0) {
                const firstItem = field[0];
                // For name field, check both 'value' and 'full_name' properties
                return firstItem?.value || firstItem?.full_name || null;
            }
            return null;
        };
        // Check fields in priority order
        const fieldPriority = ['name', 'full_name', 'title', 'content'];
        for (const fieldName of fieldPriority) {
            const fieldValue = extractFieldValue(values[fieldName]);
            if (fieldValue && typeof fieldValue === 'string' && fieldValue.trim()) {
                return fieldValue.trim();
            }
        }
        return 'Unnamed';
    }
    /**
     * Get the plural form of a resource type (opposite of getSingularResourceType)
     */
    static getPluralResourceType(resourceType) {
        return resourceType; // UniversalResourceType values are already plural
    }
    /**
     * Check if a resource type supports object records API
     */
    static supportsObjectRecordsApi(resourceType) {
        switch (resourceType) {
            case UniversalResourceType.RECORDS:
            case UniversalResourceType.DEALS:
                return true;
            case UniversalResourceType.TASKS:
                return false; // Tasks use /tasks API, not /objects/tasks
            case UniversalResourceType.COMPANIES:
            case UniversalResourceType.PEOPLE:
            case UniversalResourceType.LISTS:
                return true; // These use their own specific APIs, but also support objects pattern
            default:
                return false;
        }
    }
    /**
     * Get the API endpoint pattern for a resource type
     */
    static getApiEndpoint(resourceType) {
        switch (resourceType) {
            case UniversalResourceType.COMPANIES:
                return '/companies';
            case UniversalResourceType.PEOPLE:
                return '/people';
            case UniversalResourceType.LISTS:
                return '/lists';
            case UniversalResourceType.RECORDS:
                return '/objects/records';
            case UniversalResourceType.DEALS:
                return '/objects/deals';
            case UniversalResourceType.TASKS:
                return '/tasks';
            default:
                throw new Error(`Unknown resource type: ${resourceType}`);
        }
    }
    /**
     * Check if a resource type requires special handling
     */
    static requiresSpecialHandling(resourceType) {
        switch (resourceType) {
            case UniversalResourceType.TASKS:
                return true; // Tasks have different API structure
            case UniversalResourceType.COMPANIES:
            case UniversalResourceType.PEOPLE:
                return true; // Have specialized APIs with additional features
            default:
                return false;
        }
    }
    /**
     * Normalize resource type string (handle case variations and common aliases)
     */
    static normalizeResourceType(input) {
        const normalized = input.toLowerCase().trim();
        switch (normalized) {
            case 'company':
            case 'companies':
                return UniversalResourceType.COMPANIES;
            case 'person':
            case 'people':
                return UniversalResourceType.PEOPLE;
            case 'list':
            case 'lists':
                return UniversalResourceType.LISTS;
            case 'record':
            case 'records':
                return UniversalResourceType.RECORDS;
            case 'deal':
            case 'deals':
                return UniversalResourceType.DEALS;
            case 'task':
            case 'tasks':
                return UniversalResourceType.TASKS;
            default:
                // Check if it's already a valid UniversalResourceType
                if (this.isValidResourceType(input)) {
                    return input;
                }
                return null;
        }
    }
    /**
     * Get human-readable description of a resource type
     */
    static getResourceTypeDescription(resourceType) {
        switch (resourceType) {
            case UniversalResourceType.COMPANIES:
                return 'Company records containing business information';
            case UniversalResourceType.PEOPLE:
                return 'Person records containing contact information';
            case UniversalResourceType.LISTS:
                return 'Lists for organizing and grouping records';
            case UniversalResourceType.RECORDS:
                return 'Generic object records';
            case UniversalResourceType.DEALS:
                return 'Deal records for sales pipeline management';
            case UniversalResourceType.TASKS:
                return 'Task records for activity tracking';
            default:
                return `${resourceType} records`;
        }
    }
}
