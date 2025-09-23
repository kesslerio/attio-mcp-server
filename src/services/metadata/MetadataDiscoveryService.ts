import { getLazyAttioClient } from '../../api/lazy-client.js';
import { OBJECT_SLUG_MAP } from '../../constants/universal.constants.js';
import { secureValidateCategories } from '../../utils/validation/field-validation.js';
import { UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';
import type {
  DiscoverObjectOptions,
  DiscoverTaskOptions,
  DiscoverTypeOptions,
  DiscoveryEvent,
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
  constructor(
    private readonly cacheService: MetadataCacheService,
    private readonly metricsService: MetadataMetricsService,
    private readonly transformService: MetadataTransformService,
    private readonly errorService: MetadataErrorService
  ) {}

  async discoverForType(options: DiscoverTypeOptions): Promise<MetadataResult> {
    const {
      resourceType,
      categories,
      objectSlug,
      useCache = true,
      cacheTtl,
    } = options;
    const startTime = Date.now();

    const recordMetric = (
      result: MetadataResult,
      cacheHit: boolean,
      extra?: Partial<Omit<DiscoveryEvent, 'resourceType' | 'duration'>>
    ) => {
      const attributeCount = Array.isArray(result?.attributes)
        ? result.attributes.length
        : 0;

      this.metricsService.record({
        resourceType,
        duration: Date.now() - startTime,
        cacheHit,
        attributeCount,
        objectSlug,
        ...extra,
      });
    };

    if (resourceType === UniversalResourceType.TASKS) {
      try {
        if (useCache) {
          const cached = await this.cacheService.getOrLoad(
            { resourceType },
            () => this.discoverTasks({ categories }),
            cacheTtl
          );
          recordMetric(cached.data, cached.fromCache);
          return cached.data;
        }

        const result = await this.discoverTasks({ categories });
        recordMetric(result, false);
        return result;
      } catch (error: unknown) {
        recordMetric({ attributes: [] }, false, {
          error: error instanceof Error ? error.message : String(error),
        });
        this.errorService.toStructuredError(resourceType, error);
      }
    }

    if (resourceType === UniversalResourceType.RECORDS) {
      if (!objectSlug) {
        throw new Error(
          'discoverAttributesForResourceType(records) requires objectSlug in options'
        );
      }

      try {
        if (useCache) {
          const cached = await this.cacheService.getOrLoad(
            { resourceType, objectSlug },
            () => this.discoverObject({ objectSlug, categories }),
            cacheTtl
          );
          recordMetric(cached.data, cached.fromCache);
          return cached.data;
        }

        const result = await this.discoverObject({ objectSlug, categories });
        recordMetric(result, false);
        return result;
      } catch (error: unknown) {
        recordMetric({ attributes: [] }, false, {
          error: error instanceof Error ? error.message : String(error),
        });
        this.errorService.toStructuredError(resourceType, error);
      }
    }

    try {
      if (useCache) {
        const cached = await this.cacheService.getOrLoad(
          { resourceType },
          () => this.performAttributeDiscovery(resourceType, { categories }),
          cacheTtl
        );
        recordMetric(cached.data, cached.fromCache);
        return cached.data;
      }

      const result = await this.performAttributeDiscovery(resourceType, {
        categories,
      });
      recordMetric(result, false);
      return result;
    } catch (error: unknown) {
      recordMetric({ attributes: [] }, false, {
        error: error instanceof Error ? error.message : String(error),
      });
      this.errorService.toStructuredError(resourceType, error);
    }
  }

  async discoverTasks(options?: DiscoverTaskOptions): Promise<MetadataResult> {
    const attributes = [
      {
        id: 'content',
        api_slug: 'content',
        title: 'Content',
        type: 'text',
        category: 'basic',
        description: 'The main text/description of the task',
        required: true,
      },
      {
        id: 'status',
        api_slug: 'status',
        title: 'Status',
        type: 'text',
        category: 'basic',
        description: 'Task completion status (e.g., pending, completed)',
        required: false,
      },
      {
        id: 'assignee',
        api_slug: 'assignee',
        title: 'Assignee',
        type: 'person-reference',
        category: 'business',
        description: 'Person assigned to this task',
        required: false,
      },
      {
        id: 'assignee_id',
        api_slug: 'assignee_id',
        title: 'Assignee ID',
        type: 'text',
        category: 'business',
        description: 'ID of the workspace member assigned to this task',
        required: false,
      },
      {
        id: 'due_date',
        api_slug: 'due_date',
        title: 'Due Date',
        type: 'date',
        category: 'basic',
        description: 'When the task is due (ISO date format)',
        required: false,
      },
      {
        id: 'linked_records',
        api_slug: 'linked_records',
        title: 'Linked Records',
        type: 'record-reference',
        category: 'business',
        description: 'Records this task is associated with',
        required: false,
      },
    ];

    const mappings: Record<string, string> = {};
    attributes.forEach((attr) => {
      mappings[attr.title] = attr.api_slug;
    });

    mappings['title'] = 'content';
    mappings['name'] = 'content';
    mappings['description'] = 'content';
    mappings['assignee'] = 'assignee_id';
    mappings['due'] = 'due_date';
    mappings['record'] = 'record_id';

    const filteredAttributes = options?.categories?.length
      ? (this.transformService.filterByCategory(
          attributes,
          options.categories
        ) as unknown[])
      : attributes;

    return {
      attributes: filteredAttributes,
      mappings,
      count: Array.isArray(filteredAttributes) ? filteredAttributes.length : 0,
      resource_type: UniversalResourceType.TASKS,
      api_endpoint: '/tasks',
      supports_objects_api: false,
    };
  }

  async discoverObject(
    options: DiscoverObjectOptions
  ): Promise<MetadataResult> {
    const { objectSlug, categories } = options;
    const client = getLazyAttioClient();

    try {
      let path = `/objects/${objectSlug}/attributes`;

      let sanitizedCategories: string[] | undefined;
      if (categories && categories.length > 0) {
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
      const filtered =
        sanitizedCategories && sanitizedCategories.length > 0
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
      this.errorService.toStructuredError('records', error);
    }
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

      if (options?.categories && options.categories.length > 0) {
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
      this.errorService.toStructuredError(resourceType, error);
    }
  }
}
