/**
 * Field Mapping Helper for Universal Tools
 * 
 * Maps common incorrect field names to correct ones and provides
 * "did you mean?" suggestions for better user experience.
 * 
 * Addresses Issue #388: Enhanced field validation and error messages
 */

import { UniversalResourceType } from './types.js';
import { getAttioClient } from '../../../api/attio-client.js';

/**
 * Field mapping configuration for each resource type
 */
interface FieldMapping {
  /** Maps incorrect field names to correct ones (null means invalid field) */
  fieldMappings: Record<string, string | null>;
  /** List of valid fields for this resource type */
  validFields: string[];
  /** Common mistakes and their explanations */
  commonMistakes: Record<string, string>;
  /** Required fields for creation */
  requiredFields?: string[];
  /** Fields that must be unique */
  uniqueFields?: string[];
}

/**
 * Resource type mappings - maps invalid resource types to valid ones
 */
const RESOURCE_TYPE_MAPPINGS: Record<string, UniversalResourceType> = {
  'record': UniversalResourceType.RECORDS,
  'records': UniversalResourceType.RECORDS,
  'company': UniversalResourceType.COMPANIES,
  'companies': UniversalResourceType.COMPANIES,
  'person': UniversalResourceType.PEOPLE,
  'people': UniversalResourceType.PEOPLE,
  'deal': UniversalResourceType.DEALS,
  'deals': UniversalResourceType.DEALS,
  'task': UniversalResourceType.TASKS,
  'tasks': UniversalResourceType.TASKS,
  // Common typos and variations
  'comapny': UniversalResourceType.COMPANIES,
  'compnay': UniversalResourceType.COMPANIES,
  'poeple': UniversalResourceType.PEOPLE,
  'peolpe': UniversalResourceType.PEOPLE,
  'dela': UniversalResourceType.DEALS,
  'dael': UniversalResourceType.DEALS,
  'taks': UniversalResourceType.TASKS,
  'tsak': UniversalResourceType.TASKS,
};

/**
 * Field mappings for each resource type
 */
