/**
 * UniversalMetadataService - Centralized metadata and attribute operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal metadata discovery and attribute management across all resource types.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import type { UniversalAttributesParams } from '../handlers/tool-configs/universal/types.js';
import { getLazyAttioClient } from '../api/lazy-client.js';
import { secureValidateCategories } from '../utils/validation/field-validation.js';
import { CachingService } from './CachingService.js';
import { OBJECT_SLUG_MAP } from '../constants/universal.constants.js';
import type {
  AttioAttribute,
  AttributeResponse,
  UnknownRecord,
} from '../types/service-types.js';
import { isAttioAttribute } from '../types/service-types.js';
import {
  debug,
  error,
  info,
  OperationType,
  createScopedLogger,
} from '../utils/logger.js';

// Import resource-specific attribute functions
import {
  getCompanyAttributes,
  discoverCompanyAttributes,
} from '../objects/companies/index.js';
import { getListAttributes } from '../objects/lists.js';

// Create scoped logger for this service
const logger = createScopedLogger(
  'UniversalMetadataService',
  undefined,
  OperationType.DATA_PROCESSING
);

/**
 * Performance metrics tracking for attribute discovery operations
 */
class AttributeDiscoveryMetrics {
  private static metrics: Array<{
    timestamp: number;
    resourceType: string;
    objectSlug?: string;
    duration: number;
    cacheHit: boolean;
    attributeCount: number;
    error?: string;
  }> = [];

  static recordDiscovery(
    resourceType: string,
    duration: number,
    options?: {
      objectSlug?: string;
      cacheHit?: boolean;
      attributeCount?: number;
      error?: string;
    }
  ): void {
    this.metrics.push({
      timestamp: Date.now(),
      resourceType,
      objectSlug: options?.objectSlug,
      duration,
      cacheHit: options?.cacheHit || false,
      attributeCount: options?.attributeCount || 0,
      error: options?.error,
    });

    // Keep only last 1000 entries to prevent memory growth
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    // Log performance info
    if (options?.cacheHit) {
      debug('UniversalMetadataService', 'Attribute discovery cache hit', {
        resourceType,
        objectSlug: options.objectSlug,
        duration,
        attributeCount: options.attributeCount,
      });
    } else {
      info('UniversalMetadataService', 'Attribute discovery completed', {
        resourceType,
        objectSlug: options?.objectSlug,
        duration,
        attributeCount: options?.attributeCount,
        performance:
          duration < 1000 ? 'good' : duration < 3000 ? 'moderate' : 'slow',
      });
    }
  }

  static getMetrics(options?: {
    resourceType?: string;
    since?: number; // timestamp
    includeErrors?: boolean;
  }) {
    let filtered = this.metrics;

    if (options?.resourceType) {
      filtered = filtered.filter(
        (m) => m.resourceType === options.resourceType
      );
    }

    if (options?.since) {
      filtered = filtered.filter((m) => m.timestamp >= options.since!);
    }

    if (!options?.includeErrors) {
      filtered = filtered.filter((m) => !m.error);
    }

    const totalRequests = filtered.length;
    const cacheHits = filtered.filter((m) => m.cacheHit).length;
    const totalDuration = filtered.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = totalRequests > 0 ? totalDuration / totalRequests : 0;
    const errors = filtered.filter((m) => m.error).length;

    return {
      totalRequests,
      cacheHits,
      cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
      avgDuration,
      totalDuration,
      errors,
      errorRate: totalRequests > 0 ? errors / totalRequests : 0,
      slowRequests: filtered.filter((m) => m.duration > 3000).length,
      byResourceType: this.getResourceTypeBreakdown(filtered),
    };
  }

