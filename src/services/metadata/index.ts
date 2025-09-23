import { DefaultMetadataCacheService } from './MetadataCacheService.js';
import { DefaultMetadataDiscoveryService } from './MetadataDiscoveryService.js';
import { DefaultMetadataErrorService } from './MetadataErrorService.js';
import { InMemoryMetadataMetricsService } from './MetadataMetricsService.js';
import { DefaultMetadataRecordService } from './MetadataRecordService.js';
import { DefaultMetadataTransformService } from './MetadataTransformService.js';
import type { MetadataServicesDeps } from './types.js';

export function createDefaultMetadataServices(): MetadataServicesDeps {
  const errorService = new DefaultMetadataErrorService();
  const metricsService = new InMemoryMetadataMetricsService();
  const cacheService = new DefaultMetadataCacheService();
  const transformService = new DefaultMetadataTransformService();
  const discoveryService = new DefaultMetadataDiscoveryService(
    cacheService,
    metricsService,
    transformService,
    errorService
  );
  const recordService = new DefaultMetadataRecordService(errorService);

  return {
    cacheService,
    discoveryService,
    recordService,
    transformService,
    metricsService,
  };
}

export * from './types.js';
export { DefaultMetadataCacheService } from './MetadataCacheService.js';
export { DefaultMetadataDiscoveryService } from './MetadataDiscoveryService.js';
export { DefaultMetadataErrorService } from './MetadataErrorService.js';
export { InMemoryMetadataMetricsService } from './MetadataMetricsService.js';
export { DefaultMetadataRecordService } from './MetadataRecordService.js';
export { DefaultMetadataTransformService } from './MetadataTransformService.js';