export const FIELD_MAPPINGS: Record<UniversalResourceType, FieldMapping> = {
  [UniversalResourceType.COMPANIES]: {
    fieldMappings: {
      // Common incorrect field names -> correct ones
      'domain': 'domains',
      'website': 'domains',
      'url': 'domains',
      'company_name': 'name',
      'company_domain': 'domains',
      'primary_domain': 'domains',
      'description': 'note',
      'notes': 'note',
      'employee_count': 'estimated_arr',
      'size': 'estimated_arr',
      'revenue': 'estimated_arr',
      'typpe': 'type',  // Common typo
      'company_type': 'type',
      'founded_date': 'founded',
      'founding_date': 'founded',
      'year_founded': 'founded',
    },
    validFields: [
      'name', 'domains', 'type', 'industry', 'description', 
      'founded', 'estimated_arr', 'location', 'note',
      'primary_domain', 'twitter', 'linkedin', 'facebook'
    ],
    commonMistakes: {
      'domain': 'Use "domains" (plural) as an array, e.g., domains: ["example.com"]',
      'website': 'Use "domains" field with an array of domain names',
      'description': 'Use "note" field for company descriptions',
      'employee_count': 'Employee count is not a standard field, consider using custom fields',
      'revenue': 'Use "estimated_arr" for revenue/ARR data',
    },
    requiredFields: ['name'],
    uniqueFields: ['domains']
  },

  [UniversalResourceType.PEOPLE]: {
    fieldMappings: {
      // Name variations
      'full_name': 'name',
      'person_name': 'name',
      'contact_name': 'name',
      'first_name': 'name',  // Will need special handling
      'last_name': 'name',   // Will need special handling
      // Email variations
      'email': 'email_addresses',
      'emails': 'email_addresses',
      'email_address': 'email_addresses',
      'primary_email': 'email_addresses',
      // Phone variations
      'phone': 'phone_numbers',
      'phones': 'phone_numbers',
      'phone_number': 'phone_numbers',
      'mobile': 'phone_numbers',
      'cell': 'phone_numbers',
      // Title variations
      'job_title': 'title',
      'position': 'title',
      'role': 'title',
      // Company variations
      'company': 'company_id',
      'organization': 'company_id',
      'employer': 'company_id',
      // Other fields
      'description': 'note',
      'notes': 'note',
      'bio': 'note',
    },
    validFields: [
      'name', 'email_addresses', 'phone_numbers', 'title',
      'company_id', 'location', 'twitter', 'linkedin', 
      'facebook', 'note', 'first_name', 'last_name'
    ],
    commonMistakes: {
      'email': 'Use "email_addresses" (plural) as an array',
      'phone': 'Use "phone_numbers" (plural) as an array',
      'first_name': 'Use "name" field with full name, or pass first_name/last_name in a name object',
      'company': 'Use "company_id" with the actual company record ID',
    },
    requiredFields: ['name'],
    uniqueFields: ['email_addresses']
  },

  [UniversalResourceType.DEALS]: {
    fieldMappings: {
      // Value variations
      'amount': 'value',
      'deal_value': 'value',
      'deal_amount': 'value',
      'price': 'value',
      'revenue': 'value',
      // Name variations
      'title': 'name',
      'deal_name': 'name',
      'deal_title': 'name',
      'opportunity_name': 'name',
      // Stage variations
      'status': 'stage',
      'deal_stage': 'stage',
      'pipeline_stage': 'stage',
      'deal_status': 'stage',
      // Company variations
      'company': 'associated_company',
      'company_id': 'associated_company',
      'account': 'associated_company',
      'customer': 'associated_company',
      // People variations  
      'contact': 'associated_people',
      'contacts': 'associated_people',
      'primary_contact': 'associated_people',
      'people': 'associated_people',
      // Invalid fields that users often try
      'description': null,  // Not available for deals
      'notes': null,        // Should be created separately
      'close_date': null,   // Not a built-in field
      'expected_close_date': null,
      'probability': null,
      'source': null,
      'lead_source': null,
      'currency': null,     // Handled automatically
      'tags': null,
      'labels': null,
      'type': null,
      'deal_type': null,
    },
    validFields: [
      'name', 'stage', 'value', 'owner', 
      'associated_company', 'associated_people'
    ],
    commonMistakes: {
      'company_id': 'Use "associated_company" to link deals to companies',
      'company': 'Use "associated_company" with the company record ID',
      'amount': 'Use "value" for deal amounts (numeric only, no currency symbols)',
      'status': 'Use "stage" for deal pipeline stages',
      'description': 'Deals do not have a description field. Create notes separately after the deal',
      'close_date': 'Close date is not a built-in field. Use custom fields if needed',
      'probability': 'Probability is not a built-in field. Track in stage names or custom fields',
      'currency': 'Currency is set automatically based on workspace settings',
      'contact': 'Use "associated_people" to link contacts to deals',
    },
    requiredFields: ['name', 'stage'],
    uniqueFields: []
  },

  [UniversalResourceType.TASKS]: {
    fieldMappings: {
      // Content variations
      'title': 'content',
      'name': 'content',
      'task_name': 'content',
      'task_title': 'content',
      'description': 'content',
      'task_description': 'content',
      'task': 'content',
      'text': 'content',
      'body': 'content',
      // Status variations (Note: tasks don't have traditional status)
      'status': 'is_completed',
      'state': 'is_completed',
      'completed': 'is_completed',
      'done': 'is_completed',
      'complete': 'is_completed',
      // Due date variations
      'due': 'due_date',
      'deadline': 'due_date',
      'due_by': 'due_date',
      'due_on': 'due_date',
      // Assignee variations
      'assignee': 'assignee_id',
      'assigned_to': 'assignee_id',
      'owner': 'assignee_id',
      'user': 'assignee_id',
      // Record association
      'record': 'record_id',
      'linked_record': 'record_id',
      'parent': 'record_id',
      'related_to': 'record_id',
    },
    validFields: [
      'content', 'is_completed', 'due_date', 
      'assignee_id', 'record_id', 'created_at', 'updated_at'
    ],
    commonMistakes: {
      'title': 'Use "content" for task text/description',
      'name': 'Use "content" for task text/description',
      'description': 'Use "content" for task text/description',
      'status': 'Tasks use "is_completed" (boolean) instead of status',
      'assignee': 'Use "assignee_id" with the user\'s ID',
    },
    requiredFields: ['content'],
    uniqueFields: []
  },

  [UniversalResourceType.RECORDS]: {
    fieldMappings: {
      // Generic record mappings
      'title': 'name',
      'record_name': 'name',
      'description': 'note',
      'notes': 'note',
    },
    validFields: [
      'name', 'note', 'created_at', 'updated_at'
      // Note: Records can have dynamic fields based on the object type
    ],
    commonMistakes: {
      'title': 'Use "name" for record titles',
      'description': 'Use "note" for descriptions or additional text',
    },
    requiredFields: [],
    uniqueFields: []
  }
};

