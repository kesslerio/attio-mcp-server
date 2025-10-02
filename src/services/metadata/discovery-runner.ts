import type { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import type {
  CachedMetadataResult,
  MetadataCacheKey,
  MetadataCacheService,
  MetadataMetricsService,
  MetadataResult,
} from './types.js';

interface DiscoveryMetricsContext {
  resourceType: UniversalResourceType;
  objectSlug?: string;
}

interface DiscoveryTask {
  cacheKey: MetadataCacheKey;
  cacheTtl?: number;
  useCache?: boolean;
  loader: () => Promise<MetadataResult>;
  metrics: DiscoveryMetricsContext;
  onError: (error: unknown) => never;
}

export class DiscoveryRunner {
  constructor(
    private readonly cacheService: MetadataCacheService,
    private readonly metricsService: MetadataMetricsService
  ) {}

  async run(task: DiscoveryTask): Promise<MetadataResult> {
    const startTime = Date.now();

    try {
      const result = await this.load(task);
      this.recordMetrics({
        ...task.metrics,
        duration: Date.now() - startTime,
        cacheHit: result.fromCache,
        result: result.data,
      });
      return result.data;
    } catch (error: unknown) {
      this.recordMetrics({
        ...task.metrics,
        duration: Date.now() - startTime,
        cacheHit: false,
        result: { attributes: [] },
        error,
      });
      task.onError(error);
    }
  }

  private async load({
    cacheKey,
    cacheTtl,
    useCache = true,
    loader,
  }: DiscoveryTask): Promise<CachedMetadataResult> {
    if (useCache) {
      return this.cacheService.getOrLoad(cacheKey, loader, cacheTtl);
    }

    const data = await loader();
    return {
      data,
      fromCache: false,
    };
  }

  private recordMetrics({
    resourceType,
    objectSlug,
    duration,
    cacheHit,
    result,
    error,
  }: {
    resourceType: UniversalResourceType;
    objectSlug?: string;
    duration: number;
    cacheHit: boolean;
    result: MetadataResult | undefined;
    error?: unknown;
  }): void {
    const attributeCount = Array.isArray(result?.attributes)
      ? result.attributes.length
      : 0;

    this.metricsService.record({
      resourceType,
      objectSlug,
      duration,
      cacheHit,
      attributeCount,
      error: error ? this.formatError(error) : undefined,
    });
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
