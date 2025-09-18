/**
 * Schema Pre-validation Utility
 *
 * Validates record data against available attributes before API calls.
 * Uses discover-attributes to ensure fields exist and are correctly formatted.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import {
  UniversalValidationError,
  ErrorType,
  HttpStatusCode,
} from '../handlers/tool-configs/universal/schemas.js';

// Import discover attribute handlers
import { discoverCompanyAttributes } from '../objects/companies/index.js';

/**
 * Attribute metadata from discover-attributes
 */
export interface AttributeMetadata {
  id: string;
  slug: string;
  name: string;
  type: string;
  is_system?: boolean;
  is_writable?: boolean;
  is_required?: boolean;
  allowed_values?: unknown[];
  format?: string;
}

/**
 * Cached attribute schemas by resource type
 */
const attributeCache: Map<
  string,
  {
    attributes: AttributeMetadata[];
    timestamp: number;
  }
> = new Map();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Schema pre-validation service
 */
export class SchemaPreValidator {
  /**
   * Generate cache key with tenant/workspace context
   */
  private static getCacheKey(
    resourceType: UniversalResourceType,
    context?: { workspaceId?: string; tenantId?: string }
  ): string {
    // Build cache key with optional context for multi-tenant support
    const parts = [resourceType.toLowerCase()];

    // Add workspace context if available (from environment or passed context)
    const workspaceId = context?.workspaceId || process.env.ATTIO_WORKSPACE_ID;
    if (workspaceId) {
      parts.push(`ws:${workspaceId}`);
    }

    // Add tenant context if available (for future multi-tenant support)
    const tenantId = context?.tenantId || process.env.ATTIO_TENANT_ID;
    if (tenantId) {
      parts.push(`tenant:${tenantId}`);
    }

    return parts.join(':');
  }

  /**
   * Get attributes for a resource type
   */
  static async getAttributes(
    resourceType: UniversalResourceType,
    context?: { workspaceId?: string; tenantId?: string }
  ): Promise<AttributeMetadata[]> {
    const cacheKey = this.getCacheKey(resourceType, context);
    const cached = attributeCache.get(cacheKey);

    // Check cache validity
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.attributes;
    }

    try {
      let attributes: AttributeMetadata[] = [];

      switch (resourceType) {
        case UniversalResourceType.COMPANIES:
          try {
            const companyAttrs = await discoverCompanyAttributes();
            attributes = this.normalizeAttributes(companyAttrs);
            // If no attributes returned, use defaults
            if (attributes.length === 0) {
              attributes = this.getDefaultCompanyAttributes();
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_error: unknown) {
            // Fallback to defaults on error
            attributes = this.getDefaultCompanyAttributes();
          }
          break;

        case UniversalResourceType.PEOPLE:
          // FEATURE: Dynamic person attributes discovery
          // Requires: Attio API /objects/people/attributes endpoint
          // Fallback: Default people attributes schema
          attributes = this.getDefaultPeopleAttributes();
          break;

        case UniversalResourceType.DEALS:
          // FEATURE: Dynamic deal attributes discovery
          // Requires: Attio API /objects/deals/attributes endpoint
          // Status: Pending Attio deals API feature availability
          attributes = this.getDefaultDealAttributes();
          break;

        case UniversalResourceType.TASKS:
          // TODO: Implement when task discover-attributes is available
          attributes = this.getDefaultTaskAttributes();
          break;

        default:
          // For unknown types, return basic attributes
          attributes = this.getDefaultAttributes();
      }

      // Update cache
      attributeCache.set(cacheKey, {
        attributes,
        timestamp: Date.now(),
      });

      return attributes;
    } catch (error: unknown) {
      console.warn(`Failed to fetch attributes for ${resourceType}:`, error);
      // Return default attributes on error
      return this.getDefaultAttributes();
    }
  }

  /**
   * Normalize attributes from API response
   */
  private static normalizeAttributes(
    apiResponse: unknown
  ): AttributeMetadata[] {
    // Handle both array format (direct attributes) and object format (discovery response)
    let attributesList: Record<string, unknown>[] = [];

    if (Array.isArray(apiResponse)) {
      attributesList = apiResponse;
    } else if (apiResponse && typeof apiResponse === 'object') {
      const responseObject = apiResponse as Record<string, unknown>;
      // Handle discoverCompanyAttributes response format: { standard: [], custom: [], all: [] }
      if (Array.isArray(responseObject.all)) {
        // Handle both string array and object array formats
        attributesList = responseObject.all.map((attr: unknown) => {
          if (typeof attr === 'string') {
            return { slug: attr, name: attr };
          }
          return attr as Record<string, unknown>; // Already an object
        });
      } else if (Array.isArray(responseObject.standard)) {
        attributesList = responseObject.standard.map((attr: unknown) => {
          if (typeof attr === 'string') {
            return { slug: attr, name: attr };
          }
          return attr as Record<string, unknown>;
        });
      }
    }

    if (attributesList.length === 0) {
      return [];
    }

    // Helper to create a safe slug from any string
    const toSlug = (input: unknown): string | undefined => {
      if (typeof input !== 'string' || input.length === 0) return undefined;
      return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_{2,}/g, '_');
    };

