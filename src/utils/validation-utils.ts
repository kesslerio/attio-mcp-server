/**
 * Enhanced validation utilities for improving error messages and user experience
 *
 * This module provides comprehensive validation for:
 * - Select field options with helpful suggestions
 * - Read-only field detection
 * - Field name suggestions using similarity algorithms
 * - Structured error responses
 */

import * as AttioClientModule from '../api/attio-client.js';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface AttributeInfo {
  api_slug: string;
  type: string;
  title?: string;
  read_only?: boolean;
  options?: Array<{
    title?: string;
    value: string;
  }>;
}

/**
 * Configuration from environment variables
 */
const CONFIG = {
  CACHE_TTL: parseInt(process.env.ATTIO_CACHE_TTL || '300000', 10), // Default: 5 minutes
  SIMILARITY_THRESHOLD: parseInt(
    process.env.ATTIO_SIMILARITY_THRESHOLD || '5',
    10
  ), // Default: 5 (more permissive to catch common typos)
  MAX_SUGGESTIONS: parseInt(process.env.ATTIO_MAX_FIELD_SUGGESTIONS || '3', 10), // Default: 3
};

/**
 * Cache for resource attributes to avoid repeated API calls
 * Enhanced to include workspace/tenant context to prevent collisions
 */
const attributeCache: Map<string, AttributeInfo[]> = new Map();
const cacheTimestamps: Map<string, number> = new Map();

/**
 * Get resource attributes with caching
 * Enhanced cache key includes workspace context to prevent collisions
 */
export async function getResourceAttributes(
  resourceType: string
): Promise<AttributeInfo[]> {
  // Enhanced cache key to include workspace/tenant context
  const workspaceId = process.env.ATTIO_WORKSPACE_ID || 'default';
  const cacheKey = `${workspaceId}:${resourceType}`;
  const now = Date.now();

  // Check if we have cached data that's still valid
  if (
    attributeCache.has(cacheKey) &&
    cacheTimestamps.has(cacheKey) &&
    now - cacheTimestamps.get(cacheKey)! < CONFIG.CACHE_TTL
  ) {
    return attributeCache.get(cacheKey)!;
  }

  try {
    // Resolve client directly from the attio-client module to work with Vitest mocks
    const mod: any = AttioClientModule as any;
    let client: any;
    if (typeof mod.getAttioClient === 'function') {
      client = mod.getAttioClient();
    } else if (
      typeof mod.createAttioClient === 'function' &&
      process.env.ATTIO_API_KEY
    ) {
      client = mod.createAttioClient(process.env.ATTIO_API_KEY);
    } else if (
      typeof mod.buildAttioClient === 'function' &&
      process.env.ATTIO_API_KEY
    ) {
      client = mod.buildAttioClient({ apiKey: process.env.ATTIO_API_KEY });
    } else {
      throw new Error('No available Attio client factory');
    }
    const response = await client.get(`/objects/${resourceType}/attributes`);
    const attributes: AttributeInfo[] = response?.data?.data || [];

    // Cache the results
    attributeCache.set(cacheKey, attributes);
    cacheTimestamps.set(cacheKey, now);

    return attributes;
  } catch (error) {
    console.error(`Failed to fetch attributes for ${resourceType}:`, error);
    // Return empty array if fetch fails, don't break validation
    return [];
  }
}

/**
 * Enhanced select field validation with dynamic option suggestions
 */
