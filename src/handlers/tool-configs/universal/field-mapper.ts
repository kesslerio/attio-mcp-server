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
  record: UniversalResourceType.RECORDS,
  records: UniversalResourceType.RECORDS,
  company: UniversalResourceType.COMPANIES,
  companies: UniversalResourceType.COMPANIES,
  person: UniversalResourceType.PEOPLE,
  people: UniversalResourceType.PEOPLE,
  deal: UniversalResourceType.DEALS,
  deals: UniversalResourceType.DEALS,
  task: UniversalResourceType.TASKS,
  tasks: UniversalResourceType.TASKS,
  // Common typos and variations
  comapny: UniversalResourceType.COMPANIES,
  compnay: UniversalResourceType.COMPANIES,
  poeple: UniversalResourceType.PEOPLE,
  peolpe: UniversalResourceType.PEOPLE,
  dela: UniversalResourceType.DEALS,
  dael: UniversalResourceType.DEALS,
  taks: UniversalResourceType.TASKS,
  tsak: UniversalResourceType.TASKS,
};

/**
 * Field mappings for each resource type
 */
export const FIELD_MAPPINGS: Record<UniversalResourceType, FieldMapping> = {
  [UniversalResourceType.COMPANIES]: {
    fieldMappings: {
      // Common incorrect field names -> correct ones
      domain: 'domains',
      website: 'domains',
      url: 'domains',
      company_name: 'name',
      company_domain: 'domains',
      primary_domain: 'domains',
      description: 'notes',
      note: 'notes',
      size: 'estimated_arr',
      revenue: 'estimated_arr',
      typpe: 'type', // Common typo
      company_type: 'type',
      founded_date: 'founded',
      founding_date: 'founded',
      year_founded: 'founded',
    },
    validFields: [
      'name',
      'domains',
      'type',
      'industry',
      'categories',
      'description',
      'founded',
      'estimated_arr',
      'employee_count',
      'location',
      'notes',
      'primary_domain',
      'twitter',
      'linkedin',
      'facebook',
    ],
    commonMistakes: {
      domain:
        'Use "domains" (plural) as an array, e.g., domains: ["example.com"]',
      website: 'Use "domains" field with an array of domain names',
      description: 'Use "notes" field for company descriptions',
      revenue: 'Use "estimated_arr" for revenue/ARR data',
    },
    requiredFields: ['name'],
    uniqueFields: ['domains'],
  },

  [UniversalResourceType.PEOPLE]: {
    fieldMappings: {
      // Name variations
      full_name: 'name',
      person_name: 'name',
      contact_name: 'name',
      first_name: 'name', // Will need special handling
      last_name: 'name', // Will need special handling
      // Email variations
      email: 'email_addresses',
      emails: 'email_addresses',
      email_address: 'email_addresses',
      primary_email: 'email_addresses',
      // Phone variations
      phone: 'phone_numbers',
      phones: 'phone_numbers',
      phone_number: 'phone_numbers',
      mobile: 'phone_numbers',
      cell: 'phone_numbers',
      // Title variations
      job_title: 'title',
      position: 'title',
      role: 'title',
      // Company variations
      company: 'company_id',
      organization: 'company_id',
      employer: 'company_id',
      // Other fields
      description: 'notes',
      note: 'notes',
      bio: 'notes',
    },
    validFields: [
      'name',
      'email_addresses',
      'phone_numbers',
      'title',
      'company_id',
      'location',
      'twitter',
      'linkedin',
      'facebook',
      'notes',
      'first_name',
      'last_name',
    ],
    commonMistakes: {
      email: 'Use "email_addresses" (plural) as an array',
      phone: 'Use "phone_numbers" (plural) as an array',
      first_name:
        'Use "name" field with full name, or pass first_name/last_name in a name object',
      company: 'Use "company_id" with the actual company record ID',
    },
    requiredFields: ['name'],
    uniqueFields: ['email_addresses'],
  },

  [UniversalResourceType.LISTS]: {
    fieldMappings: {
      // Name variations
      list_name: 'name',
      title: 'name',
      // Description variations
      description: 'description',
      notes: 'description',
      // Parent variations
      parent: 'parent_object',
      parent_id: 'parent_object',
      object: 'parent_object',
    },
    validFields: [
      'name',
      'description',
      'parent_object',
      'api_slug',
      'workspace_id',
      'workspace_member_access',
    ],
    commonMistakes: {
      title: 'Use "name" field for the list name',
      parent: 'Use "parent_object" to specify the parent object type',
    },
    requiredFields: ['name'],
    uniqueFields: ['api_slug'],
  },

  [UniversalResourceType.DEALS]: {
    fieldMappings: {
      // Value variations
      amount: 'value',
      deal_value: 'value',
      deal_amount: 'value',
      price: 'value',
      revenue: 'value',
      // Name variations
      title: 'name',
      deal_name: 'name',
      deal_title: 'name',
      opportunity_name: 'name',
      // Stage variations
      status: 'stage',
      deal_stage: 'stage',
      pipeline_stage: 'stage',
      deal_status: 'stage',
      // Company variations
      company: 'associated_company',
      company_id: 'associated_company',
      account: 'associated_company',
      customer: 'associated_company',
      // People variations
      contact: 'associated_people',
      contacts: 'associated_people',
      primary_contact: 'associated_people',
      people: 'associated_people',
      // Invalid fields that users often try
      description: null, // Not available for deals
      notes: null, // Should be created separately
      close_date: null, // Not a built-in field
      expected_close_date: null,
      probability: null,
      source: null,
      lead_source: null,
      currency: null, // Handled automatically
      tags: null,
      labels: null,
      type: null,
      deal_type: null,
    },
    validFields: [
      'name',
      'stage',
      'value',
      'owner',
      'associated_company',
      'associated_people',
    ],
    commonMistakes: {
      company_id: 'Use "associated_company" to link deals to companies',
      company: 'Use "associated_company" with the company record ID',
      amount:
        'Use "value" for deal amounts (numeric only, no currency symbols)',
      status: 'Use "stage" for deal pipeline stages',
      description:
        'Deals do not have a description field. Create notes separately after the deal',
      close_date:
        'Close date is not a built-in field. Use custom fields if needed',
      probability:
        'Probability is not a built-in field. Track in stage names or custom fields',
      currency: 'Currency is set automatically based on workspace settings',
      contact: 'Use "associated_people" to link contacts to deals',
    },
    requiredFields: ['name', 'stage'],
    uniqueFields: [],
  },

  [UniversalResourceType.TASKS]: {
    fieldMappings: {
      // Content variations
      title: 'content',
      name: 'content',
      task_name: 'content',
      task_title: 'content',
      description: 'content',
      task_description: 'content',
      task: 'content',
      text: 'content',
      body: 'content',
      // Status variations - Map to is_completed (the correct API field)
      status: 'is_completed', // Transform status string to is_completed boolean
      state: 'is_completed',
      completed: 'is_completed',
      done: 'is_completed',
      complete: 'is_completed',
      task_status: 'is_completed',
      // Due date variations - Map to deadline_at (the correct API field)
      due_date: 'deadline_at', // Common field name to correct API field
      due: 'deadline_at',
      deadline: 'deadline_at',
      due_by: 'deadline_at',
      due_on: 'deadline_at',
      duedate: 'deadline_at', // camelCase variant (lowercase for lookup)
      // Assignee variations - Map to assignees array (the correct API field)
      assignee_id: 'assignees', // Transform single assignee to array
      assignee: 'assignees',
      assigned_to: 'assignees',
      owner: 'assignees',
      user: 'assignees',
      assigneeid: 'assignees', // camelCase variant (lowercase for lookup)
      // Record association - Keep as linked_records (already correct)
      record_id: 'linked_records',
      record: 'linked_records',
      linked_record: 'linked_records',
      parent: 'linked_records',
      related_to: 'linked_records',
      recordid: 'linked_records', // camelCase variant (lowercase for lookup)
    },
    validFields: [
      'content',
      'format',
      'deadline_at',
      'is_completed',
      'assignees',
      'linked_records',
      'priority',
      // Also accept the common field names for backward compatibility
      'due_date',
      'status',
      'assignee_id',
      'record_id',
      'assignee',
    ],
    commonMistakes: {
      title: 'Use "content" for task text/description',
      name: 'Use "content" for task text/description',
      description: 'Use "content" for task text/description',
      assignee: 'Use "assignee_id" or "assignees" with workspace member ID(s)',
      due: 'Use "due_date" or "deadline_at" with ISO date format',
      record: 'Use "record_id" or "linked_records" to link the task to records',
      status: 'Use "status" (pending/completed) or "is_completed" (true/false)',
    },
    requiredFields: ['content'],
    uniqueFields: [],
  },

  [UniversalResourceType.RECORDS]: {
    fieldMappings: {
      // Generic record mappings
      title: 'name',
      record_name: 'name',
      description: 'notes',
      note: 'notes',
    },
    validFields: [
      'name',
      'notes',
      'created_at',
      'updated_at',
      // Note: Records can have dynamic fields based on the object type
    ],
    commonMistakes: {
      title: 'Use "name" for record titles',
      description: 'Use "notes" for descriptions or additional text',
    },
    requiredFields: [],
    uniqueFields: [],
  },
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
): {
  hasCollisions: boolean;
  errors: string[];
  collisions: Record<string, string[]>;
} {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping) {
    return { hasCollisions: false, errors: [], collisions: {} };
  }

  // Map each target field to all input fields that map to it
  const targetToInputs: Record<string, string[]> = {};
  const errors: string[] = [];

  for (const [inputField] of Object.entries(recordData)) {
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
      if (
        resourceType === UniversalResourceType.PEOPLE &&
        targetField === 'name' &&
        inputFields.every((f) => ['first_name', 'last_name'].includes(f))
      ) {
        continue; // This collision is handled specially
      }

      collisions[targetField] = inputFields;
      hasCollisions = true;

      const inputFieldsList = inputFields.map((f) => `"${f}"`).join(', ');
      const suggestion = getFieldCollisionSuggestion(
        resourceType,
        targetField,
        inputFields
      );

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
  const preferredField = conflictingFields.find((f) => f === targetField);
  if (preferredField) {
    return `Recommended: Use "${preferredField}" instead of the mapped alternatives.`;
  }

  // Find the most "canonical" field name (shortest, most direct)
  const sortedFields = conflictingFields.sort((a, b) => {
    // Prefer fields without underscores/prefixes
    const aScore =
      (a.includes('_') ? 1 : 0) + (a.includes(resourceType) ? 1 : 0);
    const bScore =
      (b.includes('_') ? 1 : 0) + (b.includes(resourceType) ? 1 : 0);
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
      errors: collisionResult.errors,
    };
  }

  const mapped: Record<string, any> = {};
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(recordData)) {
    const mappedKey = mapFieldName(resourceType, key);

    // Skip null-mapped fields
    if (mapping.fieldMappings[key.toLowerCase()] === null) {
      warnings.push(
        `Field "${key}" is not available for ${resourceType}. ${mapping.commonMistakes[key.toLowerCase()] || ''}`
      );
      continue;
    }

    // Check if this field was mapped
    if (mappedKey !== key) {
      const mistake = mapping.commonMistakes[key.toLowerCase()];
      if (mistake) {
        warnings.push(`Field "${key}" mapped to "${mappedKey}": ${mistake}`);
      } else {
        warnings.push(
          `Field "${key}" was automatically mapped to "${mappedKey}"`
        );
      }
    }

    // Special handling for certain fields
    if (
      resourceType === UniversalResourceType.PEOPLE &&
      (key === 'first_name' || key === 'last_name')
    ) {
      // Combine first and last name into full name
      if (!mapped.name) {
        const firstName = recordData.first_name || '';
        const lastName = recordData.last_name || '';
        mapped.name = `${firstName} ${lastName}`.trim();
        warnings.push(`Combined first_name and last_name into "name" field`);
      }
    } else {
      // Process categories field with validation and auto-conversion (Issues #220/#218)
      if (
        key.toLowerCase() === 'categories' ||
        mappedKey.toLowerCase() === 'categories'
      ) {
        const categoryResult = processCategories(resourceType, key, value);

        if (categoryResult.errors.length > 0) {
          warnings.push(...categoryResult.errors);
          // Don't assign invalid categories, but continue processing other fields
          continue;
        }

        if (categoryResult.warnings.length > 0) {
          warnings.push(...categoryResult.warnings);
        }

        mapped[mappedKey] = categoryResult.processedValue;
      } else {
        // Safe to assign since collision detection passed
        mapped[mappedKey] = value;
      }
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
  if (
    Object.values(UniversalResourceType).includes(
      resourceType as UniversalResourceType
    )
  ) {
    return { valid: true }; // No corrected field when valid
  }

  // Try to map it
  const mapped = RESOURCE_TYPE_MAPPINGS[resourceType.toLowerCase()];
  if (mapped) {
    return {
      valid: false,
      corrected: mapped,
      suggestion: `Did you mean "${mapped}"? The resource type "${resourceType}" was automatically corrected.`,
    };
  }

  // Generate suggestions using fuzzy matching
  const validTypes = Object.values(UniversalResourceType);
  const suggestions = findSimilarStrings(resourceType, validTypes);

  return {
    valid: false,
    suggestion: `Invalid resource type "${resourceType}". Valid types are: ${validTypes.join(', ')}${
      suggestions.length > 0
        ? `. Did you mean: ${suggestions.join(' or ')}?`
        : ''
    }`,
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
    return (
      mapping.commonMistakes[fieldName.toLowerCase()] ||
      `Field "${fieldName}" is not available for ${resourceType}`
    );
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
      suggestions: [],
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
        const hasMappedVersion = Object.keys(recordData).some(
          (key) => mapFieldName(resourceType, key) === required
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
    suggestions,
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

    const attribute = attributes.find(
      (attr: any) => attr.id === attributeId || attr.api_slug === attributeId
    );

    if (attribute) {
      const fieldName = attribute.title || attribute.api_slug;
      const fieldValue =
        recordData[attribute.api_slug] ||
        recordData[fieldName] ||
        'unknown value';

      return (
        `Uniqueness constraint violation: A ${resourceType} record with ${fieldName} "${fieldValue}" already exists. ` +
        `Please use a different value or update the existing record instead.`
      );
    }
  } catch (error: unknown) {
    // Fall back to original message if we can't enhance it
    console.error('Failed to enhance uniqueness error:', error);
  }

  // Try to guess based on unique fields
  for (const uniqueField of mapping.uniqueFields) {
    if (recordData[uniqueField]) {
      return (
        `Uniqueness constraint violation: A ${resourceType} record with ${uniqueField} "${recordData[uniqueField]}" may already exist. ` +
        `Please use a different value or search for the existing record.`
      );
    }
  }

  return (
    errorMessage +
    ` (This typically means a record with the same unique identifier already exists)`
  );
}

/**
 * Simple string similarity function for suggestions
 */
function findSimilarStrings(
  input: string,
  candidates: string[],
  threshold: number = 0.6
): string[] {
  const similarities: Array<{ str: string; score: number }> = [];

  for (const candidate of candidates) {
    const score = calculateSimilarity(
      input.toLowerCase(),
      candidate.toLowerCase()
    );
    if (score >= threshold) {
      similarities.push({ str: candidate, score });
    }
  }

  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.str);
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
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
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

/**
 * Valid category options for companies (from Issues #220/#218)
 */
const VALID_COMPANY_CATEGORIES = [
  'Health Care',
  'Technology',
  'Software',
  'SaaS',
  'B2B',
  'B2C',
  'E-commerce',
  'Financial Services',
  'Banking',
  'Finance',
  'Insurance',
  'Manufacturing',
  'Retail',
  'Education',
  'Consulting',
  'Real Estate',
  'Media & Entertainment',
  'Transportation',
  'Energy',
  'Food & Beverage',
  'Construction',
  'Telecommunications',
  'Automotive',
  'Aerospace',
  'Pharmaceuticals',
  'Biotechnology',
  'Non-profit',
  'Government',
  'Agriculture',
  'Mining',
  'Utilities',
  'Hospitality',
  'Travel',
  'Sports',
  'Fashion',
  'Beauty',
];

/**
 * Validates category values and provides suggestions (Issues #220/#218)
 */
export function validateCategories(input: string | string[]): {
  isValid: boolean;
  validatedCategories: string[];
  suggestions: string[];
  errors: string[];
  autoConverted: boolean;
} {
  const result = {
    isValid: true,
    validatedCategories: [] as string[],
    suggestions: [] as string[],
    errors: [] as string[],
    autoConverted: false,
  };

  // Handle string-to-array auto-conversion (Issue #218)
  let categories: string[];
  if (typeof input === 'string') {
    categories = [input];
    result.autoConverted = true;
  } else if (Array.isArray(input)) {
    categories = input;
  } else {
    result.isValid = false;
    result.errors.push(
      'Categories must be a string or array of strings. Use ["category"] format for arrays.'
    );
    return result;
  }

  // Validate each category and deduplicate
  const processedCategories = new Set<string>();

  for (const category of categories) {
    if (typeof category !== 'string') {
      result.isValid = false;
      result.errors.push(
        `Invalid category type: ${typeof category}. All categories must be strings.`
      );
      continue;
    }

    // Skip empty categories
    if (!category.trim()) {
      result.isValid = false;
      result.errors.push('Empty category is not allowed.');
      continue;
    }

    // Check if category is valid (case-insensitive)
    const exactMatch = VALID_COMPANY_CATEGORIES.find(
      (valid) => valid.toLowerCase() === category.toLowerCase()
    );

    if (exactMatch) {
      processedCategories.add(exactMatch); // Use canonical casing and deduplicate
    } else {
      // Find similar categories using fuzzy matching (Issue #220)
      // Use lower threshold for shorter words
      const threshold = category.length <= 4 ? 0.3 : 0.5;
      const suggestions = findSimilarStrings(
        category,
        VALID_COMPANY_CATEGORIES,
        threshold
      );

      result.isValid = false;
      result.errors.push(
        `Invalid category "${category}". ${
          suggestions.length > 0
            ? `Did you mean: ${suggestions.slice(0, 3).join(', ')}?`
            : 'Please use a valid category.'
        }`
      );

      if (suggestions.length > 0) {
        result.suggestions.push(...suggestions.slice(0, 5)); // Top 5 suggestions
      }
    }
  }

  // Convert set back to array and remove duplicates from suggestions
  result.validatedCategories = Array.from(processedCategories);
  result.suggestions = [...new Set(result.suggestions)];

  return result;
}

/**
 * Auto-converts and validates categories field for companies (Issues #220/#218)
 */
export function processCategories(
  resourceType: UniversalResourceType,
  fieldName: string,
  value: any
): {
  processedValue: any;
  warnings: string[];
  errors: string[];
} {
  const result = {
    processedValue: value,
    warnings: [] as string[],
    errors: [] as string[],
  };

  // Only process categories for companies
  if (
    resourceType !== UniversalResourceType.COMPANIES ||
    fieldName.toLowerCase() !== 'categories'
  ) {
    return result;
  }

  // Validate categories
  const validation = validateCategories(value);

  if (validation.autoConverted) {
    result.warnings.push(
      `Categories field auto-converted from string to array format: ["${value}"]`
    );
  }

  if (!validation.isValid) {
    result.errors.push(...validation.errors);

    // Always show valid options when there are errors
    result.warnings.push(
      `Valid category options (first 10): ${VALID_COMPANY_CATEGORIES.slice(0, 10).join(', ')}`
    );
  } else {
    result.processedValue = validation.validatedCategories;

    if (validation.autoConverted) {
      result.warnings.push(
        `Category value successfully validated and converted to: ${JSON.stringify(validation.validatedCategories)}`
      );
    }
  }

  return result;
}

/**
 * Get list of valid categories for companies
 */
export function getValidCategories(): string[] {
  return [...VALID_COMPANY_CATEGORIES];
}

/**
 * Task field mapping with operation-specific handling
 * 
 * Prevents content injection on update operations (Issue #480 compatibility)
 */
export function mapTaskFields(operation: 'create' | 'update', input: Record<string, unknown>): Record<string, unknown> {
  const output = { ...input };
  
  // For create operations, synthesize content from title if missing
  if (operation === 'create' && 'title' in output && !('content' in output)) {
    output.content = output.title;
  }
  
  // For update operations, never synthesize content - it's immutable
  // Do NOT delete user-supplied content; let API reject it with proper error
  if (operation === 'update') {
    // Content is immutable - if user supplies it, let Attio API reject with error
    // Do not inject, do not delete
  }
  
  return output;
}