/**
 * Maps an incorrect field name to the correct one for a resource type
 */
export function mapFieldName(
  resourceType: UniversalResourceType,
  fieldName: string
): string {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping) {
    return fieldName;
  }

  // Check if there's a direct mapping
  const mappedField = mapping.fieldMappings[fieldName.toLowerCase()];
  
  // If mapped to null, it means the field doesn't exist
  if (mappedField === null) {
    return fieldName; // Return original, will trigger proper error
  }
  
  return mappedField || fieldName;
}

/**
 * Detects field name collisions where multiple input fields map to the same output field
 */
export function detectFieldCollisions(
  resourceType: UniversalResourceType,
  recordData: Record<string, any>
): { hasCollisions: boolean; errors: string[]; collisions: Record<string, string[]> } {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping) {
    return { hasCollisions: false, errors: [], collisions: {} };
  }

  // Map each target field to all input fields that map to it
  const targetToInputs: Record<string, string[]> = {};
  const errors: string[] = [];

  for (const [inputField, value] of Object.entries(recordData)) {
    // Skip null-mapped fields
    if (mapping.fieldMappings[inputField.toLowerCase()] === null) {
      continue;
    }

    const targetField = mapFieldName(resourceType, inputField);
    
    if (!targetToInputs[targetField]) {
      targetToInputs[targetField] = [];
    }
    targetToInputs[targetField].push(inputField);
  }

  // Find collisions (multiple inputs mapping to same target)
  const collisions: Record<string, string[]> = {};
  let hasCollisions = false;

  for (const [targetField, inputFields] of Object.entries(targetToInputs)) {
    if (inputFields.length > 1) {
      // Special case: first_name + last_name → name is allowed
      if (resourceType === UniversalResourceType.PEOPLE && 
          targetField === 'name' && 
          inputFields.every(f => ['first_name', 'last_name'].includes(f))) {
        continue; // This collision is handled specially
      }

      collisions[targetField] = inputFields;
      hasCollisions = true;

      const inputFieldsList = inputFields.map(f => `"${f}"`).join(', ');
      const suggestion = getFieldCollisionSuggestion(resourceType, targetField, inputFields);
      
      errors.push(
        `Field collision detected: ${inputFieldsList} all map to "${targetField}". ` +
        `Please use only one field. ${suggestion}`
      );
    }
  }

  return { hasCollisions, errors, collisions };
}

/**
 * Gets suggestions for resolving field collisions
 */
function getFieldCollisionSuggestion(
  resourceType: UniversalResourceType,
  targetField: string,
  conflictingFields: string[]
): string {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping) return '';

  // Check if any of the conflicting fields is the actual target field
  const preferredField = conflictingFields.find(f => f === targetField);
  if (preferredField) {
    return `Recommended: Use "${preferredField}" instead of the mapped alternatives.`;
  }

  // Find the most "canonical" field name (shortest, most direct)
  const sortedFields = conflictingFields.sort((a, b) => {
    // Prefer fields without underscores/prefixes
    const aScore = (a.includes('_') ? 1 : 0) + (a.includes(resourceType) ? 1 : 0);
    const bScore = (b.includes('_') ? 1 : 0) + (b.includes(resourceType) ? 1 : 0);
    if (aScore !== bScore) return aScore - bScore;
    return a.length - b.length;
  });

  return `Recommended: Use "${sortedFields[0]}" for clarity.`;
}

