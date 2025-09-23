import { CachingService } from '../CachingService.js';
import type {
  CachedMetadataResult,
  MetadataCacheKey,
  MetadataCacheService,
  MetadataResult,
} from './types.js';

export class DefaultMetadataCacheService implements MetadataCacheService {
  async getOrLoad(
    key: MetadataCacheKey,
    loader: () => Promise<MetadataResult>,
    ttl?: number
  ): Promise<CachedMetadataResult> {
    return CachingService.getOrLoadAttributes(
      loader,
      key.resourceType,
      key.objectSlug,
      ttl
    );
  }
}
