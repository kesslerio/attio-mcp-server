/**
 * MetadataResolver - Centralized metadata fetching with caching
 *
 * Consolidates duplicate metadata fetching from UniversalUpdateService
 * and value-transformer into a single, cacheable operation.
 *
 * @see Issue #984 - Consolidate metadata fetching to reduce API calls by 40-60%
 */

import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { CachingService } from '@/services/CachingService.js';
import { DEFAULT_ATTRIBUTES_CACHE_TTL } from '@/constants/universal.constants.js';
import type { AttributeMetadata } from '@/services/value-transformer/types.js';
import { debug, error as logError } from '@/utils/logger.js';
import { convertToMetadataMap } from '@/utils/metadata-utils.js';

/**
 * Result of metadata resolution
 */
export interface MetadataResolutionResult {
  /** Map of attribute slug → metadata for transformer */
  metadataMap: Map<string, AttributeMetadata>;
  /** Array of attribute slugs (lowercase) for field mapper */
  availableAttributes: string[];
  /** Whether result came from cache (true) or fresh fetch (false) */
  fromCache: boolean;
}

/**
 * MetadataResolver - Single source of truth for metadata fetching
 */
export class MetadataResolver {
  /**
   * Fetch metadata for a resource type with caching
   *
   * This is the single entry point for metadata fetching across
   * UniversalUpdateService, UniversalCreateService, and value-transformer.
   *
   * @param resourceType - The resource type to fetch metadata for
   * @param recordData - Optional record data containing object slug
   * @returns Metadata map and available attributes for field mapping
   */
  static async fetchMetadata(
    resourceType: UniversalResourceType,
    recordData?: Record<string, unknown>
  ): Promise<MetadataResolutionResult> {
    const objectSlug = this.extractObjectSlug(resourceType, recordData);

    try {
      // Try cache first, then load fresh data
      const result = await CachingService.getOrLoadAttributes(
        () => this.fetchFreshMetadata(resourceType, objectSlug),
        resourceType,
        objectSlug,
        DEFAULT_ATTRIBUTES_CACHE_TTL
      );

      // Use shared utility from metadata-utils (PR #1006 Phase 2.1)
      const metadataMap = convertToMetadataMap(result.data);
      const availableAttributes = this.extractAttributeSlugs(metadataMap);

      debug('MetadataResolver', 'Metadata fetched', {
        resourceType,
        objectSlug,
        fromCache: result.fromCache,
        attributeCount: metadataMap.size,
      });

      return {
        metadataMap,
        availableAttributes,
        fromCache: result.fromCache,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Re-throw critical authentication errors (Issue #984 extension - PR review feedback)
      if (
        error.message.includes('401') ||
        error.message.includes('403') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('Forbidden')
      ) {
        logError(
          'MetadataResolver',
          'Authentication error fetching metadata',
          error,
          { resourceType, objectSlug }
        );
        throw error;
      }

      // Re-throw schema validation errors
      if (
        error.message.includes('validation') ||
        error.message.includes('schema')
      ) {
        logError(
          'MetadataResolver',
          'Schema validation error fetching metadata',
          error,
          { resourceType, objectSlug }
        );
        throw error;
      }

      // Log and return empty for non-critical errors (transient failures, network issues)
      logError(
        'MetadataResolver',
        'Non-critical metadata fetch error, using empty metadata',
        error,
        { resourceType, objectSlug }
      );

      debug('MetadataResolver', 'Graceful degradation with empty metadata', {
        resourceType,
        objectSlug,
      });

      return {
        metadataMap: new Map(),
        availableAttributes: [],
        fromCache: false,
      };
    }
  }

  /**
   * Fetch fresh metadata from Attio API
   */
  private static async fetchFreshMetadata(
    resourceType: UniversalResourceType,
    objectSlug?: string
  ): Promise<Record<string, unknown>> {
    const { UniversalMetadataService } =
      await import('@/services/UniversalMetadataService.js');

    const options = objectSlug ? { objectSlug } : undefined;
    return UniversalMetadataService.discoverAttributesForResourceType(
      resourceType,
      options
    );
  }

  /**
   * Extract object slug from resource type and record data
   */
  public static extractObjectSlug(
    resourceType: UniversalResourceType,
    recordData?: Record<string, unknown>
  ): string | undefined {
    if (resourceType === UniversalResourceType.RECORDS) {
      return (
        (recordData?.object as string) ||
        (recordData?.object_api_slug as string) ||
        'records'
      );
    }
    if (resourceType === UniversalResourceType.DEALS) {
      return 'deals';
    }
    return undefined;
  }

  /**
   * Extract attribute slugs for field mapper (lowercase)
   */
  private static extractAttributeSlugs(
    metadataMap: Map<string, AttributeMetadata>
  ): string[] {
    return Array.from(
      new Set(
        Array.from(metadataMap.values()).flatMap((attr) => {
          return [attr.api_slug, attr.title, attr.slug]
            .filter((s): s is string => typeof s === 'string')
            .map((s) => s.toLowerCase());
        })
      )
    );
  }
}