/**
 * Maps multiple field names in a record data object with collision detection
 */
export function mapRecordFields(
  resourceType: UniversalResourceType,
  recordData: Record<string, any>
): { mapped: Record<string, any>; warnings: string[]; errors?: string[] } {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping) {
    return { mapped: recordData, warnings: [] };
  }

  // First pass: detect field collisions
  const collisionResult = detectFieldCollisions(resourceType, recordData);
  if (collisionResult.hasCollisions) {
    return {
      mapped: {},
      warnings: [],
      errors: collisionResult.errors
    };
  }

  const mapped: Record<string, any> = {};
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(recordData)) {
    const mappedKey = mapFieldName(resourceType, key);
    
    // Skip null-mapped fields
    if (mapping.fieldMappings[key.toLowerCase()] === null) {
      warnings.push(`Field "${key}" is not available for ${resourceType}. ${mapping.commonMistakes[key.toLowerCase()] || ''}`);
      continue;
    }
    
    // Check if this field was mapped
    if (mappedKey !== key) {
      const mistake = mapping.commonMistakes[key.toLowerCase()];
      if (mistake) {
        warnings.push(`Field "${key}" mapped to "${mappedKey}": ${mistake}`);
      } else {
        warnings.push(`Field "${key}" was automatically mapped to "${mappedKey}"`);
      }
    }

    // Special handling for certain fields
    if (resourceType === UniversalResourceType.PEOPLE && 
        (key === 'first_name' || key === 'last_name')) {
      // Combine first and last name into full name
      if (!mapped.name) {
        const firstName = recordData.first_name || '';
        const lastName = recordData.last_name || '';
        mapped.name = `${firstName} ${lastName}`.trim();
        warnings.push(`Combined first_name and last_name into "name" field`);
      }
    } else {
      // Safe to assign since collision detection passed
      mapped[mappedKey] = value;
    }
  }

  return { mapped, warnings };
}

/**
 * Validates a resource type and returns the correct one or suggestions
 */
export function validateResourceType(resourceType: string): {
  valid: boolean;
  corrected?: UniversalResourceType;
  suggestion?: string;
} {
  // Check if it's already valid
  if (Object.values(UniversalResourceType).includes(resourceType as UniversalResourceType)) {
    return { valid: true, corrected: resourceType as UniversalResourceType };
  }

  // Try to map it
  const mapped = RESOURCE_TYPE_MAPPINGS[resourceType.toLowerCase()];
  if (mapped) {
    return {
      valid: false,
      corrected: mapped,
      suggestion: `Did you mean "${mapped}"? The resource type "${resourceType}" was automatically corrected.`
    };
  }

  // Generate suggestions using fuzzy matching
  const validTypes = Object.values(UniversalResourceType);
  const suggestions = findSimilarStrings(resourceType, validTypes);
  
  return {
    valid: false,
    suggestion: `Invalid resource type "${resourceType}". Valid types are: ${validTypes.join(', ')}${
      suggestions.length > 0 ? `. Did you mean: ${suggestions.join(' or ')}?` : ''
    }`
  };
}

/**
 * Gets field suggestions when a field name is not recognized
 */
export function getFieldSuggestions(
  resourceType: UniversalResourceType,
  fieldName: string
): string {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping) {
    return `Unable to provide suggestions for resource type ${resourceType}`;
  }

  // Check if there's a known mistake
  const mistake = mapping.commonMistakes[fieldName.toLowerCase()];
  if (mistake) {
    return mistake;
  }

  // Check if it maps to null (invalid field)
  if (mapping.fieldMappings[fieldName.toLowerCase()] === null) {
    return mapping.commonMistakes[fieldName.toLowerCase()] || 
           `Field "${fieldName}" is not available for ${resourceType}`;
  }

  // Find similar valid fields
  const suggestions = findSimilarStrings(fieldName, mapping.validFields);
  
  if (suggestions.length > 0) {
    return `Unknown field "${fieldName}". Did you mean: ${suggestions.join(' or ')}?`;
  }

  return `Unknown field "${fieldName}". Valid fields for ${resourceType}: ${mapping.validFields.join(', ')}`;
}

