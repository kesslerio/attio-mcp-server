/**
 * Attribute type detection and management for Attio attributes
 */
import { getLazyAttioClient } from '../api/lazy-client.js';
import { parsePersonalName } from '../utils/personal-name-parser.js';
import { debug, error } from '../utils/logger.js';
import { TTLCache } from '../utils/ttl-cache.js';

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
  // Support for legacy/variant field names used in tests and mocks
  allow_multiple_values?: boolean;
}

/**
 * Workspace-level cache for attribute metadata with TTL
 * Reduces API calls while preventing stale data (15-minute expiration)
 * Per PR #905 performance optimization
 */
const attributeCache = new TTLCache<
  string,
  Map<string, AttioAttributeMetadata>
>(
  15 * 60 * 1000, // 15 minutes TTL
  5 * 60 * 1000 // 5 minutes cleanup interval
);

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
    return attributeCache.get(objectSlug)!;
  }

  try {
    // Tasks use a different API structure and don't have attributes endpoint
    if (objectSlug === 'tasks') {
      // Tasks have predefined fields, not dynamic attributes
      const taskMetadata = createTaskAttributeMetadata();
      attributeCache.set(objectSlug, taskMetadata);
      return taskMetadata;
    }

    const api = getLazyAttioClient();
    const response = await api.get(`/objects/${objectSlug}/attributes`);
    // Handle multiple API response structures for attributes
    const rawAttributes = response?.data?.data || response?.data || [];

    // Ensure attributes is always an array - handle multiple shape variants
    const attributes: AttioAttributeMetadata[] = Array.isArray(rawAttributes)
      ? rawAttributes
      : Array.isArray(rawAttributes?.attributes)
        ? rawAttributes.attributes
        : Array.isArray(rawAttributes?.items)
          ? rawAttributes.items
          : Array.isArray(rawAttributes?.data)
            ? rawAttributes.data
            : [];

    // Build metadata map with normalization to support variant fields used in tests/mocks
    const metadataMap = new Map<string, AttioAttributeMetadata>();
    attributes.forEach((attr) => {
      if (!attr?.api_slug) return;

      // Normalize legacy/variant flags commonly seen in mocks
      const allowMultiple = (attr as { allow_multiple_values?: boolean })
        .allow_multiple_values;

      const normalized: AttioAttributeMetadata = {
        ...attr,
        // Ensure is_multiselect is populated even if mocks use allow_multiple_values
        is_multiselect:
          typeof attr.is_multiselect === 'boolean'
            ? attr.is_multiselect
            : typeof allowMultiple === 'boolean'
              ? allowMultiple
              : false,
      };

      metadataMap.set(attr.api_slug, normalized);
    });

    // Cache the result
    attributeCache.set(objectSlug, metadataMap);

    return metadataMap;
  } catch (err: unknown) {
    error('attribute-types', `Failed to fetch attributes`, err, { objectSlug });
    if (err instanceof Error) {
      error('attribute-types', 'Error details', err);
    }
    // Return empty map on error
    return new Map();
  }
}

/**
 * Creates predefined metadata for task attributes
 * Tasks don't use the dynamic attributes API like other objects
 */