export async function validateSelectField(
  resourceType: string,
  fieldName: string,
  value: string
): Promise<ValidationResult> {
  try {
    const attributes = await getResourceAttributes(resourceType);
    const field = attributes.find((attr) => attr.api_slug === fieldName);

    if (field?.type === 'select' && field.options) {
      // Check if the value matches any option's value (not title)
      const validValues = field.options.map((opt) => opt.value);
      const validTitles = field.options.map((opt) => opt.title || opt.value);

      if (!validValues.includes(value)) {
        return {
          isValid: false,
          error: `Invalid value '${value}' for field '${fieldName}'. Valid options are: [${validTitles
            .map((opt) => `'${opt}'`)
            .join(', ')}]. Please choose one of the valid values.`,
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    // Don't fail validation due to attribute fetch errors
    console.error(`Error validating select field ${fieldName}:`, error);
    return { isValid: true };
  }
}

/**
 * Multi-select field validation
 */
export async function validateMultiSelectField(
  resourceType: string,
  fieldName: string,
  values: string[]
): Promise<ValidationResult> {
  try {
    const attributes = await getResourceAttributes(resourceType);
    const field = attributes.find((attr) => attr.api_slug === fieldName);

    if (field?.type === 'multi_select' && field.options) {
      // Check against actual values, not titles
      const validValues = field.options.map((opt) => opt.value);
      const validTitles = field.options.map((opt) => opt.title || opt.value);
      const invalidValues = values.filter((val) => !validValues.includes(val));

      if (invalidValues.length > 0) {
        return {
          isValid: false,
          error: `Invalid values [${invalidValues
            .map((v) => `'${v}'`)
            .join(
              ', '
            )}] for multi-select field '${fieldName}'. Valid options are: [${validTitles
            .map((opt) => `'${opt}'`)
            .join(', ')}]. Please use only valid options.`,
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error(`Error validating multi-select field ${fieldName}:`, error);
    return { isValid: true };
  }
}

/**
 * Read-only field validation
 */
export async function validateReadOnlyFields(
  resourceType: string,
  updateFields: Record<string, unknown>
): Promise<ValidationResult> {
  try {
    const attributes = await getResourceAttributes(resourceType);
    const readOnlyFields = attributes
      .filter((attr) => attr.read_only === true)
      .map((attr) => attr.api_slug);

    const attemptedReadOnlyUpdates = Object.keys(updateFields).filter(
      (fieldName) => readOnlyFields.includes(fieldName)
    );

    if (attemptedReadOnlyUpdates.length > 0) {
      const fieldList = attemptedReadOnlyUpdates
        .map((field) => `'${field}'`)
        .join(', ');
      const plural = attemptedReadOnlyUpdates.length > 1 ? 's' : '';

      return {
        isValid: false,
        error: `Cannot update read-only field${plural} ${fieldList}. These fields are automatically managed by the system and cannot be modified. Remove ${
          plural ? 'these fields' : 'this field'
        } from your update request.`,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error(`Error validating read-only fields:`, error);
    return { isValid: true };
  }
}

/**
 * Optimized Levenshtein distance calculation using two-row optimization
 * Reduces space complexity from O(n*m) to O(min(n,m))
 */
function calculateSimilarity(a: string, b: string): number {
  // Early exit for empty strings
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure 'a' is the shorter string for space optimization
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  // Use two rows instead of full matrix
  let prevRow = Array(a.length + 1)
    .fill(0)
    .map((_, i) => i);
  let currRow = Array(a.length + 1).fill(0);

  for (let j = 1; j <= b.length; j++) {
    currRow[0] = j;

    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[i] = Math.min(
        currRow[i - 1] + 1, // deletion
        prevRow[i] + 1, // insertion
        prevRow[i - 1] + cost // substitution
      );
    }

    // Swap rows
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[a.length];
}

/**
 * Smart field name suggestions using similarity algorithms
 */
export async function suggestFieldName(
  resourceType: string,
  invalidFieldName: string
): Promise<string[]> {
  try {
    const attributes = await getResourceAttributes(resourceType);
    const validFieldNames = attributes.map((attr) => attr.api_slug);

    // Exact match shortcut
    if (validFieldNames.includes(invalidFieldName)) {
      return [invalidFieldName];
    }

    // Find similar field names using configurable threshold
    const suggestions = validFieldNames
      .map((validName) => ({
        name: validName,
        distance: calculateSimilarity(
          invalidFieldName.toLowerCase(),
          validName.toLowerCase()
        ),
      }))
      .filter((item) => item.distance <= CONFIG.SIMILARITY_THRESHOLD)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, CONFIG.MAX_SUGGESTIONS) // Configurable suggestion limit
      .map((item) => item.name);

    return suggestions;
  } catch (error) {
    console.error(`Error suggesting field names for ${resourceType}:`, error);
    return [];
  }
}

/**
 * Field existence validation with suggestions
 */
export async function validateFieldExistence(
  resourceType: string,
  fieldNames: string[]
): Promise<ValidationResult> {
  try {
    const attributes = await getResourceAttributes(resourceType);
    const validFields = attributes.map((attr) => attr.api_slug);

    for (const fieldName of fieldNames) {
      if (!validFields.includes(fieldName)) {
        const suggestions = await suggestFieldName(resourceType, fieldName);

        let errorMessage = `Unknown field '${fieldName}' for resource type '${resourceType}'.`;

        if (suggestions.length > 0) {
          errorMessage += ` Did you mean: ${suggestions
            .map((s) => `'${s}'`)
            .join(', ')}?`;
        }

        errorMessage += ` Use get-attributes to see all available fields for this resource type.`;

        return {
          isValid: false,
          error: errorMessage,
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error(`Error validating field existence:`, error);
    return { isValid: true };
  }
}

/**
 * Comprehensive field validation for record operations
 */
export async function validateRecordFields(
  resourceType: string,
  fields: Record<string, unknown>,
  isUpdate: boolean = false
): Promise<ValidationResult> {
  const fieldNames = Object.keys(fields);

  // 1. Check if fields exist
  const existenceValidation = await validateFieldExistence(
    resourceType,
    fieldNames
  );
  if (!existenceValidation.isValid) {
    return existenceValidation;
  }

  // 2. Check for read-only fields (only for updates)
  if (isUpdate) {
    const readOnlyValidation = await validateReadOnlyFields(
      resourceType,
      fields
    );
    if (!readOnlyValidation.isValid) {
      return readOnlyValidation;
    }
  }

  // 3. Validate select fields
  for (const [fieldName, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      const selectValidation = await validateSelectField(
        resourceType,
        fieldName,
        value
      );
      if (!selectValidation.isValid) {
        return selectValidation;
      }
    } else if (
      Array.isArray(value) &&
      value.every((v) => typeof v === 'string')
    ) {
      const multiSelectValidation = await validateMultiSelectField(
        resourceType,
        fieldName,
        value
      );
      if (!multiSelectValidation.isValid) {
        return multiSelectValidation;
      }
    }
  }

  return { isValid: true };
}

/**
 * Clear the attribute cache (useful for testing)
 */
export function clearAttributeCache(): void {
  attributeCache.clear();
  cacheTimestamps.clear();
}
