/**
 * Attribute type detection and management for Attio attributes
 */
import { getAttioClient } from './attio-client.js';

/**
 * Interface for Attio attribute metadata
 */
export interface AttioAttributeMetadata {
  id: {
    workspace_id: string;
    object_id: string;
    attribute_id: string;
  };
  api_slug: string;
  title: string;
  description?: string;
  type: string;
  is_system_attribute?: boolean;
  is_writable?: boolean;
  is_required?: boolean;
  is_unique?: boolean;
  is_multiselect?: boolean;
  is_default_value_enabled?: boolean;
  is_archived?: boolean;
  default_value?: string | number | boolean | null | Record<string, unknown>;
  relationship?: {
    object?: string;
    cardinality?: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  } | null;
  created_at?: string;
  config?: {
    currency?: {
      default_currency_code?: string | null;
      display_type?: string | null;
    };
    record_reference?: {
      allowed_object_ids?: string[] | null;
    };
    select?: {
      options?: Array<{
        id: string;
        title: string;
        value: string;
      }>;
    };
  };
}

/**
 * Cache for attribute metadata to avoid repeated API calls
 */
const attributeCache = new Map<string, Map<string, AttioAttributeMetadata>>();

/**
 * Fetches and caches attribute metadata for a specific object type
 *
 * @param objectSlug - The object type (e.g., 'companies', 'people')
 * @returns Map of attribute slug to metadata
 */
export async function getObjectAttributeMetadata(
  objectSlug: string
): Promise<Map<string, AttioAttributeMetadata>> {
  // Check cache first
  if (attributeCache.has(objectSlug)) {
    const cached = attributeCache.get(objectSlug);
    if (cached) {
      return cached;
    }
  }

  try {
    const api = getAttioClient();
    const response = await api.get(`/objects/${objectSlug}/attributes`);
    const attributes: AttioAttributeMetadata[] = response.data.data || [];

    // Build metadata map
    const metadataMap = new Map<string, AttioAttributeMetadata>();
    for (const attr of attributes) {
      if (attr.api_slug) {
        metadataMap.set(attr.api_slug, attr);
      }
    }

    // Cache the result
    attributeCache.set(objectSlug, metadataMap);

    return metadataMap;
  } catch (error) {
    console.error(`Failed to fetch attributes for ${objectSlug}:`, error);
    // Return empty map on error
    return new Map();
  }
}

/**
 * Detects the field type of a specific attribute
 *
 * @param objectSlug - The object type (e.g., 'companies', 'people')
 * @param attributeSlug - The attribute slug (e.g., 'name', 'products')
 * @returns The detected field type
 */
export async function detectFieldType(
  objectSlug: string,
  attributeSlug: string
): Promise<string> {
  const metadata = await getObjectAttributeMetadata(objectSlug);
  const attrMetadata = metadata.get(attributeSlug);

  if (!attrMetadata) {
    // Default to 'string' if metadata not found
    return 'string';
  }

  // Map Attio types to our internal types
  const isMultiple =
    attrMetadata.is_multiselect ||
    ('allow_multiple_values' in attrMetadata &&
      (
        attrMetadata as AttioAttributeMetadata & {
          allow_multiple_values?: boolean;
        }
      ).allow_multiple_values);

  switch (attrMetadata.type) {
    case 'text':
    case 'email':
    case 'url':
    case 'phone-number':
      return isMultiple ? 'array' : 'string';

    case 'select':
      // For select fields, check if multiselect is enabled
      return isMultiple ? 'array' : 'string';

    case 'record-reference':
      return isMultiple ? 'array' : 'object';

    case 'number':
    case 'currency':
      return isMultiple ? 'array' : 'number';

    case 'checkbox':
    case 'boolean':
      return 'boolean';

    case 'date':
    case 'datetime':
    case 'timestamp':
      return attrMetadata.is_multiselect ? 'array' : 'string';

    case 'actor-reference':
    case 'workspace-member':
      return attrMetadata.is_multiselect ? 'array' : 'string';

    case 'domain':
    case 'location':
      return attrMetadata.is_multiselect ? 'array' : 'object';

    case 'interaction':
      return 'object';

    default:
      // Default to array if multiple values allowed, otherwise string
      return attrMetadata.is_multiselect ? 'array' : 'string';
  }
}

/**
 * Gets detailed type information for an attribute
 *
 * @param objectSlug - The object type
 * @param attributeSlug - The attribute slug
 * @returns Detailed type information
 */
export async function getAttributeTypeInfo(
  objectSlug: string,
  attributeSlug: string
): Promise<{
  fieldType: string;
  isArray: boolean;
  isRequired: boolean;
  isUnique: boolean;
  attioType: string;
  metadata: AttioAttributeMetadata | null;
}> {
  const metadata = await getObjectAttributeMetadata(objectSlug);
  const attrMetadata = metadata.get(attributeSlug);

  if (!attrMetadata) {
    return {
      fieldType: 'string',
      isArray: false,
      isRequired: false,
      isUnique: false,
      attioType: 'unknown',
      metadata: null,
    };
  }

  const fieldType = await detectFieldType(objectSlug, attributeSlug);

  return {
    fieldType,
    isArray: attrMetadata.is_multiselect ?? false,
    isRequired: attrMetadata.is_required ?? false,
    isUnique: attrMetadata.is_unique ?? false,
    attioType: attrMetadata.type,
    metadata: attrMetadata,
  };
}

/**
 * Clears the attribute cache for a specific object type or all types
 *
 * @param objectSlug - Optional object type to clear (clears all if not provided)
 */
