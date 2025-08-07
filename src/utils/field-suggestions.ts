/**
 * Field suggestion utilities for improved error messages
 * Provides fuzzy matching and suggestion capabilities for field names,
 * resource types, and enum values
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching to find similar field names
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize first row and column
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the matrix
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
 * Find the most similar strings from a list of valid options
 * @param input - The incorrect input string
 * @param validOptions - List of valid options to match against
 * @param maxSuggestions - Maximum number of suggestions to return (default: 3)
 * @param threshold - Maximum distance threshold for suggestions (default: 3)
 * @returns Array of similar options sorted by similarity
 */
export function findSimilarOptions(
  input: string,
  validOptions: string[],
  maxSuggestions: number = 3,
  threshold: number = 3
): string[] {
  if (!input || !validOptions.length) {
    return [];
  }

  const normalizedInput = input.toLowerCase().trim();

  // Calculate distances for all options
  const distances = validOptions.map(option => ({
    option,
    distance: levenshteinDistance(normalizedInput, option.toLowerCase())
  }));

  // Filter by threshold and sort by distance
  const suggestions = distances
    .filter(d => d.distance <= threshold)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map(d => d.option);

  // If no suggestions found with Levenshtein, try substring matching
  if (suggestions.length === 0) {
    const substringMatches = validOptions.filter(option =>
      option.toLowerCase().includes(normalizedInput) ||
      normalizedInput.includes(option.toLowerCase())
    );
    return substringMatches.slice(0, maxSuggestions);
  }

  return suggestions;
}

/**
 * Generate a helpful error message with field suggestions
 * @param fieldName - The incorrect field name provided
 * @param validFields - List of valid field names
 * @param context - Additional context (e.g., resource type)
 * @returns Enhanced error message with suggestions
 */
export function generateFieldSuggestionMessage(
  fieldName: string,
  validFields: string[],
  context?: string
): string {
  const suggestions = findSimilarOptions(fieldName, validFields);
  
  let message = `Invalid field name: "${fieldName}"`;
  
  if (context) {
    message += ` for ${context}`;
  }
  
  if (suggestions.length > 0) {
    message += `. Did you mean: ${suggestions.map(s => `"${s}"`).join(', ')}?`;
  } else if (validFields.length > 0) {
    // Show first few valid fields if no close matches found
    const preview = validFields.slice(0, 5);
    message += `. Valid fields include: ${preview.map(f => `"${f}"`).join(', ')}`;
    if (validFields.length > 5) {
      message += ` (and ${validFields.length - 5} more)`;
    }
  }
  
  return message;
}

/**
 * Generate error message for invalid enum/select values
 * @param value - The invalid value provided
 * @param validValues - List of valid enum values
 * @param fieldName - Name of the field
 * @returns Enhanced error message with valid options
 */
export function generateEnumSuggestionMessage(
  value: any,
  validValues: string[],
  fieldName: string
): string {
  const valueStr = String(value);
  const suggestions = findSimilarOptions(valueStr, validValues, 2, 2);
  
  let message = `Invalid value "${valueStr}" for field "${fieldName}"`;
  
  if (suggestions.length > 0) {
    message += `. Did you mean: ${suggestions.map(s => `"${s}"`).join(' or ')}?`;
  }
  
  // Always show all valid options for enums (usually limited set)
  if (validValues.length <= 10) {
    message += ` Valid options are: ${validValues.map(v => `"${v}"`).join(', ')}.`;
  } else {
    // For large sets, show a subset
    const preview = validValues.slice(0, 5);
    message += ` Valid options include: ${preview.map(v => `"${v}"`).join(', ')} (and ${validValues.length - 5} more).`;
  }
  
  return message;
}

/**
 * Generate error message for read-only field attempts
 * @param fieldName - Name of the read-only field
 * @param operation - The attempted operation (create, update)
 * @returns Clear error message about read-only status
 */
