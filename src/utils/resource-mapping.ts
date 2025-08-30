/**
 * Resource Mapping Utilities
 *
 * Handles mapping between universal resource types and Attio API paths.
 * Fixes the double-prefix issue for lists and provides consistent path generation.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';

/**
 * Resource mapping service
 */
export class ResourceMapper {
  /**
   * Get the API base path for a resource type
   */
  static getBasePath(resourceType: string): string {
    if (!config) {
      // For unknown types, check if it's a custom object type
      // Custom objects typically use /objects/{type} format
      if (this.isCustomObjectType(resourceType)) {
        return `/objects/${resourceType.toLowerCase()}`;
      }

      // Default fallback for completely unknown types
      console.warn(
        `Unknown resource type: ${resourceType}, using generic records path`
      );
      return '/records';
    }

    return config.basePath;
  }

  /**
   * Get the full API path for a specific resource record
   */
  static getResourcePath(resourceType: string, recordId?: string): string {
    if (recordId) {
      return `${basePath}/${recordId}`;
    }

    return basePath;
  }

  /**
   * Get the search path for a resource type
   */
  static getSearchPath(resourceType: string): string {
    // Lists use a different search endpoint
    if (resourceType.toLowerCase() === 'lists') {
      return '/lists';
    }

    // Most resources append /query for search
    return `${basePath}/query`;
  }

  /**
   * Get the singular form of a resource type
   */
  static getSingular(resourceType: string): string {
    return config?.singular || resourceType.toLowerCase();
  }

  /**
   * Get the plural form of a resource type
   */
  static getPlural(resourceType: string): string {
    return config?.plural || resourceType.toLowerCase();
  }

  /**
   * Check if a resource type is a standard Attio type
   */
  static isStandardType(resourceType: string): boolean {
    return resourceType.toLowerCase() in RESOURCE_PATH_MAP;
  }

  /**
   * Check if a resource type is likely a custom object type
   */
  static isCustomObjectType(resourceType: string): boolean {
    // Standard types are not custom
    if (this.isStandardType(resourceType)) {
      return false;
    }

    // Custom object types typically:
    // - Don't contain special characters (except underscore)
    // - Are lowercase or have consistent casing
    // - Don't match reserved keywords

    return (
      customObjectPattern.test(resourceType) &&
      !reservedKeywords.includes(resourceType.toLowerCase())
    );
  }

  /**
   * Normalize a resource type to its canonical form
   */
  static normalizeResourceType(resourceType: string): string {
    // Handle common variations
    const variations: Record<string, string> = {
      company: 'companies',
      person: 'people',
      deal: 'deals',
      task: 'tasks',
      list: 'lists',
      note: 'notes',
      record: 'records',
      object: 'objects',
    };

    return variations[lowercased] || lowercased;
  }

  /**
   * Validate a resource type
   */
  static isValidResourceType(resourceType: string): boolean {
    // Check if it's a universal resource type enum value
    if (
      Object.values(UniversalResourceType).includes(
        resourceType as UniversalResourceType
      )
    ) {
      return true;
    }

    // Check if it's a known standard type
    if (this.isStandardType(resourceType)) {
      return true;
    }

    // Check if it could be a custom object type
    if (this.isCustomObjectType(resourceType)) {
      return true;
    }

    return false;
  }

  /**
   * Get the ID prefix for a resource type
   */
  static getIdPrefix(resourceType: string): string | undefined {
    return config?.idPrefix;
  }

  /**
   * Validate if an ID matches the expected format for a resource type
   */
  static isValidIdFormat(resourceType: string, id: string): boolean {
    // If we have a known prefix, check if the ID starts with it
    if (prefix) {
      return id.startsWith(prefix);
    }

    // For unknown types, just check basic format
    // IDs should be alphanumeric with underscores and hyphens
    return genericIdPattern.test(id);
  }

  /**
   * Get attributes path for a resource type
   */
  static getAttributesPath(resourceType: string): string {
    // Attributes are typically at the object level, not record level

    // Special handling for lists
    if (normalized === 'lists') {
      return '/lists/attributes';
    }

    // Standard objects use /objects/{type}/attributes
    if (['companies', 'people', 'deals', 'tasks'].includes(normalized)) {
      return `/objects/${normalized}/attributes`;
    }

    // Custom objects
    if (this.isCustomObjectType(resourceType)) {
      return `/objects/${resourceType.toLowerCase()}/attributes`;
    }

    // Fallback
    return `/objects/attributes`;
  }

  /**
   * Build query parameters for list operations
   */
  static buildListQueryParams(params: {
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    [key: string]: unknown;
  }): URLSearchParams {
    // Add pagination params
    if (params.limit !== undefined) {
      queryParams.append('limit', String(params.limit));
    }
    if (params.offset !== undefined) {
      queryParams.append('offset', String(params.offset));
    }

    // Add sorting params
    if (params.sort_by) {
      queryParams.append('sort_by', params.sort_by);
    }
    if (params.sort_order) {
      queryParams.append('sort_order', params.sort_order);
    }

    // Add any other params
    for (const [key, value] of Object.entries(params)) {
      if (
        !['limit', 'offset', 'sort_by', 'sort_order'].includes(key) &&
        value !== undefined
      ) {
        if (typeof value === 'object') {
          queryParams.append(key, JSON.stringify(value));
        } else {
          queryParams.append(key, String(value));
        }
      }
    }

    return queryParams;
  }
}

/**
 * Helper function to get resource path (for backward compatibility)
 */
export function getResourcePath(
  resourceType: string,
  recordId?: string
): string {
  return ResourceMapper.getResourcePath(resourceType, recordId);
}

/**
 * Helper function to get search path (for backward compatibility)
 */
export function getSearchPath(resourceType: string): string {
  return ResourceMapper.getSearchPath(resourceType);
}

/**
 * Helper function to normalize resource type (for backward compatibility)
 */
export function normalizeResourceType(resourceType: string): string {
  return ResourceMapper.normalizeResourceType(resourceType);
}
