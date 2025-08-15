/**
 * UniversalMetadataService - Centralized metadata and attribute operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal metadata discovery and attribute management across all resource types.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import type { UniversalAttributesParams } from '../handlers/tool-configs/universal/types.js';
import { getAttioClient } from '../api/attio-client.js';

// Import resource-specific attribute functions
import {
  getCompanyAttributes,
  discoverCompanyAttributes,
} from '../objects/companies/index.js';
import { getListAttributes } from '../objects/lists.js';

/**
 * UniversalMetadataService provides centralized metadata and attribute operations
 */
export class UniversalMetadataService {
  /**
   * Discover attributes for a specific resource type
   * Special handling for tasks which use /tasks API instead of /objects/tasks
   */
  static async discoverAttributesForResourceType(
    resourceType: UniversalResourceType
  ): Promise<Record<string, unknown>> {
    // Handle tasks as special case - they don't use /objects/{type}/attributes
    if (resourceType === UniversalResourceType.TASKS) {
      return this.discoverTaskAttributes();
    }

    const client = getAttioClient();

    try {
      const response = await client.get(`/objects/${resourceType}/attributes`);
      const attributes = response.data.data || [];

      // Create mapping from title to api_slug for compatibility
      const mappings: Record<string, string> = {};
      attributes.forEach((attr: Record<string, unknown>) => {
        if (
          attr.title &&
          attr.api_slug &&
          typeof attr.title === 'string' &&
          typeof attr.api_slug === 'string'
        ) {
          mappings[attr.title] = attr.api_slug;
        }
      });

      return {
        attributes: attributes,
        mappings: mappings,
        count: attributes.length,
        resource_type: resourceType,
      };
    } catch (error: unknown) {
      console.error(
        `Failed to discover attributes for ${resourceType}:`,
        error
      );
      throw new Error(
        `Failed to discover ${resourceType} attributes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Special discovery method for task attributes
   * Since tasks don't use the standard /objects/{type}/attributes endpoint,
   * we return the known task attributes based on the task API structure.
   */
  static async discoverTaskAttributes(): Promise<Record<string, unknown>> {
    // Define task attributes based on the actual task API structure
    // From /src/api/operations/tasks.ts and field mappings
    const attributes = [
      {
        id: 'content',
        api_slug: 'content',
        title: 'Content',
        type: 'text',
        description: 'The main text/description of the task',
        required: true,
      },
      {
        id: 'status',
        api_slug: 'status',
        title: 'Status',
        type: 'text',
        description: 'Task completion status (e.g., pending, completed)',
        required: false,
      },
      {
        id: 'assignee',
        api_slug: 'assignee',
        title: 'Assignee',
        type: 'person-reference',
        description: 'Person assigned to this task',
        required: false,
      },
      {
        id: 'due_date',
        api_slug: 'due_date',
        title: 'Due Date',
        type: 'date',
        description: 'When the task is due',
        required: false,
      },
      {
        id: 'linked_records',
        api_slug: 'linked_records',
        title: 'Linked Records',
        type: 'record-reference',
        description: 'Records this task is associated with',
        required: false,
      },
    ];

    // Create compatible structure with other resource types
    const mappings: Record<string, string> = {};
    attributes.forEach((attr) => {
      mappings[attr.title] = attr.api_slug;
    });

    return {
      attributes: attributes,
      mappings: mappings,
      count: attributes.length,
      resource_type: UniversalResourceType.TASKS,
      // Task-specific metadata
      api_endpoint: '/tasks',
      supports_objects_api: false,
    };
  }

  /**
   * Get attributes for a specific record of any resource type
   */
  static async getAttributesForRecord(
    resourceType: UniversalResourceType,
    recordId: string
  ): Promise<Record<string, unknown>> {
    const client = getAttioClient();

    try {
      const response = await client.get(
        `/objects/${resourceType}/records/${recordId}`
      );
      return response?.data?.data?.values || {};
    } catch (error: unknown) {
      console.error(
        `Failed to get attributes for ${resourceType} record ${recordId}:`,
        error
      );
      throw new Error(
        `Failed to get record attributes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Filter attributes by category
   */
  static filterAttributesByCategory(
    attributes: Record<string, unknown> | any[],
    requestedCategories?: string[]
  ): Record<string, unknown> | any[] {
    if (!requestedCategories || requestedCategories.length === 0) {
      return attributes; // Return all attributes if no categories specified
    }

    // Handle array of attributes
    if (Array.isArray(attributes)) {
      const filtered = attributes.filter((attr: Record<string, unknown>) => {
        // Check various possible category field names
        const category =
          attr.category || attr.type || attr.attribute_type || attr.group;
        return (
          category &&
          typeof category === 'string' &&
          requestedCategories.includes(category)
        );
      });
      return filtered;
    }

    // Handle object with attributes property
    if (typeof attributes === 'object' && attributes !== null) {
      const attrs = attributes as Record<string, unknown>;
      if (Array.isArray(attrs.attributes)) {
        const filtered = this.filterAttributesByCategory(
          attrs.attributes as any[],
          requestedCategories
        );
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
  static async getAttributes(
    params: UniversalAttributesParams
  ): Promise<Record<string, unknown>> {
    const { resource_type, record_id, categories } = params;

    let result: Record<string, unknown>;

    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
        if (record_id) {
          result = await getCompanyAttributes(record_id);
        } else {
          // Return schema-level attributes if no record_id provided
          result = await discoverCompanyAttributes();
        }
        break;

      case UniversalResourceType.PEOPLE:
        if (record_id) {
          result = await this.getAttributesForRecord(resource_type, record_id);
        } else {
          // Return schema-level attributes if no record_id provided
          result = await this.discoverAttributesForResourceType(resource_type);
        }
        break;

      case UniversalResourceType.LISTS:
        result = await getListAttributes();
        break;

      case UniversalResourceType.RECORDS:
        if (record_id) {
          result = await this.getAttributesForRecord(resource_type, record_id);
        } else {
          result = await this.discoverAttributesForResourceType(resource_type);
        }
        break;

      case UniversalResourceType.DEALS:
        if (record_id) {
          result = await this.getAttributesForRecord(resource_type, record_id);
        } else {
          result = await this.discoverAttributesForResourceType(resource_type);
        }
        break;

      case UniversalResourceType.TASKS:
        if (record_id) {
          result = await this.getAttributesForRecord(resource_type, record_id);
        } else {
          result = await this.discoverAttributesForResourceType(resource_type);
        }
        break;

      default:
        throw new Error(
          `Unsupported resource type for get attributes: ${resource_type}`
        );
    }

    // Apply category filtering if categories parameter was provided
    const filtered = this.filterAttributesByCategory(result, categories);
    return filtered as Record<string, unknown>;
  }

  /**
   * Universal discover attributes handler
   */
  static async discoverAttributes(
    resource_type: UniversalResourceType
  ): Promise<Record<string, unknown>> {
    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
        return discoverCompanyAttributes();

      case UniversalResourceType.PEOPLE:
        return this.discoverAttributesForResourceType(resource_type);

      case UniversalResourceType.LISTS:
        return getListAttributes();

      case UniversalResourceType.RECORDS:
        return this.discoverAttributesForResourceType(resource_type);

      case UniversalResourceType.DEALS:
        return this.discoverAttributesForResourceType(resource_type);

      case UniversalResourceType.TASKS:
        return this.discoverAttributesForResourceType(resource_type);

      default:
        throw new Error(
          `Unsupported resource type for discover attributes: ${resource_type}`
        );
    }
  }
}
