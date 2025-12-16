/**
 * Service for fetching and aggregating Attio workspace schema data
 *
 * This service orchestrates calls to existing services to build a complete
 * workspace schema including objects, attributes, select options, and metadata.
 *
 * @see Issue #983
 */

import { getObjectAttributeMetadata } from '@/api/attribute-types.js';
import { getLazyAttioClient } from '@/api/lazy-client.js';
import { AttributeOptionsService } from '@/services/metadata/AttributeOptionsService.js';
import {
  debug as logDebug,
  error as logError,
  warn as logWarn,
} from '@/utils/logger.js';
import type {
  WorkspaceSchema,
  ObjectSchema,
  AttributeSchema,
  FetchSchemaOptions,
} from './types.js';

/**
 * Represents a nested option ID object returned by Attio API
 * @see Issue #1014
 */
interface NestedOptionId {
  option_id: string;
  workspace_id?: string;
  object_id?: string;
  attribute_id?: string;
}

/**
 * Type guard to check if an ID is a nested option ID object
 * Attio API returns option IDs as nested objects: {workspace_id, object_id, attribute_id, option_id}
 * @param id - The ID value to check
 * @returns True if the ID is a nested option ID object
 * @see Issue #1014
 */
function isNestedOptionId(id: unknown): id is NestedOptionId {
  return typeof id === 'object' && id !== null && 'option_id' in id;
}

/**
 * Generates a slug-style value from an option title
 * Converts "Existing Customer" → "existing_customer"
 * @param title - The option title
 * @returns Slug-style value
 * @see Issue #1014
 */
function generateOptionValue(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, ''); // Trim leading/trailing underscores
}

/**
 * Service for fetching complete workspace schema data
 *
 * Note: API key flows through getLazyAttioClient() from environment/context,
 * not through constructor dependency injection.
 */
export class WorkspaceSchemaService {
  /**
   * Creates a new WorkspaceSchemaService
   */
  constructor() {
    // No parameters needed - API key flows through getLazyAttioClient()
  }

  /**
   * Fetches the display title for an object from the Attio API
   *
   * @param objectSlug - Object API slug (e.g., 'companies', 'custom_prospecting_list')
   * @returns The object title from Attio, or null if fetch fails
   * @see Issue #1017
   */
  private async fetchObjectTitle(objectSlug: string): Promise<string | null> {
    try {
      const client = getLazyAttioClient();
      const response = await client.get(`/objects/${objectSlug}`);
      const obj = response?.data?.data || response?.data;
      return obj?.title || null;
    } catch {
      logDebug(
        'WorkspaceSchemaService',
        `Could not fetch title for ${objectSlug}, using fallback`,
        { objectSlug }
      );
      return null;
    }
  }

  private getOptionFetchDelayMs(options: FetchSchemaOptions): number {
    const optionFetchDelayMs = options.optionFetchDelayMs;
    if (optionFetchDelayMs === undefined) return 100;
    if (
      typeof optionFetchDelayMs !== 'number' ||
      !Number.isFinite(optionFetchDelayMs) ||
      optionFetchDelayMs < 0
    ) {
      return 100;
    }
    return optionFetchDelayMs;
  }