export function generateReadOnlyFieldMessage(
  fieldName: string,
  operation: 'create' | 'update' = 'update'
): string {
  return `Field "${fieldName}" is read-only and cannot be ${operation === 'create' ? 'set during creation' : 'modified'}. This field is automatically managed by the system.`;
}

/**
 * Generate error message for invalid resource types
 * @param resourceType - The invalid resource type provided
 * @param validTypes - List of valid resource types
 * @returns Enhanced error message with valid types
 */
export function generateResourceTypeSuggestionMessage(
  resourceType: string,
  validTypes: string[]
): string {
  const suggestions = findSimilarOptions(resourceType, validTypes, 3, 5); // Increase threshold for resource types
  
  let message = `Invalid resource type: "${resourceType}"`;
  
  if (suggestions.length > 0) {
    message += `. Did you mean: ${suggestions.map(s => `"${s}"`).join(', ')}?`;
  }
  
  message += ` Valid resource types are: ${validTypes.map(t => `"${t}"`).join(', ')}.`;
  
  return message;
}

/**
 * Known Attio resource types for validation
 */
export const VALID_RESOURCE_TYPES = [
  'people',
  'companies',
  'deals',
  'workspaces',
  'users',
  'lists',
  'objects',
  'records',
  'tasks',
  'notes',
  'comments',
  'threads',
  'entries',
  'attributes',
  'webhooks'
];

/**
 * Common field name mappings for better suggestions
 * Maps common incorrect names to correct Attio field names
 */
export const FIELD_NAME_MAPPINGS: Record<string, string> = {
  // Common person field mappings
  'firstname': 'first_name',
  'first_name': 'first_name', // Support hyphen/space variations
  'lastname': 'last_name', 
  'last_name': 'last_name', // Support hyphen/space variations
  'fullname': 'name',
  'phone': 'phone_numbers',
  'email': 'email_addresses',
  'company': 'primary_company',
  'title': 'job_title',
  'position': 'job_title',
  
  // Common company field mappings
  'company_name': 'name',
  'website': 'domain',
  'employees': 'employee_count',
  'size': 'company_size',
  
  // Common timestamp mappings
  'created': 'created_at',
  'updated': 'updated_at',
  'modified': 'updated_at',
  'date_created': 'created_at',
  'date_updated': 'updated_at',
  
  // Common ID mappings
  'person_id': 'id',
  'company_id': 'id',
  'record_id': 'id',
  'object_id': 'id'
};

/**
 * Check if a field name might be a common mistake and suggest correction
 * @param fieldName - The field name to check
 * @returns The suggested correct field name or null
 */
export function getMappedFieldName(fieldName: string): string | null {
  const normalized = fieldName.toLowerCase().replace(/[- ]/g, '_');
  return FIELD_NAME_MAPPINGS[normalized] || null;
}

/**
 * Enhanced field validation with helpful suggestions
 * @param fieldName - Field name to validate
 * @param validFields - List of valid field names
 * @param readOnlyFields - List of read-only field names
 * @param operation - The operation being performed
 * @returns Validation result with error message if invalid
 */
export function validateFieldWithSuggestions(
  fieldName: string,
  validFields: string[],
  readOnlyFields: string[] = [],
  operation: 'create' | 'update' = 'update'
): { valid: boolean; error?: string } {
  // Check if field exists
  if (!validFields.includes(fieldName)) {
    // Check for common mapping
    const mappedName = getMappedFieldName(fieldName);
    if (mappedName && validFields.includes(mappedName)) {
      return {
        valid: false,
        error: `Invalid field name: "${fieldName}". Did you mean "${mappedName}"?`
      };
    }
    
    // Generate suggestion message
    return {
      valid: false,
      error: generateFieldSuggestionMessage(fieldName, validFields)
    };
  }
  
  // Check if field is read-only
  if (readOnlyFields.includes(fieldName)) {
    return {
      valid: false,
      error: generateReadOnlyFieldMessage(fieldName, operation)
    };
  }
  
  return { valid: true };
}