export function clearAttributeCache(objectSlug?: string): void {
  if (objectSlug) {
    attributeCache.delete(objectSlug);
  } else {
    attributeCache.clear();
  }
}

/**
 * Looks up the API slug for an attribute by its ID
 *
 * @param objectSlug - The object type
 * @param attributeId - The attribute's unique ID
 * @returns The corresponding slug or null if not found
 */
export async function getAttributeSlugById(
  objectSlug: string,
  attributeId: string
): Promise<string | null> {
  const metadata = await getObjectAttributeMetadata(objectSlug);
  for (const [slug, attr] of metadata.entries()) {
    if (attr.id.attribute_id === attributeId) {
      return slug;
    }
  }
  return null;
}

/**
 * Gets field validation rules based on attribute metadata
 *
 * @param objectSlug - The object type
 * @param attributeSlug - The attribute slug
 * @returns Validation rules for the field
 */
export async function getFieldValidationRules(
  objectSlug: string,
  attributeSlug: string
): Promise<{
  type: string;
  required: boolean;
  unique: boolean;
  allowMultiple: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  enum?: (string | number | boolean)[];
}> {
  const typeInfo = await getAttributeTypeInfo(objectSlug, attributeSlug);

  const rules: Record<string, unknown> = {
    type: typeInfo.fieldType,
    required: typeInfo.isRequired,
    unique: typeInfo.isUnique,
    allowMultiple: typeInfo.isArray,
  };

  // Add specific validation rules based on Attio type
  if (typeInfo.metadata) {
    switch (typeInfo.attioType) {
      case 'email':
        rules.pattern = '^[^@]+@[^@]+\\.[^@]+$';
        break;
      case 'url':
        rules.pattern = '^https?://';
        break;
      case 'phone_number':
        rules.pattern = '^\\+?[0-9-()\\s]+$';
        break;
    }

    // Add enum values for select fields
    const config = typeInfo.metadata.config as
      | {
          options?: Array<{ value: string | number | boolean }>;
          select?: {
            options?: Array<{ value: string | number | boolean }>;
          };
        }
      | undefined;
    if (typeInfo.attioType === 'select') {
      // Handle both direct options and nested select.options
      const options = config?.options || config?.select?.options;
      if (options) {
        rules.enum = options.map(
          (opt: { value: string | number | boolean }) => opt.value
        );
      }
    }
  }

  return rules as {
    type: string;
    required: boolean;
    unique: boolean;
    allowMultiple: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    enum?: (string | number | boolean)[];
  };
}

/**
 * Formats an attribute value according to Attio's expected format
 *
 * @param objectSlug - The object type
 * @param attributeSlug - The attribute slug
 * @param value - The raw value to format
 * @returns The formatted value in Attio's expected structure
 */
export async function formatAttributeValue(
  objectSlug: string,
  attributeSlug: string,
  value:
    | string
    | number
    | boolean
    | null
    | undefined
    | Array<string | number | boolean>
    | Record<string, unknown>
): Promise<unknown> {
  const typeInfo = await getAttributeTypeInfo(objectSlug, attributeSlug);

  // Handle null/undefined values
  if (value === null || value === undefined) {
    // If the attribute is an array type, clearing it means sending an empty array.
    // Otherwise, send null.
    const returnValue = typeInfo.isArray ? [] : null;
    return returnValue;
  }

  // Different field types need different formatting
  switch (typeInfo.attioType) {
    case 'select':
      // Select fields expect direct string values (title or ID)
      if (typeInfo.isArray) {
        // Multiselect: array of strings
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue;
      }
      // Single select: direct string
      return value;

    case 'text':
      // Text fields for people object don't need wrapping for certain slugs
      if (
        objectSlug === 'people' &&
        (attributeSlug === 'name' ||
          attributeSlug === 'job_title' ||
          attributeSlug === 'first_name' ||
          attributeSlug === 'last_name')
      ) {
        return value;
      }
      // Other text fields need wrapped values if not array, or array of wrapped if array
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue.map((v) => ({ value: v }));
      }
      return { value };

    case 'personal-name':
      // Personal name fields don't need value wrapping
      return value;

    case 'url':
      // URL fields need wrapped values
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue.map((v) => ({ value: v }));
      }
      return { value };

    case 'phone-number':
      // Phone fields are like email - array but no value wrapping
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue;
      }
      return value;

    case 'email-address': {
      // Email is an array field but doesn't need value wrapping
      const emails = Array.isArray(value) ? value : [value];
      return emails;
    }

    case 'domain':
      // Domain fields are like email - array but no value wrapping
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue;
      }
      return value;

    case 'number':
    case 'currency':
      // Numeric fields
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue.map((v) => ({ value: v }));
      }
      return { value };

    case 'checkbox':
    case 'boolean':
      // Boolean fields - direct value
      return value;

    case 'date':
    case 'datetime':
    case 'timestamp':
      // Date fields - wrapped values
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue.map((v) => ({ value: v }));
      }
      return { value };

    default:
      // Default: wrap the value for safety
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue.map((v) => ({ value: v }));
      }
      return { value };
  }
}

/**
 * Validates and formats all attributes for an object
 *
 * @param objectSlug - The object type
 * @param attributes - Raw attributes object
 * @returns Formatted attributes ready for Attio API
 */
export async function formatAllAttributes(
  objectSlug: string,
  attributes: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const formatted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      // Handle null values explicitly - format them according to Attio's expected structure
      formatted[key] = await formatAttributeValue(
        objectSlug,
        key,
        value as
          | string
          | number
          | boolean
          | null
          | undefined
          | Array<string | number | boolean>
          | Record<string, unknown>
      );
    }
  }

  return formatted;
}
