import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultMetadataDiscoveryService } from '../../../src/services/metadata/MetadataDiscoveryService.js';
import { DefaultMetadataErrorService } from '../../../src/services/metadata/MetadataErrorService.js';
import { InMemoryMetadataMetricsService } from '../../../src/services/metadata/MetadataMetricsService.js';
import { DefaultMetadataTransformService } from '../../../src/services/metadata/MetadataTransformService.js';
import type {
  MetadataCacheKey,
  MetadataCacheService,
  MetadataResult,
} from '../../../src/services/metadata/types.js';
import { UniversalResourceType } from '../../../src/handlers/tool-configs/universal/types.js';

class FakeMetadataCacheService implements MetadataCacheService {
  private readonly store = new Map<string, MetadataResult>();

  async getOrLoad(
    key: MetadataCacheKey,
    loader: () => Promise<MetadataResult>
  ) {
    const cacheKey = `${key.resourceType}:${key.objectSlug ?? ''}`;
    if (this.store.has(cacheKey)) {
      return { data: this.store.get(cacheKey)!, fromCache: true };
    }

    const data = await loader();
    this.store.set(cacheKey, data);
    return { data, fromCache: false };
  }
}

const mockGet = vi.fn();
const mockClient = { get: mockGet };

describe('DefaultMetadataDiscoveryService', () => {
  let cacheService: FakeMetadataCacheService;
  let metricsService: InMemoryMetadataMetricsService;
  let service: DefaultMetadataDiscoveryService;

  beforeEach(() => {
    cacheService = new FakeMetadataCacheService();
    metricsService = new InMemoryMetadataMetricsService();
    service = new DefaultMetadataDiscoveryService(
      cacheService,
      metricsService,
      new DefaultMetadataTransformService(),
      new DefaultMetadataErrorService()
    );

    vi.clearAllMocks();
    (globalThis as any).setTestApiClient?.(mockClient);
  });

  it('discovers attributes with caching and metrics', async () => {
    const attributes = [{ title: 'Name', api_slug: 'name', type: 'text' }];
    mockGet.mockResolvedValue({ data: { data: attributes } });

    const first = await service.discoverForType({
      resourceType: UniversalResourceType.COMPANIES,
    });
    const second = await service.discoverForType({
      resourceType: UniversalResourceType.COMPANIES,
    });

    expect(first.mappings).toEqual({ Name: 'name' });
    expect(second.mappings).toEqual({ Name: 'name' });
    expect(mockGet).toHaveBeenCalledTimes(1);

    const summary = metricsService.getMetrics({ includeErrors: true });
    expect(summary.totalRequests).toBe(2);
    expect(summary.cacheHits).toBe(1);
  });

  it('filters task attributes by category without API calls', async () => {
    mockGet.mockReset();

    const result = await service.discoverTasks({ categories: ['basic'] });

    expect(result.resource_type).toBe(UniversalResourceType.TASKS);
    const attributes = result.attributes as Array<{ category?: string }>;
    expect(attributes.every((attr) => attr.category === 'basic')).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('propagates structured errors from API failures', async () => {
    mockGet.mockRejectedValue(new Error('boom'));

    await expect(
      service.discoverForType({
        resourceType: UniversalResourceType.PEOPLE,
        useCache: false,
      })
    ).rejects.toThrowError('Failed to discover people attributes: boom');
  });
});
