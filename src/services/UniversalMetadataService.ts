/**
 * UniversalMetadataService - Metadata orchestration facade
 *
 * Rebuilt for Issue #648 to delegate responsibilities to specialised metadata services
 * while preserving the existing API surface for universal handlers.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import type { UniversalAttributesParams } from '../handlers/tool-configs/universal/types.js';
import type { JsonObject } from '../types/attio.js';
import {
  getCompanyAttributes,
  discoverCompanyAttributes,
} from '../objects/companies/index.js';
import { getListAttributes } from '../objects/lists.js';
import {
  createDefaultMetadataServices,
  MetadataServicesDeps,
  MetadataDiscoveryService,
  MetadataRecordService,
  MetadataTransformService,
  MetadataMetricsService,
} from './metadata/index.js';
import type {
  DiscoverTypeOptions,
  DiscoveryMetricsSummary,
  MetricsFilter,
} from './metadata/index.js';

class UniversalMetadataFacade {
  constructor(private readonly deps: MetadataServicesDeps) {}

  private get discoveryService(): MetadataDiscoveryService {
    return this.deps.discoveryService;
  }

  private get recordService(): MetadataRecordService {
    return this.deps.recordService;
  }

  private get transformService(): MetadataTransformService {
    return this.deps.transformService;
  }

  private get metricsService(): MetadataMetricsService {
    return this.deps.metricsService;
  }

  async discoverAttributesForResourceType(
    resourceType: UniversalResourceType,
    options?: {
      categories?: string[];
      objectSlug?: string;
      useCache?: boolean;
      cacheTtl?: number;
    }
  ): Promise<JsonObject> {
    const discoverOptions: DiscoverTypeOptions = {
      resourceType,
      categories: options?.categories,
      objectSlug: options?.objectSlug,
      useCache: options?.useCache,
      cacheTtl: options?.cacheTtl,
    };

    return this.discoveryService.discoverForType(discoverOptions);
  }

  async discoverTaskAttributes(options?: {
    categories?: string[];
  }): Promise<JsonObject> {
    return this.discoveryService.discoverTasks(options);
  }

  async getAttributesForRecord(
    resourceType: UniversalResourceType,
    recordId: string
  ): Promise<JsonObject> {
    return this.recordService.getAttributesForRecord(resourceType, recordId);
  }

  filterAttributesByCategory(
    attributes: Record<string, unknown> | unknown[],
    categories?: string[]
  ): Record<string, unknown> | unknown[] {
    return this.transformService.filterByCategory(attributes, categories);
  }

  async getAttributes(params: UniversalAttributesParams): Promise<JsonObject> {
    const { resource_type, record_id, categories } = params;

    let result: JsonObject;

    switch (resource_type) {
      case UniversalResourceType.COMPANIES: {
        if (record_id) {
          result = await getCompanyAttributes(record_id);
        } else {
          result = await discoverCompanyAttributes();
        }
        break;
      }

      case UniversalResourceType.PEOPLE: {
        if (record_id) {
          result = await this.recordService.getAttributesForRecord(
            resource_type,
            record_id
          );
        } else {
          result = await this.discoverAttributesForResourceType(resource_type, {
            categories,
          });
        }
        break;
      }

      case UniversalResourceType.LISTS: {
        result = await getListAttributes();
        break;
      }

      case UniversalResourceType.RECORDS: {
        if (record_id) {
          result = await this.recordService.getAttributesForRecord(
            resource_type,
            record_id
          );
        } else {
          result = await this.discoverAttributesForResourceType(resource_type, {
            categories,
          });
        }
        break;
      }

      case UniversalResourceType.DEALS: {
        if (record_id) {
          result = await this.recordService.getAttributesForRecord(
            resource_type,
            record_id
          );
        } else {
          result = await this.discoverAttributesForResourceType(resource_type, {
            categories,
          });
        }
        break;
      }

      case UniversalResourceType.TASKS: {
        if (record_id) {
          result = await this.recordService.getAttributesForRecord(
            resource_type,
            record_id
          );
        } else {
          result = await this.discoverAttributesForResourceType(resource_type, {
            categories,
          });
        }
        break;
      }

      default:
        throw new Error(
          `Unsupported resource type for get attributes: ${resource_type}`
        );
    }

    const filtered = this.transformService.filterByCategory(result, categories);
    return filtered as JsonObject;
  }

  async discoverAttributes(
    resource_type: UniversalResourceType,
    options?: {
      categories?: string[];
      objectSlug?: string;
    }
  ): Promise<JsonObject> {
    switch (resource_type) {
      case UniversalResourceType.COMPANIES: {
        const res = await discoverCompanyAttributes();
        if (!options?.categories?.length) {
          return res;
        }
        return this.transformService.filterByCategory(
          res,
          options.categories
        ) as JsonObject;
      }

      case UniversalResourceType.PEOPLE:
        return this.discoverAttributesForResourceType(resource_type, options);

      case UniversalResourceType.LISTS:
        return getListAttributes();

      case UniversalResourceType.RECORDS: {
        if (options?.objectSlug) {
          return this.discoverAttributesForResourceType(resource_type, {
            categories: options.categories,
            objectSlug: options.objectSlug,
          });
        }
        return this.discoverAttributesForResourceType(resource_type, options);
      }

      case UniversalResourceType.DEALS: {
        const baseResult = await this.discoverAttributesForResourceType(
          resource_type,
          options
        );

        const { FIELD_MAPPINGS } = await import(
          '../handlers/tool-configs/universal/field-mapper.js'
        );
        const dealsMapping = FIELD_MAPPINGS[UniversalResourceType.DEALS];

        if (dealsMapping?.fieldMappings) {
          const mappings: Record<string, string> = {};
          Object.entries(dealsMapping.fieldMappings).forEach(
            ([displayName, apiField]) => {
              if (apiField) {
                mappings[displayName] = apiField;
              }
            }
          );

          mappings['Deal name'] = 'name';
          mappings['Deal stage'] = 'stage';
          mappings['Deal value'] = 'value';
          mappings['Associated company'] = 'associated_company';

          return {
            ...baseResult,
            mappings: {
              ...(baseResult.mappings as JsonObject | undefined),
              ...mappings,
            },
            note: 'Use mappings to convert display names to API field names for create-record',
          };
        }

        return baseResult;
      }

      case UniversalResourceType.TASKS:
        return this.discoverAttributesForResourceType(resource_type, options);

      default:
        throw new Error(
          `Unsupported resource type for discover attributes: ${resource_type}`
        );
    }
  }

  getPerformanceMetrics(options?: MetricsFilter): DiscoveryMetricsSummary {
    return this.metricsService.getMetrics(options);
  }

  clearPerformanceMetrics(): void {
    this.metricsService.clear();
  }
}

export class UniversalMetadataService {
  private static facade = new UniversalMetadataFacade(
    createDefaultMetadataServices()
  );

  /**
   * Replace the underlying facade (useful for testing custom dependencies)
   */
  static useFacade(facade: UniversalMetadataFacade): void {
    this.facade = facade;
  }

  /**
   * Reset the facade back to default dependencies
   */
  static reset(): void {
    this.facade = new UniversalMetadataFacade(createDefaultMetadataServices());
  }

  static async discoverAttributesForResourceType(
    resourceType: UniversalResourceType,
    options?: {
      categories?: string[];
      objectSlug?: string;
      useCache?: boolean;
      cacheTtl?: number;
    }
  ): Promise<Record<string, unknown>> {
    return this.facade.discoverAttributesForResourceType(resourceType, options);
  }

  static async discoverTaskAttributes(options?: {
    categories?: string[];
  }): Promise<Record<string, unknown>> {
    return this.facade.discoverTaskAttributes(options);
  }

  static async getAttributesForRecord(
    resourceType: UniversalResourceType,
    recordId: string
  ): Promise<Record<string, unknown>> {
    return this.facade.getAttributesForRecord(resourceType, recordId);
  }

  static filterAttributesByCategory(
    attributes: Record<string, unknown> | unknown[],
    categories?: string[]
  ): Record<string, unknown> | unknown[] {
    return this.facade.filterAttributesByCategory(attributes, categories);
  }

  static async getAttributes(
    params: UniversalAttributesParams
  ): Promise<Record<string, unknown>> {
    return this.facade.getAttributes(params);
  }

  static async discoverAttributes(
    resource_type: UniversalResourceType,
    options?: {
      categories?: string[];
      objectSlug?: string;
    }
  ): Promise<Record<string, unknown>> {
    return this.facade.discoverAttributes(resource_type, options);
  }

  static getPerformanceMetrics(
    options?: MetricsFilter
  ): DiscoveryMetricsSummary {
    return this.facade.getPerformanceMetrics(options);
  }

  static clearPerformanceMetrics(): void {
    this.facade.clearPerformanceMetrics();
  }
}

export { UniversalMetadataFacade };