/**
 * Validates fields before API call and provides suggestions
 */
export function validateFields(
  resourceType: UniversalResourceType,
  recordData: Record<string, any>
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping) {
    return { 
      valid: true, 
      errors: [], 
      warnings: [`No field validation available for ${resourceType}`],
      suggestions: []
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check required fields
  if (mapping.requiredFields) {
    for (const required of mapping.requiredFields) {
      if (!(required in recordData)) {
        // Check if a mapped version exists
        const hasMappedVersion = Object.keys(recordData).some(key => 
          mapFieldName(resourceType, key) === required
        );
        
        if (!hasMappedVersion) {
          errors.push(`Required field "${required}" is missing`);
        }
      }
    }
  }

  // Check for unknown fields
  for (const field of Object.keys(recordData)) {
    const mappedField = mapFieldName(resourceType, field);
    
    // If field maps to null, it's explicitly invalid
    if (mapping.fieldMappings[field.toLowerCase()] === null) {
      warnings.push(getFieldSuggestions(resourceType, field));
      continue;
    }

    // If field doesn't map and isn't in valid fields, it might be wrong
    if (mappedField === field && !mapping.validFields.includes(field)) {
      // It could be a custom field, so just warn
      const suggestion = getFieldSuggestions(resourceType, field);
      if (suggestion.includes('Did you mean')) {
        suggestions.push(suggestion);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Enhanced uniqueness constraint error message
 */
export async function enhanceUniquenessError(
  resourceType: UniversalResourceType,
  errorMessage: string,
  recordData: Record<string, any>
): Promise<string> {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping || !mapping.uniqueFields) {
    return errorMessage;
  }

  // Try to extract the attribute ID from the error message
  const attributeMatch = errorMessage.match(/attribute with ID "([^"]+)"/);
  if (!attributeMatch) {
    return errorMessage;
  }

  const attributeId = attributeMatch[1];
  
  // Try to map the attribute ID to a human-readable field name
  try {
    const client = getAttioClient();
    const response = await client.get(`/objects/${resourceType}/attributes`);
    const attributes = response.data.data || [];
    
    const attribute = attributes.find((attr: any) => 
      attr.id === attributeId || attr.api_slug === attributeId
    );
    
    if (attribute) {
      const fieldName = attribute.title || attribute.api_slug;
      const fieldValue = recordData[attribute.api_slug] || 
                        recordData[fieldName] || 
                        'unknown value';
      
      return `Uniqueness constraint violation: A ${resourceType} record with ${fieldName} "${fieldValue}" already exists. ` +
             `Please use a different value or update the existing record instead.`;
    }
  } catch (error) {
    // Fall back to original message if we can't enhance it
    console.error('Failed to enhance uniqueness error:', error);
  }

  // Try to guess based on unique fields
  for (const uniqueField of mapping.uniqueFields) {
    if (recordData[uniqueField]) {
      return `Uniqueness constraint violation: A ${resourceType} record with ${uniqueField} "${recordData[uniqueField]}" may already exist. ` +
             `Please use a different value or search for the existing record.`;
    }
  }

  return errorMessage + ` (This typically means a record with the same unique identifier already exists)`;
}

/**
 * Simple string similarity function for suggestions
 */
function findSimilarStrings(input: string, candidates: string[], threshold: number = 0.6): string[] {
  const similarities: Array<{ str: string; score: number }> = [];
  
  for (const candidate of candidates) {
    const score = calculateSimilarity(input.toLowerCase(), candidate.toLowerCase());
    if (score >= threshold) {
      similarities.push({ str: candidate, score });
    }
  }
  
  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.str);
}

/**
 * Calculate Levenshtein distance-based similarity
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
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
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Get a list of valid resource types for error messages
 */
export function getValidResourceTypes(): string {
  return Object.values(UniversalResourceType).join(', ');
}

/**
 * Get valid fields for a resource type
 */
export function getValidFields(resourceType: UniversalResourceType): string[] {
  return FIELD_MAPPINGS[resourceType]?.validFields || [];
}