    // Normalize and filter invalid entries defensively
    const normalizedAttrs = attributesList
      .map((attr: Record<string, unknown>) => {
        const rawSlug = attr?.slug ?? attr?.id ?? attr?.name ?? attr?.title;
        const slug = toSlug(rawSlug);
        if (!slug) return undefined;
        return {
          id: (attr?.id as string) || slug,
          slug,
          name: (attr?.name as string) || (attr?.title as string) || slug,
          type:
            (attr?.value_type as string) || (attr?.type as string) || 'text',
          is_system: Boolean(attr?.is_system) || false,
          is_writable: attr?.is_writable !== false,
          // Treat name as required by default
          is_required:
            slug === 'name' ? true : Boolean(attr?.is_required) || false,
          allowed_values:
            (attr?.allowed_values as unknown[]) || (attr?.options as unknown[]),
          format: attr?.format as string,
        } as AttributeMetadata;
      })
      .filter((a: AttributeMetadata | undefined): a is AttributeMetadata =>
        Boolean(a && a.slug)
      );

    return normalizedAttrs;
  }

  /**
   * Get default attributes for companies
   */
  private static getDefaultCompanyAttributes(): AttributeMetadata[] {
    return [
      {
        id: 'name',
        slug: 'name',
        name: 'Name',
        type: 'text',
        is_system: true,
        is_required: true,
      },
      {
        id: 'domains',
        slug: 'domains',
        name: 'Domains',
        type: 'text',
        is_system: true,
      },
      {
        id: 'description',
        slug: 'description',
        name: 'Description',
        type: 'text',
        is_system: true,
      },
      {
        id: 'team',
        slug: 'team',
        name: 'Team',
        type: 'record-reference',
        is_system: true,
      },
      {
        id: 'categories',
        slug: 'categories',
        name: 'Categories',
        type: 'select',
        is_system: true,
      },
      {
        id: 'primary_location',
        slug: 'primary_location',
        name: 'Primary Location',
        type: 'location',
        is_system: true,
      },
      {
        id: 'angellist',
        slug: 'angellist',
        name: 'AngelList',
        type: 'url',
        is_system: true,
      },
      {
        id: 'facebook',
        slug: 'facebook',
        name: 'Facebook',
        type: 'url',
        is_system: true,
      },
      {
        id: 'instagram',
        slug: 'instagram',
        name: 'Instagram',
        type: 'url',
        is_system: true,
      },
      {
        id: 'linkedin',
        slug: 'linkedin',
        name: 'LinkedIn',
        type: 'url',
        is_system: true,
      },
      {
        id: 'twitter',
        slug: 'twitter',
        name: 'Twitter',
        type: 'url',
        is_system: true,
      },
      {
        id: 'associated_deals',
        slug: 'associated_deals',
        name: 'Associated Deals',
        type: 'record-reference',
        is_system: true,
      },
      {
        id: 'associated_workspaces',
        slug: 'associated_workspaces',
        name: 'Associated Workspaces',
        type: 'record-reference',
        is_system: true,
      },
    ];
  }

  /**
   * Get default attributes for people
   */
  private static getDefaultPeopleAttributes(): AttributeMetadata[] {
    return [
      {
        id: 'name',
        slug: 'name',
        name: 'Name',
        type: 'object',
        is_system: true,
      },
      {
        id: 'first_name',
        slug: 'first_name',
        name: 'First Name',
        type: 'text',
        is_system: true,
      },
      {
        id: 'last_name',
        slug: 'last_name',
        name: 'Last Name',
        type: 'text',
        is_system: true,
      },
      {
        id: 'email_addresses',
        slug: 'email_addresses',
        name: 'Email Addresses',
        type: 'array',
        is_system: true,
      },
      {
        id: 'phone_numbers',
        slug: 'phone_numbers',
        name: 'Phone Numbers',
        type: 'array',
        is_system: true,
      },
      {
        id: 'job_title',
        slug: 'job_title',
        name: 'Job Title',
        type: 'text',
        is_system: true,
      },
      {
        id: 'company',
        slug: 'company',
        name: 'Company',
        type: 'reference',
        is_system: true,
      },
    ];
  }

  /**
   * Get default attributes for deals
   */
  private static getDefaultDealAttributes(): AttributeMetadata[] {
    return [
      {
        id: 'name',
        slug: 'name',
        name: 'Deal Name',
        type: 'text',
        is_system: true,
        is_required: true,
      },
      {
        id: 'value',
        slug: 'value',
        name: 'Value',
        type: 'currency',
        is_system: true,
      },
      {
        id: 'stage',
        slug: 'stage',
        name: 'Stage',
        type: 'text',
        is_system: true,
      },
      {
        id: 'close_date',
        slug: 'close_date',
        name: 'Close Date',
        type: 'date',
        is_system: true,
      },
      {
        id: 'probability',
        slug: 'probability',
        name: 'Probability',
        type: 'number',
        is_system: true,
      },
      {
        id: 'owner',
        slug: 'owner',
        name: 'Owner',
        type: 'reference',
        is_system: true,
      },
    ];
  }

  /**
   * Get default attributes for tasks
   */
  private static getDefaultTaskAttributes(): AttributeMetadata[] {
    return [
      {
        id: 'title',
        slug: 'title',
        name: 'Title',
        type: 'text',
        is_system: true,
        is_required: true,
      },
      {
        id: 'description',
        slug: 'description',
        name: 'Description',
        type: 'text',
        is_system: true,
      },
      {
        id: 'due_date',
        slug: 'due_date',
        name: 'Due Date',
        type: 'date',
        is_system: true,
      },
      {
        id: 'status',
        slug: 'status',
        name: 'Status',
        type: 'text',
        is_system: true,
      },
      {
        id: 'priority',
        slug: 'priority',
        name: 'Priority',
        type: 'text',
        is_system: true,
      },
      {
        id: 'assignee',
        slug: 'assignee',
        name: 'Assignee',
        type: 'reference',
        is_system: true,
      },
    ];
  }

  /**
   * Get default generic attributes
   */
  private static getDefaultAttributes(): AttributeMetadata[] {
    return [
      {
        id: 'name',
        slug: 'name',
        name: 'Name',
        type: 'text',
        is_system: true,
        is_required: true,
      },
      {
        id: 'description',
        slug: 'description',
        name: 'Description',
        type: 'text',
        is_system: true,
      },
      {
        id: 'created_at',
        slug: 'created_at',
        name: 'Created At',
        type: 'datetime',
        is_system: true,
      },
      {
        id: 'updated_at',
        slug: 'updated_at',
        name: 'Updated At',
        type: 'datetime',
        is_system: true,
      },
    ];
  }

  /**
   * Validate record data against available attributes
   */
  static async validateRecordData(
    resourceType: UniversalResourceType,
    recordData: Record<string, unknown>,
    context?: { workspaceId?: string; tenantId?: string }
  ): Promise<{
    isValid: boolean;
    valid: boolean; // Keep for backward compatibility
    errors: string[];
    warnings: string[];
    suggestions: Map<string, string>;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions = new Map<string, string>();

    // Get available attributes with context for multi-tenant support
    const attributes = await this.getAttributes(resourceType, context);
    // Filter out any malformed attributes (defensive)
    const safeAttributes = (attributes || []).filter(
      (a): a is AttributeMetadata =>
        Boolean(a && typeof a.slug === 'string' && a.slug.length > 0)
    );
    const attributeMap = new Map(
      safeAttributes.map((attr) => [attr.slug.toLowerCase(), attr])
    );

    // Also create a map of common variations
    const variationMap = new Map<string, string>();
    for (const attr of safeAttributes) {
      // Add common variations
      variationMap.set(attr.slug.replace(/_/g, ''), attr.slug);
      variationMap.set(attr.slug.replace(/_/g, '-'), attr.slug);
      variationMap.set(attr.slug.replace(/-/g, '_'), attr.slug);

      // Add camelCase variations
      const camelCase = attr.slug.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      variationMap.set(camelCase, attr.slug);

      // Add common alias mappings for known fields
      // Singular/plural variations
      if (attr.slug === 'domains') variationMap.set('domain', 'domains');
      if (attr.slug === 'email_addresses')
        variationMap.set('email_address', 'email_addresses');
      if (attr.slug === 'phone_numbers') {
        variationMap.set('phone', 'phone_numbers');
        variationMap.set('phone_number', 'phone_numbers');
      }
    }

    // Check each field in record data
    for (const [field, value] of Object.entries(recordData)) {
      const fieldLower = field.toLowerCase();

      // Check if field exists
      if (!attributeMap.has(fieldLower)) {
        // Check for common variations
        const suggestion =
          variationMap.get(fieldLower) ||
          this.findSimilarAttribute(field, attributes);

        if (suggestion) {
          warnings.push(
            `Field "${field}" might be misspelled. Did you mean "${suggestion}"?`
          );
          suggestions.set(field, suggestion);
        } else {
          errors.push(
            `Unknown field: "${field}". This field does not exist for ${resourceType}.`
          );
        }
      } else {
        // Validate field type
        const attr = attributeMap.get(fieldLower)!;
        const typeError = this.validateFieldType(field, value, attr);
        if (typeError) {
          errors.push(typeError);
        }

        // Check if field is writable
        if (attr.is_writable === false) {
          warnings.push(`Field "${field}" is read-only and will be ignored.`);
        }
      }
    }

    // Check for required fields
    const requiredFields = safeAttributes.filter((attr) => attr.is_required);
    for (const attr of requiredFields) {
      if (
        !(attr.slug in recordData) &&
        !(attr.slug.toLowerCase() in recordData)
      ) {
        errors.push(`Missing required field: "${attr.slug}"`);
      }
    }

    const isValid = errors.length === 0;
    return {
      isValid,
      valid: isValid, // Keep for backward compatibility
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Find similar attribute name using Levenshtein distance
   */
  private static findSimilarAttribute(
    field: string,
    attributes: AttributeMetadata[]
  ): string | null {
    const fieldLower = field.toLowerCase();
    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const attr of attributes) {
      const distance = this.levenshteinDistance(
        fieldLower,
        attr.slug.toLowerCase()
      );

      // Consider it a match if distance is less than 3 (minor typo)
      if (distance < 3 && distance < bestDistance) {
        bestDistance = distance;
        bestMatch = attr.slug;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Validate field type
   */
  private static validateFieldType(
    field: string,
    value: unknown,
    attr: AttributeMetadata
  ): string | null {
    if (value === null || value === undefined) {
      return null; // Allow null/undefined
    }

    switch (attr.type) {
      case 'text':
      case 'string':
        if (typeof value !== 'string') {
          return `Field "${field}" expects a string, got ${typeof value}`;
        }
        break;

      case 'number':
      case 'integer':
        if (typeof value !== 'number') {
          return `Field "${field}" expects a number, got ${typeof value}`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Field "${field}" expects a boolean, got ${typeof value}`;
        }
        break;

      case 'date':
      case 'datetime':
        // Accept string dates or Date objects
        if (typeof value !== 'string' && !(value instanceof Date)) {
          return `Field "${field}" expects a date string or Date object, got ${typeof value}`;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return `Field "${field}" expects an array, got ${typeof value}`;
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return `Field "${field}" expects an object, got ${typeof value}`;
        }
        break;

      case 'currency':
        // Currency can be number or object with amount and currency
        if (
          typeof value !== 'number' &&
          (typeof value !== 'object' ||
            !('amount' in (value as Record<string, unknown>)))
        ) {
          return `Field "${field}" expects a number or currency object, got ${typeof value}`;
        }
        break;
    }

    // Check allowed values if specified
    if (attr.allowed_values && attr.allowed_values.length > 0) {
      if (!(attr.allowed_values as unknown[]).includes(value)) {
        return `Field "${field}" must be one of: ${attr.allowed_values.join(
          ', '
        )}`;
      }
    }

    return null;
  }

  /**
   * Clear attribute cache
   */
  static clearCache(): void {
    attributeCache.clear();
  }

  /**
   * Wrap create/update operations with pre-validation
   */
  static async withPreValidation<T>(
    resourceType: UniversalResourceType,
    recordData: Record<string, unknown>,
    operation: () => Promise<T>
  ): Promise<T> {
    // Validate record data
    const validation = await this.validateRecordData(resourceType, recordData);

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('Schema validation warnings:', validation.warnings);
    }

    // Apply suggestions automatically
    if (validation.suggestions.size > 0) {
      const correctedData = { ...recordData };
      for (const [wrong, correct] of Array.from(validation.suggestions)) {
        if (wrong in correctedData) {
          correctedData[correct] = correctedData[wrong];
          delete correctedData[wrong];
        }
      }

      // Update the original record data reference
      Object.keys(recordData).forEach((key) => delete recordData[key]);
      Object.assign(recordData, correctedData);
    }

    // Throw error if validation failed
    if (!validation.isValid) {
      throw new UniversalValidationError(
        `Schema validation failed:\n${validation.errors.join('\n')}`,
        ErrorType.USER_ERROR,
        {
          httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
          suggestion:
            'Check the field names and types against the resource schema',
        }
      );
    }

    // Execute the operation
    return await operation();
  }
}