  private static getResourceTypeBreakdown(metrics: typeof this.metrics) {
    const breakdown: Record<
      string,
      {
        count: number;
        avgDuration: number;
        cacheHitRate: number;
        errorRate: number;
      }
    > = {};

    for (const metric of metrics) {
      if (!breakdown[metric.resourceType]) {
        breakdown[metric.resourceType] = {
          count: 0,
          avgDuration: 0,
          cacheHitRate: 0,
          errorRate: 0,
        };
      }

      const stats = breakdown[metric.resourceType];
      stats.count++;
      stats.avgDuration =
        (stats.avgDuration * (stats.count - 1) + metric.duration) / stats.count;

      if (metric.cacheHit) {
        stats.cacheHitRate =
          (stats.cacheHitRate * (stats.count - 1) + 1) / stats.count;
      } else {
        stats.cacheHitRate =
          (stats.cacheHitRate * (stats.count - 1)) / stats.count;
      }

      if (metric.error) {
        stats.errorRate =
          (stats.errorRate * (stats.count - 1) + 1) / stats.count;
      } else {
        stats.errorRate = (stats.errorRate * (stats.count - 1)) / stats.count;
      }
    }

    return breakdown;
  }

  static clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * UniversalMetadataService provides centralized metadata and attribute operations
 */
export class UniversalMetadataService {
  /**
   * Discover attributes for a specific resource type with caching support
   * Special handling for tasks which use /tasks API instead of /objects/tasks
   *
   * @param resourceType - The resource type to discover attributes for
   * @param options - Optional configuration including categories and object slug
   * @returns Promise resolving to attribute discovery results with caching metadata
   */
  static async discoverAttributesForResourceType(
    resourceType: UniversalResourceType,
    options?: {
      categories?: string[]; // Category filtering support
      objectSlug?: string; // Object slug for records routing
      useCache?: boolean; // Whether to use caching (default: true)
      cacheTtl?: number; // Custom cache TTL in milliseconds
    }
  ): Promise<Record<string, unknown>> {
    // Check if caching should be used (default: true)
    const useCache = options?.useCache !== false;
    const startTime = Date.now();

    // Handle tasks as special case - they don't use /objects/{type}/attributes
    if (resourceType === UniversalResourceType.TASKS) {
      if (useCache) {
        return CachingService.getOrLoadAttributes(
          async () => {
            const result = await this.discoverTaskAttributes(options);
            const duration = Date.now() - startTime;
            const attributeCount = Array.isArray(result?.attributes)
              ? result.attributes.length
              : 0;

            AttributeDiscoveryMetrics.recordDiscovery(resourceType, duration, {
              cacheHit: false,
              attributeCount,
            });

            return result;
          },
          resourceType,
          undefined,
          options?.cacheTtl
        ).then((result) => {
          if (result.fromCache) {
            const duration = Date.now() - startTime;
            const attributeCount = Array.isArray(result.data?.attributes)
              ? result.data.attributes.length
              : 0;

            AttributeDiscoveryMetrics.recordDiscovery(resourceType, duration, {
              cacheHit: true,
              attributeCount,
            });
          }
          return result.data;
        });
      }

      const result = await this.discoverTaskAttributes(options);
      const duration = Date.now() - startTime;
      const attributeCount = Array.isArray(result?.attributes)
        ? result.attributes.length
        : 0;

      AttributeDiscoveryMetrics.recordDiscovery(resourceType, duration, {
        cacheHit: false,
        attributeCount,
      });

      return result;
    }

    // Handle records as special case - they need object-specific routing
    if (resourceType === UniversalResourceType.RECORDS) {
      if (!options?.objectSlug) {
        throw new Error(
          'discoverAttributesForResourceType(records) requires objectSlug in options'
        );
      }

      if (useCache) {
        return CachingService.getOrLoadAttributes(
          async () => {
            const result = await this.discoverObjectAttributes(
              options.objectSlug!,
              options
            );
            const duration = Date.now() - startTime;
            const attributeCount = Array.isArray(result?.attributes)
              ? result.attributes.length
              : 0;

            AttributeDiscoveryMetrics.recordDiscovery(resourceType, duration, {
              objectSlug: options.objectSlug,
              cacheHit: false,
              attributeCount,
            });

            return result;
          },
          resourceType,
          options.objectSlug,
          options?.cacheTtl
        ).then((result) => {
          if (result.fromCache) {
            const duration = Date.now() - startTime;
            const attributeCount = Array.isArray(result.data?.attributes)
              ? result.data.attributes.length
              : 0;

            AttributeDiscoveryMetrics.recordDiscovery(resourceType, duration, {
              objectSlug: options.objectSlug,
              cacheHit: true,
              attributeCount,
            });
          }
          return result.data;
        });
      }

      const result = await this.discoverObjectAttributes(
        options.objectSlug,
        options
      );
      const duration = Date.now() - startTime;
      const attributeCount = Array.isArray(result?.attributes)
        ? result.attributes.length
        : 0;

      AttributeDiscoveryMetrics.recordDiscovery(resourceType, duration, {
        objectSlug: options.objectSlug,
        cacheHit: false,
        attributeCount,
      });

      return result;
    }

    // For standard resource types, use caching if enabled
    if (useCache) {
      return CachingService.getOrLoadAttributes(
        async () => {
          const result = await this.performAttributeDiscovery(
            resourceType,
            options
          );
          const duration = Date.now() - startTime;
          const attributeCount = Array.isArray(result?.attributes)
            ? result.attributes.length
            : 0;

          AttributeDiscoveryMetrics.recordDiscovery(resourceType, duration, {
            cacheHit: false,
            attributeCount,
          });

          return result;
        },
        resourceType,
        undefined,
        options?.cacheTtl
      ).then((result) => {
        if (result.fromCache) {
          const duration = Date.now() - startTime;
          const attributeCount = Array.isArray(result.data?.attributes)
            ? result.data.attributes.length
            : 0;

          AttributeDiscoveryMetrics.recordDiscovery(resourceType, duration, {
            cacheHit: true,
            attributeCount,
          });
        }
        return result.data;
      });
    }

    // Perform direct attribute discovery without caching
    try {
      const result = await this.performAttributeDiscovery(
        resourceType,
        options
      );
      const duration = Date.now() - startTime;
      const attributeCount = Array.isArray(result?.attributes)
        ? result.attributes.length
        : 0;

      AttributeDiscoveryMetrics.recordDiscovery(resourceType, duration, {
        cacheHit: false,
        attributeCount,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      AttributeDiscoveryMetrics.recordDiscovery(resourceType, duration, {
        cacheHit: false,
        attributeCount: 0,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Perform the actual attribute discovery API call
   * Extracted to support both cached and non-cached execution paths
   *
   * @private
   */
  private static async performAttributeDiscovery(
    resourceType: UniversalResourceType,
    options?: {
      categories?: string[];
    }
  ): Promise<Record<string, unknown>> {
    const client = getLazyAttioClient();

    try {
      // Convert resource type to API slug for schema discovery (uses plural object api_slugs)
      // Note: Attio's schema discovery uses /objects/{api_slug}/attributes where api_slug is plural
      const resourceSlug =
        OBJECT_SLUG_MAP[resourceType.toLowerCase()] ||
        resourceType.toLowerCase();
      let path = `/objects/${resourceSlug}/attributes`;

      // NEW: Add category filtering to query parameters with security validation
      if (options?.categories && options.categories.length > 0) {
        // Validate and sanitize category names to prevent injection attacks
        const validatedCategories = secureValidateCategories(
          options.categories,
          'category filtering in get-attributes'
        );

        if (validatedCategories.length > 0) {
          const categoriesParam = validatedCategories.join(',');
          path += `?categories=${encodeURIComponent(categoriesParam)}`;
        }
      }

      const response = await client.get<AttributeResponse>(path);

      // Tolerant parsing: Attio may return arrays, or objects with attributes/all/standard/custom
      const parsed = UniversalMetadataService.parseAttributesResponse(
        response?.data as unknown
      );

      // Create mapping from title to api_slug for compatibility
      const mappings: Record<string, string> = {};
      parsed.forEach((attr: unknown) => {
        if (isAttioAttribute(attr)) {
          mappings[attr.title] = attr.api_slug;
        }
      });

      return {
        attributes: parsed,
        mappings,
        count: parsed.length,
        resource_type: resourceType,
      };
    } catch (error: unknown) {
      logger.error(`Failed to discover attributes for ${resourceType}`, error, {
        resourceType,
        options,
      });

      // If it's a 404 or similar API error, convert to structured error for MCP error detection
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        const status = axiosError.response?.status || 500;
        const message =
          axiosError.response?.data?.error?.message ||
          axiosError.response?.data?.message ||
          axiosError.message ||
          `API error: ${status}`;

        throw {
          status,
          body: {
            code: 'api_error',
            message: `Failed to discover ${resourceType} attributes: ${message}`,
          },
        };
      }

      throw new Error(
        `Failed to discover ${resourceType} attributes: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Special discovery method for task attributes
   * Since tasks don't use the standard /objects/{type}/attributes endpoint,
   * we return the known task attributes based on the task API structure.
   */
  static async discoverTaskAttributes(options?: {
    categories?: string[]; // NEW: Category filtering support
  }): Promise<Record<string, unknown>> {
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
        api_slug: 'status', // Standard status field name
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
    const mappings: Record<string, string> = {};
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
      filteredAttributes = attributes.filter((attr: any) =>
        options.categories!.includes(attr.category)
      );
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
  static async getAttributesForRecord(
    resourceType: UniversalResourceType,
    recordId: string
  ): Promise<Record<string, unknown>> {
    const client = getLazyAttioClient();

    try {
      // Convert resource type to API slug for record-level operations (uses plural object api_slugs)
      // Note: For record operations, Attio uses /objects/{plural_slug}/records/{record_id}
      const OBJECT_SLUG_MAP: Record<string, string> = {
        companies: 'companies',
        people: 'people',
        deals: 'deals',
        tasks: 'tasks',
        records: 'records',
        lists: 'lists',
      };
      const resourceSlug =
        OBJECT_SLUG_MAP[resourceType.toLowerCase()] ||
        resourceType.toLowerCase();
      const response = await client.get(
        `/objects/${resourceSlug}/records/${recordId}`
      );

      // Add null guards to prevent undefined → {} conversion
      if (!response || !response.data) {
        throw {
          status: 500,
          body: {
            code: 'invalid_response',
            message: `Invalid API response for ${resourceType} record: ${recordId}`,
          },
        };
      }

      const result = response.data.data?.values || response.data.data || {};

      // Return empty object if result is empty (test expectation)
      // Only throw 404 if result is null/undefined, not if it's empty object
      if (result === null || result === undefined) {
        throw {
          status: 404,
          body: {
            code: 'not_found',
            message: `${resourceType} record with ID "${recordId}" not found.`,
          },
        };
      }

      return result;
    } catch (error: unknown) {
      logger.error(
        `Failed to get attributes for ${resourceType} record ${recordId}`,
        error,
        { resourceType, recordId }
      );
      const msg =
        error instanceof Error
          ? error.message
          : (() => {
              try {
                return JSON.stringify(error);
              } catch {
                return String(error);
              }
            })();
      throw new Error(`Failed to get record attributes: ${msg}`);
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

      // Handle format with 'all', 'custom', 'standard' fields (e.g., from discoverCompanyAttributes)
      if (Array.isArray(attrs.all)) {
        const filtered = this.filterAttributesByCategory(
          attrs.all as any[],
          requestedCategories
        );
        return {
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
          // Return schema-level attributes using standard API endpoint
          result = await this.discoverAttributesForResourceType(resource_type, {
            categories,
          });
        }
        break;

      case UniversalResourceType.PEOPLE:
        if (record_id) {
          result = await this.getAttributesForRecord(resource_type, record_id);
        } else {
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
        } else {
          result = await this.discoverAttributesForResourceType(resource_type, {
            categories,
          });
        }
        break;

      case UniversalResourceType.DEALS:
        if (record_id) {
          result = await this.getAttributesForRecord(resource_type, record_id);
        } else {
          result = await this.discoverAttributesForResourceType(resource_type, {
            categories,
          });
        }
        break;

      case UniversalResourceType.TASKS:
        if (record_id) {
          result = await this.getAttributesForRecord(resource_type, record_id);
        } else {
          result = await this.discoverAttributesForResourceType(resource_type, {
            categories,
          });
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
    resource_type: UniversalResourceType,
    options?: {
      categories?: string[]; // NEW: Category filtering support
    }
  ): Promise<Record<string, unknown>> {
    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
        // Use standard API endpoint for consistent schema discovery
        return this.discoverAttributesForResourceType(resource_type, options);

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
        throw new Error(
          `Unsupported resource type for discover attributes: ${resource_type}`
        );
    }
  }

  /**
   * Discover attributes for a specific object type (used by records)
   */
  private static async discoverObjectAttributes(
    objectSlug: string,
    options?: {
      categories?: string[];
    }
  ): Promise<Record<string, unknown>> {
    const client = getLazyAttioClient();

    try {
      let path = `/objects/${objectSlug}/attributes`;

      // Add category filtering if specified
      if (options?.categories && options.categories.length > 0) {
        const validatedCategories = secureValidateCategories(
          options.categories,
          'category filtering in discover-object-attributes'
        );

        if (validatedCategories.length > 0) {
          const categoriesParam = validatedCategories.join(',');
          path += `?categories=${encodeURIComponent(categoriesParam)}`;
        }
      }

      const response = await client.get(path);
      const parsed = UniversalMetadataService.parseAttributesResponse(
        response?.data as unknown
      );

      return {
        attributes: parsed,
        resourceType: 'records',
        objectSlug,
      };
    } catch (error: unknown) {
      const err = error as { response?: { status?: number }; message?: string };
      throw new Error(
        `Failed to discover attributes for object ${objectSlug}: ${
          err.message || 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get performance metrics for attribute discovery operations
   *
   * @param options - Filtering options for metrics
   * @returns Comprehensive performance statistics
   */
  static getPerformanceMetrics(options?: {
    resourceType?: string;
    since?: number; // timestamp
    includeErrors?: boolean;
  }) {
    return AttributeDiscoveryMetrics.getMetrics(options);
  }

  /**
   * Clear all performance metrics (useful for testing)
   */
  static clearPerformanceMetrics(): void {
    AttributeDiscoveryMetrics.clearMetrics();
  }

  /**
   * Robustly parse attribute discovery responses from multiple possible shapes
   */
  private static parseAttributesResponse(data: unknown): any[] {
    // Common shapes:
    // - { data: AttioAttribute[] }
    // - { attributes: AttioAttribute[] }
    // - { all: AttioAttribute[], custom?: AttioAttribute[], standard?: AttioAttribute[] }
    // - AttioAttribute[]
    // Fallback: []

    // Direct array
    if (Array.isArray(data)) return data as any[];

    // Object with nested arrays
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;

      // Prefer .data if it is an array
      const dataArr = obj.data as unknown;
      if (Array.isArray(dataArr)) return dataArr as any[];

      // .attributes array
      const attrs = obj.attributes as unknown;
      if (Array.isArray(attrs)) return attrs as any[];

      // Combined shape with .all / .custom / .standard
      const all = obj.all as unknown;
      const custom = obj.custom as unknown;
      const standard = obj.standard as unknown;
      const merged: any[] = [];
      if (Array.isArray(all)) merged.push(...all);
      if (Array.isArray(custom)) merged.push(...custom);
      if (Array.isArray(standard)) merged.push(...standard);
      if (merged.length > 0) return merged;
    }

    // In E2E/debug, log unexpected shapes
    if (process.env.E2E_MODE === 'true') {
      debug(
        'UniversalMetadataService',
        'Unrecognized attribute response shape, returning empty array',
        {
          receivedKeys:
            data && typeof data === 'object'
              ? Object.keys(data as any)
              : typeof data,
        },
        'parseAttributesResponse',
        OperationType.DATA_PROCESSING
      );
    }

    return [];
  }
}
