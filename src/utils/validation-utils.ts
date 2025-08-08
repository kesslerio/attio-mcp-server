/**
 * Enhanced validation utilities for improving error messages and user experience
 * 
 * This module provides comprehensive validation for:
 * - Select field options with helpful suggestions
 * - Read-only field detection
 * - Field name suggestions using similarity algorithms
 * - Structured error responses
 */

import { getAttioClient } from '../api/attio-client.js';

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
 * Cache for resource attributes to avoid repeated API calls
 */
const attributeCache: Map<string, AttributeInfo[]> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps: Map<string, number> = new Map();

/**
 * Get resource attributes with caching
 */
export async function getResourceAttributes(resourceType: string): Promise<AttributeInfo[]> {
  const cacheKey = resourceType;
  const now = Date.now();
  
  // Check if we have cached data that's still valid
  if (attributeCache.has(cacheKey) && 
      cacheTimestamps.has(cacheKey) && 
      (now - cacheTimestamps.get(cacheKey)!) < CACHE_TTL) {
    return attributeCache.get(cacheKey)!;
  }

  try {
    const client = getAttioClient();
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
    const field = attributes.find(attr => attr.api_slug === fieldName);
    
    if (field?.type === 'select' && field.options) {
      const validOptions = field.options.map(opt => opt.title || opt.value);
      
      if (!validOptions.includes(value)) {
        return {
          isValid: false,
          error: `Invalid value '${value}' for field '${fieldName}'. Valid options are: [${validOptions.map(opt => `'${opt}'`).join(', ')}]. Please choose one of the valid values.`
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
    const field = attributes.find(attr => attr.api_slug === fieldName);
    
    if (field?.type === 'multi_select' && field.options) {
      const validOptions = field.options.map(opt => opt.title || opt.value);
      const invalidValues = values.filter(val => !validOptions.includes(val));
      
      if (invalidValues.length > 0) {
        return {
          isValid: false,
          error: `Invalid values [${invalidValues.map(v => `'${v}'`).join(', ')}] for multi-select field '${fieldName}'. Valid options are: [${validOptions.map(opt => `'${opt}'`).join(', ')}]. Please use only valid options.`
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
  updateFields: Record<string, any>
): Promise<ValidationResult> {
  try {
    const attributes = await getResourceAttributes(resourceType);
    const readOnlyFields = attributes
      .filter(attr => attr.read_only === true)
      .map(attr => attr.api_slug);
    
    const attemptedReadOnlyUpdates = Object.keys(updateFields)
      .filter(fieldName => readOnlyFields.includes(fieldName));
    
    if (attemptedReadOnlyUpdates.length > 0) {
      const fieldList = attemptedReadOnlyUpdates.map(field => `'${field}'`).join(', ');
      const plural = attemptedReadOnlyUpdates.length > 1 ? 's' : '';
      
      return {
        isValid: false,
        error: `Cannot update read-only field${plural} ${fieldList}. These fields are automatically managed by the system and cannot be modified. Remove ${plural ? 'these fields' : 'this field'} from your update request.`
      };
    }
    
    return { isValid: true };
  } catch (error) {
    console.error(`Error validating read-only fields:`, error);
    return { isValid: true };
  }
}

/**
 * Calculate Levenshtein distance for field name similarity
 */
function calculateSimilarity(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
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
    const validFieldNames = attributes.map(attr => attr.api_slug);
    
    // Find similar field names (distance <= 3)
    const suggestions = validFieldNames
      .map(validName => ({
        name: validName,
        distance: calculateSimilarity(invalidFieldName.toLowerCase(), validName.toLowerCase())
      }))
      .filter(item => item.distance <= 3)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)  // Top 3 suggestions
      .map(item => item.name);
    
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
    const validFields = attributes.map(attr => attr.api_slug);
    
    for (const fieldName of fieldNames) {
      if (!validFields.includes(fieldName)) {
        const suggestions = await suggestFieldName(resourceType, fieldName);
        
        let errorMessage = `Unknown field '${fieldName}' for resource type '${resourceType}'.`;
        
        if (suggestions.length > 0) {
          errorMessage += ` Did you mean: ${suggestions.map(s => `'${s}'`).join(', ')}?`;
        }
        
        errorMessage += ` Use get-attributes to see all available fields for this resource type.`;
        
        return {
          isValid: false,
          error: errorMessage
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
  fields: Record<string, any>,
  isUpdate: boolean = false
): Promise<ValidationResult> {
  const fieldNames = Object.keys(fields);
  
  // 1. Check if fields exist
  const existenceValidation = await validateFieldExistence(resourceType, fieldNames);
  if (!existenceValidation.isValid) {
    return existenceValidation;
  }
  
  // 2. Check for read-only fields (only for updates)
  if (isUpdate) {
    const readOnlyValidation = await validateReadOnlyFields(resourceType, fields);
    if (!readOnlyValidation.isValid) {
      return readOnlyValidation;
    }
  }
  
  // 3. Validate select fields
  for (const [fieldName, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      const selectValidation = await validateSelectField(resourceType, fieldName, value);
      if (!selectValidation.isValid) {
        return selectValidation;
      }
    } else if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
      const multiSelectValidation = await validateMultiSelectField(resourceType, fieldName, value);
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