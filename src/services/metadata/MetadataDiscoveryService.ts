import { getLazyAttioClient } from '@/api/lazy-client.js';
import { OBJECT_SLUG_MAP } from '@/constants/universal.constants.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { secureValidateCategories } from '@/utils/validation/field-validation.js';
import { DiscoveryRunner } from './discovery-runner.js';
import { buildTaskMetadata } from './task-metadata.js';
import type {
  DiscoverObjectOptions,
  DiscoverTaskOptions,
  DiscoverTypeOptions,
  MetadataCacheService,
  MetadataDiscoveryService,
  MetadataErrorService,
  MetadataMetricsService,
  MetadataResult,
  MetadataTransformService,
} from './types.js';

export class DefaultMetadataDiscoveryService
  implements MetadataDiscoveryService
{
  private readonly runner: DiscoveryRunner;

  constructor(
    cacheService: MetadataCacheService,
    metricsService: MetadataMetricsService,
    private readonly transformService: MetadataTransformService,
    private readonly errorService: MetadataErrorService
  ) {
    this.runner = new DiscoveryRunner(cacheService, metricsService);
  }

  async discoverForType(options: DiscoverTypeOptions): Promise<MetadataResult> {
    if (options.resourceType === UniversalResourceType.TASKS) {
      return this.discoverTasksWithMetrics(options);
    }

    if (options.resourceType === UniversalResourceType.RECORDS) {
      return this.discoverRecordsWithMetrics(options);
    }
    return this.discoverStandardResource(options);
  }
  async discoverTasks(options?: DiscoverTaskOptions): Promise<MetadataResult> {
    return buildTaskMetadata(this.transformService, options?.categories);
  }

  async discoverObject(
    options: DiscoverObjectOptions
  ): Promise<MetadataResult> {
    const { objectSlug, categories } = options;
    const client = getLazyAttioClient();
    try {
      let path = `/objects/${objectSlug}/attributes`;
      let sanitizedCategories: string[] | undefined;
      if (categories?.length) {
        sanitizedCategories = secureValidateCategories(
          categories,
          'category filtering in discover-object-attributes'
        );

        if (sanitizedCategories.length > 0) {
          path += `?categories=${encodeURIComponent(
            sanitizedCategories.join(',')
          )}`;
        }
      }

      const response = await client.get(path);
      const parsed = this.transformService.parseAttributesResponse(
        response?.data as unknown
      );
      const filtered = sanitizedCategories?.length
        ? (this.transformService.filterByCategory(
            parsed,
            sanitizedCategories
          ) as unknown[])
        : parsed;
      const mappings = this.transformService.buildMappings(filtered);

      return {
        attributes: filtered,
        mappings,
        count: Array.isArray(filtered) ? filtered.length : 0,
        resource_type: UniversalResourceType.RECORDS,
        resourceType: 'records',
        objectSlug,
      };
    } catch (error: unknown) {
      throw this.errorService.toStructuredError('records', error);
    }
  }

  private async discoverTasksWithMetrics(
    options: DiscoverTypeOptions
  ): Promise<MetadataResult> {
    return this.runner.run({
      cacheKey: { resourceType: options.resourceType },
      cacheTtl: options.cacheTtl,
      useCache: options.useCache,
      loader: () =>
        this.discoverTasks({
          categories: options.categories,
        }),
      metrics: {
        resourceType: options.resourceType,
        objectSlug: options.objectSlug,
      },
      onError: (error) =>
        this.errorService.toStructuredError(options.resourceType, error),
    });
  }

  private async discoverRecordsWithMetrics(
    options: DiscoverTypeOptions
  ): Promise<MetadataResult> {
    const { objectSlug } = options;
    if (!objectSlug) {
      throw new Error(
        'discoverAttributesForResourceType(records) requires objectSlug in options'
      );
    }
    return this.runner.run({
      cacheKey: {
        resourceType: options.resourceType,
        objectSlug,
      },
      cacheTtl: options.cacheTtl,
      useCache: options.useCache,
      loader: () =>
        this.discoverObject({
          objectSlug,
          categories: options.categories,
        }),
      metrics: {
        resourceType: options.resourceType,
        objectSlug,
      },
      onError: (error) => this.errorService.toStructuredError('records', error),
    });
  }

  private async discoverStandardResource(
    options: DiscoverTypeOptions
  ): Promise<MetadataResult> {
    return this.runner.run({
      cacheKey: { resourceType: options.resourceType },
      cacheTtl: options.cacheTtl,
      useCache: options.useCache,
      loader: () =>
        this.performAttributeDiscovery(options.resourceType, {
          categories: options.categories,
        }),
      metrics: {
        resourceType: options.resourceType,
        objectSlug: options.objectSlug,
      },
      onError: (error) =>
        this.errorService.toStructuredError(options.resourceType, error),
    });
  }

  private async performAttributeDiscovery(
    resourceType: UniversalResourceType,
    options?: { categories?: string[] }
  ): Promise<MetadataResult> {
    const client = getLazyAttioClient();
    try {
      const resourceSlug =
        OBJECT_SLUG_MAP[resourceType.toLowerCase()] ||
        resourceType.toLowerCase();
      let path = `/objects/${resourceSlug}/attributes`;
      if (options?.categories?.length) {
        const validatedCategories = secureValidateCategories(
          options.categories,
          'category filtering in get-attributes'
        );

        if (validatedCategories.length > 0) {
          path += `?categories=${encodeURIComponent(
            validatedCategories.join(',')
          )}`;
        }
      }

      const response = await client.get(path);
      const parsed = this.transformService.parseAttributesResponse(
        response?.data as unknown
      );
      const mappings = this.transformService.buildMappings(parsed);

      return {
        attributes: parsed,
        mappings,
        count: parsed.length,
        resource_type: resourceType,
      };
    } catch (error: unknown) {
      throw this.errorService.toStructuredError(resourceType, error);
    }
  }
}
