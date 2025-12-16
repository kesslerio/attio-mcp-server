/**
 * Service for fetching and aggregating Attio workspace schema data
 *
 * This service orchestrates calls to existing services to build a complete
 * workspace schema including objects, attributes, select options, and metadata.
 *
 * @see Issue #983
 */

import { getObjectAttributeMetadata } from '@/api/attribute-types.js';
import { AttributeOptionsService } from '@/services/metadata/AttributeOptionsService.js';
import { error as logError, warn as logWarn } from '@/utils/logger.js';
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

  private getOptionFetchDelayMs(options: FetchSchemaOptions): number {
    if (options.optionFetchDelayMs === undefined) return 100;
    if (
      typeof options.optionFetchDelayMs !== 'number' ||
      !Number.isFinite(options.optionFetchDelayMs) ||
      options.optionFetchDelayMs < 0
    ) {
      logWarn(
        'WorkspaceSchemaService',
        `Invalid optionFetchDelayMs (${String(options.optionFetchDelayMs)}); using default 100ms`,
        { optionFetchDelayMs: options.optionFetchDelayMs }
      );
      return 100;
    }
    return options.optionFetchDelayMs;
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

    // 1. Fetch attribute metadata (uses existing 15min TTL cache)
    const metadataMap = await getObjectAttributeMetadata(objectSlug);

    // 2. Convert metadata to AttributeSchema array
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

      // 3. Fetch options for select/status attributes
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
          logWarn(
            'WorkspaceSchemaService',
            `No options available for ${objectSlug}.${apiSlug}`,
            { objectSlug, attributeSlug: apiSlug, error }
          );
        }
      }

      // 4. Add complex type structures
      if (this.isComplexType(metadata.type)) {
        attributeSchema.complexTypeStructure = this.getComplexTypeStructure(
          metadata.type
        );
      }

      // 5. Add relationship metadata (only when we have real data)
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
      displayName: this.getDisplayName(objectSlug),
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
   * @param objectSlug - Object API slug
   * @returns Capitalized display name
   */
  private getDisplayName(objectSlug: string): string {
    const displayNames: Record<string, string> = {
      companies: 'Companies',
      people: 'People',
      deals: 'Deals',
    };

    // If not in map, capitalize first letter of slug
    return (
      displayNames[objectSlug] ||
      objectSlug.charAt(0).toUpperCase() + objectSlug.slice(1)
    );
  }
}
