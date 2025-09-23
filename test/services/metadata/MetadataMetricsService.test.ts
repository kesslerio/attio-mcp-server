import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryMetadataMetricsService } from '../../../src/services/metadata/MetadataMetricsService.js';

describe('InMemoryMetadataMetricsService', () => {
  let service: InMemoryMetadataMetricsService;

  beforeEach(() => {
    service = new InMemoryMetadataMetricsService();
  });

  it('records discovery events and summarises metrics', () => {
    service.record({
      resourceType: 'companies',
      duration: 120,
      cacheHit: false,
      attributeCount: 5,
    });

    service.record({
      resourceType: 'companies',
      duration: 80,
      cacheHit: true,
      attributeCount: 5,
    });

    const summary = service.getMetrics();

    expect(summary.totalRequests).toBe(2);
    expect(summary.cacheHits).toBe(1);
    expect(summary.avgDuration).toBeCloseTo(100, 5);
    expect(summary.byResourceType['companies'].count).toBe(2);
  });

  it('filters metrics by resource type and clears data', () => {
    service.record({
      resourceType: 'companies',
      duration: 50,
      cacheHit: false,
    });
    service.record({
      resourceType: 'people',
      duration: 100,
      cacheHit: false,
      error: 'timeout',
    });

    const summary = service.getMetrics({ resourceType: 'people' });
    expect(summary.totalRequests).toBe(0); // filtered summary excludes errors by default

    const summaryWithErrors = service.getMetrics({
      resourceType: 'people',
      includeErrors: true,
    });
    expect(summaryWithErrors.totalRequests).toBe(1);

    service.clear();
    const cleared = service.getMetrics();
    expect(cleared.totalRequests).toBe(0);
  });
});