function createTaskAttributeMetadata(): Map<string, AttioAttributeMetadata> {
  const taskFields = new Map<string, AttioAttributeMetadata>();

  // Standard task fields based on Attio Tasks API
  const createTaskField = (
    slug: string,
    type: string,
    title: string,
    required = false
  ): AttioAttributeMetadata => ({
    id: {
      workspace_id: 'tasks',
      object_id: 'tasks',
      attribute_id: slug,
    },
    api_slug: slug,
    type,
    title,
    is_required: required,
    is_multiselect: false,
  });

  // Issue #417: Correct task fields based on actual API structure
  // Tasks use 'content' as the main required field, not 'title'
  taskFields.set(
    'content',
    createTaskField('content', 'text', 'Content', true)
  );
  taskFields.set(
    'description',
    createTaskField('description', 'text', 'Description')
  );
  taskFields.set('status', createTaskField('status', 'text', 'Status')); // Status is text not select
  taskFields.set('priority', createTaskField('priority', 'select', 'Priority'));
  taskFields.set('due_date', createTaskField('due_date', 'date', 'Due Date'));
  taskFields.set(
    'assignee_id',
    createTaskField('assignee_id', 'workspace-member', 'Assignee')
  );
  taskFields.set(
    'record_id',
    createTaskField('record_id', 'text', 'Record ID')
  );
  // Add field mappings for common variations that map to content
  taskFields.set('title', createTaskField('title', 'text', 'Title')); // Maps to content in handler
  taskFields.set('name', createTaskField('name', 'text', 'Name')); // Maps to content in handler

  return taskFields;
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

    case 'personal-name':
      // Personal name is always an object with first_name, last_name, etc.
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

  debug(
    'attribute-types',
    `[getAttributeTypeInfo] Looking up ${objectSlug}.${attributeSlug}`,
    {
      metadataSize: metadata.size,
      metadataKeys: Array.from(metadata.keys()),
      attrMetadata: attrMetadata
        ? {
            type: attrMetadata.type,
            isMultiselect: attrMetadata.is_multiselect,
          }
        : null,
    }
  );

  if (!attrMetadata) {
    debug(
      'attribute-types',
      `[getAttributeTypeInfo] No metadata found for ${objectSlug}.${attributeSlug}, returning default`
    );
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
    isArray: attrMetadata.is_multiselect || false,
    isRequired: attrMetadata.is_required || false,
    isUnique: attrMetadata.is_unique || false,
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
  for (const [slug, attr] of Array.from(metadata.entries())) {
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
    // Validation patterns lookup map for better maintainability
    const validationPatterns: Record<string, string> = {
      email: '^[^@]+@[^@]+\\.[^@]+$',
      url: '^https?://',
      phone_number: '^\\+?[0-9-()\\s]+$',
    };

    const pattern = validationPatterns[typeInfo.attioType];
    if (pattern) {
      rules.pattern = pattern;
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
      } else {
        // Single select: direct string
        return value;
      }

    case 'text':
      // Text fields for people object don't need wrapping for certain slugs
      // Note: 'name' is actually a personal-name field, not text, so removed from here
      if (
        objectSlug === 'people' &&
        (attributeSlug === 'job_title' ||
          attributeSlug === 'title' ||
          attributeSlug === 'first_name' ||
          attributeSlug === 'last_name')
      ) {
        debug(
          'attribute-types',
          `[formatAttributeValue] Text field (people) direct:`,
          {
            input: value,
            output: value,
            objectSlug,
            attributeSlug,
          }
        );
        return value;
      }
      // Other text fields need wrapped values if not array, or array of wrapped if array
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        const result = arrayValue.map((v) => ({ value: v }));
        debug(
          'attribute-types',
          `[formatAttributeValue] Text field array wrapped:`,
          {
            input: value,
            output: result,
            objectSlug,
            attributeSlug,
          }
        );
        return result;
      } else {
        const result = { value };
        debug('attribute-types', `[formatAttributeValue] Text field wrapped:`, {
          input: value,
          output: result,
          objectSlug,
          attributeSlug,
        });
        return result;
      }

    case 'personal-name': {
      // Personal name fields need special handling
      // Use the dedicated parser utility
      const parsedName = parsePersonalName(value);
      debug(
        'attribute-types',
        `[formatAttributeValue] Personal name parsing:`,
        {
          input: value,
          output: parsedName,
          objectSlug,
          attributeSlug,
        }
      );
      return parsedName;
    }

    case 'url':
      // URL fields need wrapped values
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue.map((v) => ({ value: v }));
      } else {
        return { value };
      }

    case 'phone-number':
      // Phone fields are like email - array but no value wrapping
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue;
      } else {
        return value;
      }

    case 'email-address': {
      // Email is an array field but doesn't need value wrapping
      const emails = Array.isArray(value) ? value : [value];
      debug('attribute-types', `[formatAttributeValue] Email formatting:`, {
        input: value,
        output: emails,
        objectSlug,
        attributeSlug,
      });
      return emails;
    }

    case 'domain':
      // Domain fields are like email - array but no value wrapping
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue;
      } else {
        return value;
      }

    case 'number':
    case 'currency':
      // Numeric fields
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue.map((v) => ({ value: v }));
      } else {
        return { value };
      }

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
      } else {
        return { value };
      }

    default:
      // Default: wrap the value for safety
      if (typeInfo.isArray) {
        const arrayValue = Array.isArray(value) ? value : [value];
        return arrayValue.map((v) => ({ value: v }));
      } else {
        return { value };
      }
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
