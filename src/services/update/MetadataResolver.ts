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
import { debug } from '@/utils/logger.js';

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
 * Type guard for attribute objects
 */
function isAttributeObject(
  obj: unknown
): obj is Record<string, unknown> & { api_slug?: string } {
  return typeof obj === 'object' && obj !== null;
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

      const metadataMap = this.convertToMetadataMap(result.data);
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
    } catch (error) {
      debug('MetadataResolver', 'Failed to fetch metadata', {
        resourceType,
        objectSlug,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return empty result on error (best-effort)
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
    const { UniversalMetadataService } = await import(
      '@/services/UniversalMetadataService.js'
    );

    const options = objectSlug ? { objectSlug } : undefined;
    return UniversalMetadataService.discoverAttributesForResourceType(
      resourceType,
      options
    );
  }

  /**
   * Extract object slug from resource type and record data
   */
  private static extractObjectSlug(
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
   * Convert schema response to metadata map
   */
  private static convertToMetadataMap(
    schema: Record<string, unknown>
  ): Map<string, AttributeMetadata> {
    const map = new Map<string, AttributeMetadata>();
    const allAttrs = (schema.attributes || schema.all || []) as Array<unknown>;

    for (const attr of allAttrs) {
      if (!isAttributeObject(attr)) {
        continue;
      }

      const slug = (attr.api_slug || attr.slug || '') as string;
      if (!slug) {
        continue;
      }

      map.set(slug, {
        slug,
        type: (attr.type as string) || 'unknown',
        title: attr.title as string | undefined,
        api_slug: attr.api_slug as string | undefined,
        is_system_attribute: attr.is_system_attribute as boolean | undefined,
        is_writable: attr.is_writable as boolean | undefined,
        is_multiselect: attr.is_multiselect as boolean | undefined,
        relationship: attr.relationship as
          | { object?: string; cardinality?: string }
          | undefined,
      });
    }

    return map;
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
