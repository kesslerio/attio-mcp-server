import type { UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';

export interface MetadataResult extends Record<string, unknown> {
  attributes?: unknown[];
  mappings?: Record<string, string>;
  count?: number;
  resource_type?: UniversalResourceType | string;
  objectSlug?: string;
}

export interface DiscoverTypeOptions {
  resourceType: UniversalResourceType;
  categories?: string[];
  objectSlug?: string;
  useCache?: boolean;
  cacheTtl?: number;
}

export interface DiscoverTaskOptions {
  categories?: string[];
}

export interface DiscoverObjectOptions {
  objectSlug: string;
  categories?: string[];
  useCache?: boolean;
  cacheTtl?: number;
}

export interface MetadataCacheKey {
  resourceType: UniversalResourceType;
  objectSlug?: string;
}

export interface CachedMetadataResult {
  data: MetadataResult;
  fromCache: boolean;
}

export interface DiscoveryEvent {
  timestamp?: number;
  resourceType: string;
  duration: number;
  cacheHit?: boolean;
  attributeCount?: number;
  objectSlug?: string;
  error?: string;
}

export interface MetricsFilter {
  resourceType?: string;
  since?: number;
  includeErrors?: boolean;
}

export interface DiscoveryMetricsSummary {
  totalRequests: number;
  cacheHits: number;
  cacheHitRate: number;
  avgDuration: number;
  totalDuration: number;
  errors: number;
  errorRate: number;
  slowRequests: number;
  byResourceType: Record<
    string,
    {
      count: number;
      avgDuration: number;
      cacheHitRate: number;
      errorRate: number;
    }
  >;
}

export interface MetadataServicesDeps {
  cacheService: MetadataCacheService;
  discoveryService: MetadataDiscoveryService;
  recordService: MetadataRecordService;
  transformService: MetadataTransformService;
  metricsService: MetadataMetricsService;
}

export interface MetadataCacheService {
  getOrLoad(
    key: MetadataCacheKey,
    loader: () => Promise<MetadataResult>,
    ttl?: number
  ): Promise<CachedMetadataResult>;
}

export interface MetadataMetricsService {
  record(event: DiscoveryEvent): void;
  getMetrics(filter?: MetricsFilter): DiscoveryMetricsSummary;
  clear(): void;
}

export interface MetadataTransformService {
  parseAttributesResponse(data: unknown): unknown[];
  buildMappings(attributes: unknown[]): Record<string, string>;
  filterByCategory(
    attributes: Record<string, unknown> | unknown[],
    categories?: string[]
  ): Record<string, unknown> | unknown[];
}

export interface MetadataDiscoveryService {
  discoverForType(options: DiscoverTypeOptions): Promise<MetadataResult>;
  discoverTasks(options?: DiscoverTaskOptions): Promise<MetadataResult>;
  discoverObject(options: DiscoverObjectOptions): Promise<MetadataResult>;
}

export interface MetadataRecordService {
  getAttributesForRecord(
    resourceType: UniversalResourceType,
    recordId: string
  ): Promise<Record<string, unknown>>;
}

export interface MetadataErrorService {
  toStructuredError(
    resourceType: UniversalResourceType | string,
    error: unknown
  ): never;
  toRecordFetchError(
    resourceType: UniversalResourceType,
    recordId: string,
    error: unknown
  ): never;
}
