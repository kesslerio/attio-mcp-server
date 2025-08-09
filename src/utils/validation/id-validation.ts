/**
 * ID Format Validation Utilities
 * 
 * Provides early validation of record IDs to prevent unnecessary API calls
 * for invalid ID formats, improving performance for 404 responses.
 */

/**
 * Valid ID patterns for different resource types
 */
const ID_PATTERNS = {
  // Standard MongoDB ObjectId pattern (24 hex characters)
  OBJECT_ID: /^[a-f0-9]{24}$/,
  
  // UUID v4 pattern
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Attio-specific patterns (if different from standard ObjectId)
  ATTIO_RECORD: /^[a-f0-9]{24}$/,
  ATTIO_WORKSPACE: /^[a-f0-9]{24}$/,
  
  // Legacy or alternative formats (add as discovered)
  LEGACY: /^[A-Za-z0-9_-]{20,30}$/
};

/**
 * Validation result
 */
export interface IdValidationResult {
  isValid: boolean;
  format?: string;
  message?: string;
}

/**
 * Validate a record ID format
 * 
 * @param id The ID to validate
 * @param resourceType Optional resource type for specific validation
 * @returns Validation result with details
 */
export function validateRecordId(
  id: string | undefined | null,
  _resourceType?: string
): IdValidationResult {
  // Check for missing ID
  if (!id) {
    return {
      isValid: false,
      message: 'Record ID is required'
    };
  }

  // Check for empty string
  if (id.trim() === '') {
    return {
      isValid: false,
      message: 'Record ID cannot be empty'
    };
  }

  // Check length constraints
  if (id.length < 20) {
    return {
      isValid: false,
      message: `Invalid record ID format: ID too short (${id.length} characters)`
    };
  }

  if (id.length > 50) {
    return {
      isValid: false,
      message: `Invalid record ID format: ID too long (${id.length} characters)`
    };
  }

  // Check against known patterns
  if (ID_PATTERNS.OBJECT_ID.test(id)) {
    return {
      isValid: true,
      format: 'ObjectId'
    };
  }

  if (ID_PATTERNS.UUID.test(id)) {
    return {
      isValid: true,
      format: 'UUID'
    };
  }

  if (ID_PATTERNS.LEGACY.test(id)) {
    return {
      isValid: true,
      format: 'Legacy'
    };
  }

  // Check for common invalid patterns
  if (id.includes(' ')) {
    return {
      isValid: false,
      message: 'Record ID cannot contain spaces'
    };
  }

  if (id.startsWith('http')) {
    return {
      isValid: false,
      message: 'Record ID appears to be a URL, not a valid ID'
    };
  }

  if (id.includes('@')) {
    return {
      isValid: false,
      message: 'Record ID appears to be an email, not a valid ID'
    };
  }

  // Default rejection for unrecognized formats
  return {
    isValid: false,
    message: `Invalid record ID format: ${id}`
  };
}

/**
 * Validate multiple IDs at once
 * 
 * @param ids Array of IDs to validate
 * @param resourceType Optional resource type
 * @returns Map of ID to validation result
 */
export function validateRecordIds(
  ids: string[],
  resourceType?: string
): Map<string, IdValidationResult> {
  const results = new Map<string, IdValidationResult>();
  
  for (const id of ids) {
    results.set(id, validateRecordId(id, resourceType));
  }
  
  return results;
}

/**
 * Check if all IDs in a list are valid
 * 
 * @param ids Array of IDs to check
 * @returns True if all IDs are valid
 */
export function areAllIdsValid(ids: string[]): boolean {
  return ids.every(id => validateRecordId(id).isValid);
}

/**
 * Filter out invalid IDs from a list
 * 
 * @param ids Array of IDs to filter
 * @returns Object with valid and invalid ID arrays
 */
export function filterValidIds(ids: string[]): {
  valid: string[];
  invalid: Array<{ id: string; reason: string }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ id: string; reason: string }> = [];
  
  for (const id of ids) {
    const result = validateRecordId(id);
    if (result.isValid) {
      valid.push(id);
    } else {
      invalid.push({
        id,
        reason: result.message || 'Invalid format'
      });
    }
  }
  
  return { valid, invalid };
}

/**
 * Normalize an ID to a consistent format
 * 
 * @param id The ID to normalize
 * @returns Normalized ID or null if invalid
 */
export function normalizeId(id: string): string | null {
  const validation = validateRecordId(id);
  if (!validation.isValid) {
    return null;
  }
  
  // Trim whitespace
  let normalized = id.trim();
  
  // Convert to lowercase for hex-based IDs
  if (validation.format === 'ObjectId' || validation.format === 'UUID') {
    normalized = normalized.toLowerCase();
  }
  
  return normalized;
}

/**
 * Generate a cache key for a record ID
 * Used for 404 response caching
 * 
 * @param resourceType The resource type
 * @param id The record ID
 * @returns Cache key string
 */
export function generateIdCacheKey(resourceType: string, id: string): string {
  const normalizedId = normalizeId(id);
  if (!normalizedId) {
    return `${resourceType}:invalid:${id}`;
  }
  return `${resourceType}:${normalizedId}`;
}

/**
 * Check if an error is likely due to an invalid ID format
 * 
 * @param error The error to check
 * @returns True if error appears to be ID-related
 */
export function isIdFormatError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  const lowerMessage = errorMessage.toLowerCase();
  
  return (
    lowerMessage.includes('invalid id') ||
    lowerMessage.includes('invalid record id') ||
    lowerMessage.includes('malformed id') ||
    lowerMessage.includes('objectid failed') ||
    lowerMessage.includes('cast to objectid failed') ||
    lowerMessage.includes('invalid uuid') ||
    lowerMessage.includes('not a valid identifier')
  );
}

/**
 * Extract IDs from various input formats
 * 
 * @param input String that may contain IDs
 * @returns Array of potential IDs found
 */
export function extractIds(input: string): string[] {
  const ids: string[] = [];
  
  // Try to match ObjectId pattern
  const objectIdMatches = input.match(/[a-f0-9]{24}/g);
  if (objectIdMatches) {
    ids.push(...objectIdMatches);
  }
  
  // Try to match UUID pattern
  const uuidMatches = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi);
  if (uuidMatches) {
    ids.push(...uuidMatches);
  }
  
  return [...new Set(ids)]; // Remove duplicates
}