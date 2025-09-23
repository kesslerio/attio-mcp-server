import type {
  DiscoveryEvent,
  DiscoveryMetricsSummary,
  MetadataMetricsService,
  MetricsFilter,
} from './types.js';

export class InMemoryMetadataMetricsService implements MetadataMetricsService {
  private readonly metrics: DiscoveryEvent[] = [];
  private readonly maxEntries = 1000;

  record(event: DiscoveryEvent): void {
    const metric: DiscoveryEvent = {
      timestamp: Date.now(),
      cacheHit: false,
      attributeCount: 0,
      ...event,
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxEntries) {
      this.metrics.shift();
    }
  }

  getMetrics(filter?: MetricsFilter): DiscoveryMetricsSummary {
    let filtered = [...this.metrics];

    if (filter?.resourceType) {
      filtered = filtered.filter(
        (metric) => metric.resourceType === filter.resourceType
      );
    }

    if (typeof filter?.since === 'number') {
      filtered = filtered.filter(
        (metric) => metric.timestamp! >= filter.since!
      );
    }

    if (!filter?.includeErrors) {
      filtered = filtered.filter((metric) => !metric.error);
    }

    const totalRequests = filtered.length;
    const cacheHits = filtered.filter((metric) => metric.cacheHit).length;
    const totalDuration = filtered.reduce(
      (sum, metric) => sum + metric.duration,
      0
    );
    const avgDuration = totalRequests > 0 ? totalDuration / totalRequests : 0;
    const errors = filtered.filter((metric) => metric.error).length;

    return {
      totalRequests,
      cacheHits,
      cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
      avgDuration,
      totalDuration,
      errors,
      errorRate: totalRequests > 0 ? errors / totalRequests : 0,
      slowRequests: filtered.filter((metric) => metric.duration > 3000).length,
      byResourceType: this.getResourceTypeBreakdown(filtered),
    };
  }

  clear(): void {
    this.metrics.length = 0;
  }

  private getResourceTypeBreakdown(
    metrics: DiscoveryEvent[]
  ): DiscoveryMetricsSummary['byResourceType'] {
    const breakdown: DiscoveryMetricsSummary['byResourceType'] = {};

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
      stats.count += 1;
      stats.avgDuration =
        (stats.avgDuration * (stats.count - 1) + metric.duration) / stats.count;
      stats.cacheHitRate =
        (stats.cacheHitRate * (stats.count - 1) + (metric.cacheHit ? 1 : 0)) /
        stats.count;
      stats.errorRate =
        (stats.errorRate * (stats.count - 1) + (metric.error ? 1 : 0)) /
        stats.count;
    }

    return breakdown;
  }
}