  /**
   * Fetches complete workspace schema for specified objects
   *
   * This method implements graceful degradation:
   * - If an object fails to fetch, it logs the error and continues with other objects
   * - If an attribute's options fail to fetch, it includes the attribute without options
   *
   * @param objectSlugs - Array of object slugs to fetch (e.g., ['companies', 'people'])
   * @param options - Fetching options (max options, include archived)
   * @returns Complete workspace schema
   */
  async fetchSchema(
    objectSlugs: string[],
    options: FetchSchemaOptions
  ): Promise<WorkspaceSchema> {
    const objects: ObjectSchema[] = [];

    for (const objectSlug of objectSlugs) {
      try {
        const objectSchema = await this.fetchObjectSchema(objectSlug, options);
        objects.push(objectSchema);
      } catch (error: unknown) {
        logError(
          'WorkspaceSchemaService',
          `Failed to fetch schema for ${objectSlug}`,
          error instanceof Error ? error : new Error(String(error)),
          { objectSlug }
        );
        // Continue processing other objects despite error
      }
    }

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        workspace: 'attio', // Could be enhanced to fetch actual workspace name
        objects: objectSlugs,
      },
      objects,
    };
  }

  /**
   * Fetches schema for a single object
   *
   * @param objectSlug - Object slug (e.g., 'companies', 'people', 'deals')
   * @param options - Fetching options
   * @returns Object schema with all attributes and metadata
   */
  private async fetchObjectSchema(
    objectSlug: string,
    options: FetchSchemaOptions
  ): Promise<ObjectSchema> {
    const optionFetchDelayMs = this.getOptionFetchDelayMs(options);
    const PHASE1_OBJECTS = ['companies', 'people', 'deals'];

    // 1. Fetch object title from API for custom objects (Issue #1017)
    // Skip API call for Phase 1 objects - they have hardcoded display names
    const objectTitle = PHASE1_OBJECTS.includes(objectSlug)
      ? null
      : await this.fetchObjectTitle(objectSlug);

    // 2. Fetch attribute metadata (uses existing 15min TTL cache)
    const metadataMap = await getObjectAttributeMetadata(objectSlug);

    // 3. Convert metadata to AttributeSchema array
    const attributes: AttributeSchema[] = [];

    for (const [apiSlug, metadata] of metadataMap.entries()) {
      const attributeSchema: AttributeSchema = {
        apiSlug,
        displayName: metadata.title,
        type: metadata.type,
        isMultiselect: metadata.is_multiselect || false,
        isUnique: metadata.is_unique || false,
        isRequired: metadata.is_required || false,
        isWritable: metadata.is_writable !== false, // Default to true
        description: metadata.description,
      };

      // 4. Fetch options for select/status attributes
      if (this.isOptionBasedAttribute(metadata.type)) {
        try {
          const optionsResult = await AttributeOptionsService.getOptions(
            objectSlug,
            apiSlug,
            options.includeArchived
          );

          // Apply truncation
          const totalOptions = optionsResult.options.length;
          const truncated = totalOptions > options.maxOptionsPerAttribute;

          attributeSchema.options = optionsResult.options
            .slice(0, options.maxOptionsPerAttribute)
            .map((opt) => ({
              // Handle nested ID objects from Attio API
              // API returns: { workspace_id, object_id, attribute_id, option_id }
              id: isNestedOptionId(opt.id)
                ? opt.id.option_id
                : typeof opt.id === 'string'
                  ? opt.id
                  : '',
              title: opt.title,
              // Generate slug-style value from title since Attio API doesn't provide it
              // "Existing Customer" → "existing_customer"
              value: generateOptionValue(opt.title),
              isArchived: 'is_archived' in opt ? opt.is_archived : false,
            }));

          attributeSchema.optionsTruncated = truncated;
          attributeSchema.totalOptions = totalOptions;

          // Rate limiting: Add delay between option fetches
          if (optionFetchDelayMs > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, optionFetchDelayMs)
            );
          }
        } catch (error: unknown) {
          // Log warning but don't fail - attribute can still be documented
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logWarn(
            'WorkspaceSchemaService',
            `No options available for ${objectSlug}.${apiSlug}`,
            { objectSlug, attributeSlug: apiSlug, errorMessage }
          );
        }
      }

      // 5. Add complex type structures
      if (this.isComplexType(metadata.type)) {
        attributeSchema.complexTypeStructure = this.getComplexTypeStructure(
          metadata.type
        );
      }

      // 6. Add relationship metadata (only when we have real data)
      if (metadata.relationship?.object && metadata.relationship?.cardinality) {
        attributeSchema.relationship = {
          targetObject: metadata.relationship.object,
          cardinality: metadata.relationship.cardinality,
        };
      }

      attributes.push(attributeSchema);
    }

    return {
      objectSlug,
      displayName: this.getDisplayName(objectSlug, objectTitle),
      attributes,
    };
  }

  /**
   * Checks if an attribute type supports options (select, status, multi-select)
   *
   * @param type - Attribute type from Attio API
   * @returns True if attribute supports options
   */
  private isOptionBasedAttribute(type: string): boolean {
    return ['select', 'status', 'multi-select'].includes(type);
  }

  /**
   * Checks if an attribute type is a complex type requiring structure documentation
   *
   * @param type - Attribute type from Attio API
   * @returns True if attribute is a complex type
   */
  private isComplexType(type: string): boolean {
    return [
      'location',
      'personal-name',
      'phone-number',
      'email-address',
    ].includes(type);
  }

  /**
   * Gets the structure definition for complex attribute types
   *
   * @param type - Complex attribute type
   * @returns Structure definition with field types
   */
  private getComplexTypeStructure(type: string): Record<string, unknown> {
    switch (type) {
      case 'location':
        return {
          line_1: 'string | null (street address)',
          line_2: 'string | null (apt/suite)',
          line_3: 'string | null (additional)',
          line_4: 'string | null (additional)',
          locality: 'string | null (city)',
          region: 'string | null (state/province)',
          postcode: 'string | null (ZIP/postal code)',
          country_code: 'string | null (ISO country code)',
          latitude: 'number | null (coordinates)',
          longitude: 'number | null (coordinates)',
        };

      case 'personal-name':
        return {
          first_name: 'string (required)',
          last_name: 'string | null',
          middle_name: 'string | null',
          title: 'string | null (e.g., "Dr.", "Prof.")',
          full_name: 'string (auto-generated, read-only)',
        };

      case 'phone-number':
        return {
          country_code: 'string (e.g., "+1")',
          number: 'string (digits only)',
          original_number: 'string (as provided)',
        };

      case 'email-address':
        return {
          email_address: 'string (valid email format)',
        };

      default:
        return {};
    }
  }

  /**
   * Gets human-readable display name for an object slug
   *
   * Uses the fetched title from Attio API if available, otherwise falls back
   * to hardcoded display names for Phase 1 objects or slug capitalization.
   *
   * @param objectSlug - Object API slug
   * @param fetchedTitle - Title fetched from Attio API (optional)
   * @returns Human-readable display name
   * @see Issue #1017
   */
  private getDisplayName(
    objectSlug: string,
    fetchedTitle?: string | null
  ): string {
    // Use API-fetched title if available
    if (fetchedTitle) {
      return fetchedTitle;
    }

    // Fallback to hardcoded display names for Phase 1 objects
    const displayNames: Record<string, string> = {
      companies: 'Companies',
      people: 'People',
      deals: 'Deals',
    };

    // If not in map, title-case the slug (replace underscores with spaces)
    return (
      displayNames[objectSlug] ||
      objectSlug
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );
  }
}
