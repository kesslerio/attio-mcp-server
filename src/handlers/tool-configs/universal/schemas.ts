/**
 * MCP-compliant schemas for universal tools
 *
 * These schemas follow MCP protocol requirements:
 * - No oneOf/allOf/anyOf at top level
 * - Enum-based operation discrimination
 * - Runtime parameter validation
 */

import {
  UniversalResourceType,
  DetailedInfoType,
  BatchOperationType,
  TimeframeType,
  ContentSearchType,
  RelationshipType,
} from './types.js';

/**
 * Error classification for better error handling
 */
export enum ErrorType {
  USER_ERROR = 'USER_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  API_ERROR = 'API_ERROR',
}

/**
 * HTTP status codes for error classification
 */
export enum HttpStatusCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Enhanced error class with classification, suggestions, and HTTP status mapping
 */
export class UniversalValidationError extends Error {
  public readonly errorType: ErrorType;
  public readonly suggestion?: string;
  public readonly example?: string;
  public readonly field?: string;
  public readonly httpStatusCode: HttpStatusCode;

  constructor(
    message: string,
    errorType: ErrorType = ErrorType.USER_ERROR,
    options: {
      suggestion?: string;
      example?: string;
      field?: string;
      cause?: Error;
      httpStatusCode?: HttpStatusCode;
    } = {}
  ) {
    super(message);
    this.name = 'UniversalValidationError';
    this.errorType = errorType;
    this.suggestion = options.suggestion;
    this.example = options.example;
    this.field = options.field;
    this.cause = options.cause;

    // Map error types to appropriate HTTP status codes
    this.httpStatusCode =
      options.httpStatusCode ?? this.getDefaultHttpStatus(errorType);
  }

  /**
   * Get default HTTP status code based on error type
   */
  private getDefaultHttpStatus(errorType: ErrorType): HttpStatusCode {
    switch (errorType) {
      case ErrorType.USER_ERROR:
        return HttpStatusCode.BAD_REQUEST;
      case ErrorType.API_ERROR:
        return HttpStatusCode.BAD_GATEWAY;
      case ErrorType.SYSTEM_ERROR:
        return HttpStatusCode.INTERNAL_SERVER_ERROR;
      default:
        return HttpStatusCode.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Get structured error response for API consumers
   */
  toErrorResponse() {
    return {
      error: {
        type: this.errorType,
        message: this.message,
        field: this.field,
        suggestion: this.suggestion,
        example: this.example,
        httpStatusCode: this.httpStatusCode,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Supported sanitized value types
 */
export type SanitizedValue =
  | string
  | number
  | boolean
  | null
  | SanitizedObject
  | SanitizedValue[];

/**
 * Interface for sanitized objects with proper typing
 */
export interface SanitizedObject extends Record<string, SanitizedValue> {
  [key: string]: SanitizedValue;
}

/**
 * Input sanitization utilities with enhanced type safety
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS attacks
   */
  /**
   * Sanitize string input to prevent XSS attacks
   * @param input - Input to sanitize (converted to string if not already)
   * @returns Sanitized string
   */
  static sanitizeString(input: unknown): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    let s = input;

    // 1) unwrap <script>...</script> but keep inner text
    s = s.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '$1');

    // 2) Remove event handlers by pattern onclick=alert(1) -> alert(1)
    // Handles patterns like: onclick=alert(1)Safe description -> alert(1)Safe description
    s = s.replace(/on\w+\s*=\s*([^>\s]*)/gi, '$1');

    // 3) basic tag stripping (keep text)
    s = s.replace(/<\/?[^>]+>/g, '');

    // 4) collapse whitespace and trim
    return s.replace(/\s+/g, ' ').trim();
  }

  /**
   * Normalize email addresses
   */
  /**
   * Normalize email addresses to consistent format
   * @param email - Email address to normalize
   * @returns Normalized email address
   */
  static normalizeEmail(email: unknown): string {
    if (typeof email !== 'string') {
      return String(email).trim().toLowerCase();
    }
    return email.trim().toLowerCase();
  }

  /**
   * Sanitize object recursively
   */
  /**
   * Sanitize object recursively with proper type safety
   * @param obj - Object to sanitize
   * @returns Sanitized object with type safety
   */
  static sanitizeObject(obj: unknown): SanitizedValue {
    if (obj === null) return null;
    if (obj === undefined) return null;

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (typeof obj === 'object') {
      const sanitized: SanitizedObject = {};
      for (const [key, value] of Object.entries(obj)) {
        // ISSUE #518 FIX: Sanitize email fields specifically - but only if the value is a string
        // Previous bug: email_addresses arrays like [{email_address: "x"}] were converted to "[object object]"
        // Root cause: normalizeEmail() was called on non-string values, causing String(object) conversion
        // Solution: Only apply email normalization to string values; process arrays/objects recursively
        if (
          key.toLowerCase().includes('email') &&
          value !== null &&
          value !== undefined &&
          typeof value === 'string'
        ) {
          sanitized[key] = this.normalizeEmail(value);
        } else {
          sanitized[key] = this.sanitizeObject(value);
        }
      }
      return sanitized;
    }

    // For any other types, convert to string and sanitize
    return this.sanitizeString(obj);
  }
}

/**
 * Base resource type schema property
 */
const resourceTypeProperty = {
  type: 'string' as const,
  enum: Object.values(UniversalResourceType),
  description:
    'Type of resource to operate on (companies, people, lists, records, tasks)',
};

/**
 * Common pagination properties
 */
const paginationProperties = {
  limit: {
    type: 'number' as const,
    minimum: 1,
    maximum: 100,
    default: 10,
    description: 'Maximum number of results to return',
  },
  offset: {
    type: 'number' as const,
    minimum: 0,
    default: 0,
    description: 'Number of results to skip for pagination',
  },
};

/**
 * Universal search records schema
 */
export const searchRecordsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    query: {
      type: 'string' as const,
      description: 'Search query string',
    },
    filters: {
      type: 'object' as const,
      description: 'Advanced filter conditions',
      additionalProperties: true,
    },
    search_type: {
      type: 'string' as const,
      enum: ['basic', 'content'] as const,
      description: 'Type of search - basic field matching or content search',
    },
    fields: {
      type: 'array' as const,
      items: {
        type: 'string' as const,
      },
      description: 'Specific fields to search within (for content search)',
    },
    match_type: {
      type: 'string' as const,
      enum: ['exact', 'partial', 'fuzzy'] as const,
      description: 'Type of string matching to use',
    },
    sort: {
      type: 'string' as const,
      enum: ['relevance', 'created', 'modified', 'name'] as const,
      description: 'How to sort search results',
    },
    ...paginationProperties,
  },
  required: ['resource_type' as const],
  additionalProperties: false,
};

/**
 * Universal get record details schema
 */
export const getRecordDetailsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description: 'Unique identifier of the record to retrieve',
    },
    fields: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Specific fields to include in the response',
    },
  },
  required: ['resource_type' as const, 'record_id' as const],
  additionalProperties: false,
};

/**
 * Universal create record schema
 */
export const createRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_data: {
      type: 'object' as const,
      description: 'Data for creating the new record',
      additionalProperties: true,
    },
    return_details: {
      type: 'boolean' as const,
      default: true,
      description: 'Whether to return full record details after creation',
    },
  },
  required: ['resource_type' as const, 'record_data' as const],
  additionalProperties: false,
};

/**
 * Universal update record schema
 */
export const updateRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description: 'Unique identifier of the record to update',
    },
    record_data: {
      type: 'object' as const,
      description: 'Updated data for the record',
      additionalProperties: true,
    },
    return_details: {
      type: 'boolean' as const,
      default: true,
      description: 'Whether to return full record details after update',
    },
  },
  required: [
    'resource_type' as const,
    'record_id' as const,
    'record_data' as const,
  ],
  additionalProperties: false,
};

/**
 * Universal delete record schema
 */
export const deleteRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description: 'Unique identifier of the record to delete',
    },
  },
  required: ['resource_type' as const, 'record_id' as const],
  additionalProperties: false,
};

/**
 * Universal get attributes schema
 */
export const getAttributesSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description:
        'Record ID to get attributes for (optional for schema discovery)',
    },
    categories: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description:
        'Categories of attributes to retrieve (basic, business, contact, social, custom)',
    },
    fields: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Specific attribute field names to retrieve',
    },
  },
  required: ['resource_type' as const],
  additionalProperties: false,
};

/**
 * Universal discover attributes schema
 */
export const discoverAttributesSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    categories: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description:
        'Categories of attributes to retrieve (basic, business, contact, social, custom)',
    },
  },
  required: ['resource_type' as const],
  additionalProperties: false,
};

/**
 * Universal get detailed info schema
 */
export const getDetailedInfoSchema = {
  type: 'object',
  properties: {
    resource_type: {
      type: 'string',
      enum: Object.values(UniversalResourceType),
      description: 'Type of resource to operate on',
    },
    record_id: {
      type: 'string',
      description: 'Unique identifier of the record',
    },
    info_type: {
      type: 'string',
      enum: Object.values(DetailedInfoType),
      description:
        'Type of detailed information to retrieve (contact, business, social, basic, custom)',
    },
  },
  required: ['resource_type', 'record_id', 'info_type'],
  additionalProperties: false,
};

/**
 * Schema for universal note creation
 */
export const createNoteSchema = {
  type: 'object',
  properties: {
    resource_type: {
      type: 'string',
      enum: Object.values(UniversalResourceType),
      description:
        'Type of resource to create note for (companies, people, deals)',
    },
    record_id: {
      type: 'string',
      description: 'ID of the record to attach the note to',
    },
    title: {
      type: 'string',
      description: 'Title of the note',
    },
    content: {
      type: 'string',
      description: 'Content of the note',
    },
  },
  required: ['resource_type', 'record_id', 'title', 'content'],
  additionalProperties: false,
};

/**
 * Schema for universal get notes
 */
export const getNotesSchema = {
  type: 'object',
  properties: {
    resource_type: {
      type: 'string',
      enum: Object.values(UniversalResourceType),
      description: 'Type of resource to get notes for (optional)',
    },
    record_id: {
      type: 'string',
      description: 'ID of the record to get notes for (optional)',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of notes to return',
      minimum: 1,
      maximum: 100,
    },
    offset: {
      type: 'number',
      description: 'Number of notes to skip',
      minimum: 0,
    },
  },
  additionalProperties: false,
};

/**
 * Schema for universal update note
 */
export const updateNoteSchema = {
  type: 'object',
  properties: {
    note_id: {
      type: 'string',
      description: 'ID of the note to update',
    },
    title: {
      type: 'string',
      description: 'New title for the note',
    },
    content: {
      type: 'string',
      description: 'New content for the note',
    },
    is_archived: {
      type: 'boolean',
      description: 'Whether to archive the note',
    },
  },
  required: ['note_id'],
  additionalProperties: false,
};

/**
 * Schema for universal search notes
 */
export const searchNotesSchema = {
  type: 'object',
  properties: {
    resource_type: {
      type: 'string',
      enum: Object.values(UniversalResourceType),
      description: 'Type of resource to search notes for (optional)',
    },
    record_id: {
      type: 'string',
      description: 'ID of the record to search notes for (optional)',
    },
    query: {
      type: 'string',
      description: 'Search query for note content or title',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of notes to return',
      minimum: 1,
      maximum: 100,
    },
    offset: {
      type: 'number',
      description: 'Number of notes to skip',
      minimum: 0,
    },
  },
  additionalProperties: false,
};

/**
 * Schema for universal delete note
 */
export const deleteNoteSchema = {
  type: 'object',
  properties: {
    note_id: {
      type: 'string',
      description: 'ID of the note to delete',
    },
  },
  required: ['note_id'],
  additionalProperties: false,
};

/**
 * Advanced search schema
 */
export const advancedSearchSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    query: {
      type: 'string' as const,
      description: 'Search query string',
    },
    filters: {
      type: 'object' as const,
      description: 'Complex filter conditions',
      additionalProperties: true,
    },
    sort_by: {
      type: 'string' as const,
      description: 'Field to sort results by',
    },
    sort_order: {
      type: 'string' as const,
      enum: ['asc', 'desc'],
      default: 'asc',
      description: 'Sort order (ascending or descending)',
    },
    ...paginationProperties,
  },
  required: ['resource_type' as const],
  additionalProperties: false,
};

/**
 * Search by relationship schema
 */
export const searchByRelationshipSchema = {
  type: 'object' as const,
  properties: {
    relationship_type: {
      type: 'string' as const,
      enum: Object.values(RelationshipType),
      description:
        'Type of relationship to search (company_to_people, people_to_company, etc.)',
    },
    source_id: {
      type: 'string' as const,
      description: 'ID of the source record for the relationship',
    },
    target_resource_type: {
      type: 'string' as const,
      enum: Object.values(UniversalResourceType),
      description: 'Target resource type for the relationship',
    },
    listId: {
      type: 'string' as const,
      description:
        '(Optional) List ID for validation - will return error if not a valid UUID',
    },
    ...paginationProperties,
  },
  required: ['relationship_type' as const, 'source_id' as const],
  additionalProperties: false,
};

/**
 * Search by content schema
 */
export const searchByContentSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    content_type: {
      type: 'string' as const,
      enum: Object.values(ContentSearchType),
      description: 'Type of content to search (notes, activity, interactions)',
    },
    search_query: {
      type: 'string' as const,
      description: 'Query to search within the content',
    },
    ...paginationProperties,
  },
  required: [
    'resource_type' as const,
    'content_type' as const,
    'search_query' as const,
  ],
  additionalProperties: false,
};

/**
 * Search by timeframe schema
 */
export const searchByTimeframeSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    timeframe_type: {
      type: 'string' as const,
      enum: Object.values(TimeframeType),
      description:
        'Type of timeframe to filter by (created, modified, last_interaction)',
    },
    start_date: {
      type: 'string' as const,
      format: 'date',
      description: 'Start date for the timeframe filter (ISO 8601 date)',
    },
    end_date: {
      type: 'string' as const,
      format: 'date',
      description: 'End date for the timeframe filter (ISO 8601 date)',
    },
    ...paginationProperties,
  },
  required: ['resource_type' as const, 'timeframe_type' as const],
  additionalProperties: false,
};

/**
 * Batch operations schema
 */
export const batchOperationsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    operation_type: {
      type: 'string' as const,
      enum: Object.values(BatchOperationType),
      description:
        'Type of batch operation to perform (create, update, delete, search, get)',
    },
    records: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        additionalProperties: true,
      },
      description: 'Array of record data for create/update operations',
    },
    record_ids: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Array of record IDs for delete/get operations',
    },
    ...paginationProperties,
  },
  required: ['resource_type' as const, 'operation_type' as const],
  additionalProperties: false,
};

/**
 * Cross-resource validation utilities
 */
export class CrossResourceValidator {
  /**
   * Validate that a company ID exists before creating/updating people
   * @param companyId - The company ID to validate
   * @returns Promise resolving to validation result with detailed error info
   */
  static async validateCompanyExists(companyId: string): Promise<{
    exists: boolean;
    error?: {
      type: 'not_found' | 'api_error' | 'invalid_format';
      message: string;
      httpStatusCode: HttpStatusCode;
    };
  }> {
    // Basic format validation
    if (
      !companyId ||
      typeof companyId !== 'string' ||
      companyId.trim().length === 0
    ) {
      return {
        exists: false,
        error: {
          type: 'invalid_format',
          message: 'Company ID must be a non-empty string',
          httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
        },
      };
    }

    try {
      const { getAttioClient } = await import('../../../api/attio-client.js');
      const client = getAttioClient();
      await client.get(`/objects/companies/records/${companyId.trim()}`);
      return { exists: true };
    } catch (error: any) {
      // Classify the error based on response
      if (error?.response?.status === 404) {
        return {
          exists: false,
          error: {
            type: 'not_found',
            message: `Company with ID '${companyId}' does not exist`,
            httpStatusCode: HttpStatusCode.NOT_FOUND,
          },
        };
      }

      return {
        exists: false,
        error: {
          type: 'api_error',
          message: `Failed to validate company existence: ${error?.message || 'Unknown API error'}`,
          httpStatusCode: HttpStatusCode.BAD_GATEWAY,
        },
      };
    }
  }

  /**
   * Validate record relationships based on resource type and data
   */
  static async validateRecordRelationships(
    resourceType: UniversalResourceType,
    recordData: any
  ): Promise<void> {
    if (!recordData || typeof recordData !== 'object') return;

    switch (resourceType) {
      case UniversalResourceType.PEOPLE:
        {
          // Check if company_id is provided and validate it exists
          const companyId =
            recordData.company_id ||
            recordData.company?.id ||
            recordData.company;
          if (companyId) {
            const companyIdString = String(companyId);
            const validationResult =
              await this.validateCompanyExists(companyIdString);
            if (!validationResult.exists) {
              const error = validationResult.error!;
              throw new UniversalValidationError(
                error.message,
                error.type === 'api_error'
                  ? ErrorType.API_ERROR
                  : ErrorType.USER_ERROR,
                {
                  field: 'company_id',
                  suggestion:
                    error.type === 'not_found'
                      ? 'Verify the company ID exists, or create the company first'
                      : 'Check your API connection and try again',
                  example:
                    error.type === 'not_found'
                      ? `Try searching for companies first: search-records with resource_type: 'companies'`
                      : undefined,
                  httpStatusCode: error.httpStatusCode,
                }
              );
            }
          }
        }
        break;

      case UniversalResourceType.RECORDS:
        // Validate any object references in custom records
        if (recordData.parent_id || recordData.related_records) {
          // Add validation for custom record relationships if needed
        }
        break;

      case UniversalResourceType.TASKS:
        // Validate task assignments and record associations
        if (recordData.recordId) {
          // Could validate the referenced record exists
        }
        break;

      default:
        // No cross-resource validation needed for other types
        break;
    }
  }
}

/**
 * Helper function to suggest closest resource type
 */
function suggestResourceType(invalid: string): string | undefined {
  const validTypes = Object.values(UniversalResourceType);
  const lower = invalid.toLowerCase();

  // Check for common mistakes
  const suggestions: Record<string, string> = {
    company: 'companies',
    person: 'people',
    record: 'records',
    task: 'tasks',
    user: 'people',
    contact: 'people',
    organization: 'companies',
    org: 'companies',
  };

  if (suggestions[lower]) {
    return suggestions[lower];
  }

  // Find closest match by character similarity
  let bestMatch = '';
  let bestScore = 0;

  for (const validType of validTypes) {
    const score = getStringSimilarity(lower, validType);
    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = validType;
    }
  }

  return bestMatch || undefined;
}

/**
 * Simple string similarity calculation
 */
function getStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate edit distance between two strings
 */
function getEditDistance(str1: string, str2: string): number {
  const matrix = [];

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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Validate pagination parameters
 */
function validatePaginationParams(params: SanitizedObject): void {
  // Validate limit
  if (
    'limit' in params &&
    params.limit !== null &&
    params.limit !== undefined
  ) {
    const limit = Number(params.limit);

    if (isNaN(limit) || !Number.isInteger(limit)) {
      throw new UniversalValidationError(
        'Parameter "limit" must be an integer',
        ErrorType.USER_ERROR,
        {
          field: 'limit',
          httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
          suggestion: 'Provide a valid integer for limit',
          example: 'limit: 10',
        }
      );
    }

    if (limit < 1) {
      throw new UniversalValidationError(
        'Parameter "limit" must be at least 1',
        ErrorType.USER_ERROR,
        {
          field: 'limit',
          httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
          suggestion: 'Use a positive integer for limit',
          example: 'limit: 10',
        }
      );
    }

    if (limit > 100) {
      throw new UniversalValidationError(
        'Parameter "limit" must not exceed 100',
        ErrorType.USER_ERROR,
        {
          field: 'limit',
          httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
          suggestion: 'Use a value between 1 and 100',
          example: 'limit: 50',
        }
      );
    }

    // Ensure it's stored as a number
    params.limit = limit;
  }

  // Validate offset
  if (
    'offset' in params &&
    params.offset !== null &&
    params.offset !== undefined
  ) {
    const offset = Number(params.offset);

    if (isNaN(offset) || !Number.isInteger(offset)) {
      throw new UniversalValidationError(
        'Parameter "offset" must be an integer',
        ErrorType.USER_ERROR,
        {
          field: 'offset',
          httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
          suggestion: 'Provide a valid integer for offset',
          example: 'offset: 0',
        }
      );
    }

    if (offset < 0) {
      throw new UniversalValidationError(
        'Parameter "offset" must be non-negative',
        ErrorType.USER_ERROR,
        {
          field: 'offset',
          httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
          suggestion: 'Use a non-negative integer for offset',
          example: 'offset: 0',
        }
      );
    }

    // Ensure it's stored as a number
    params.offset = offset;
  }
}

/**
 * Validate ID format for record_id and similar fields
 */
function validateIdFields(params: SanitizedObject): void {
  const idFields = [
    'record_id',
    'source_id',
    'target_id',
    'company_id',
    'person_id',
    'list_id',
  ];

  for (const field of idFields) {
    if (
      field in params &&
      params[field] !== null &&
      params[field] !== undefined
    ) {
      const id = String(params[field]);

      // Basic ID format validation (alphanumeric with underscores and hyphens)
      const idRegex = /^[a-zA-Z0-9_-]+$/;

      if (!idRegex.test(id)) {
        throw new UniversalValidationError(
          `Invalid ${field} format: "${id}"`,
          ErrorType.USER_ERROR,
          {
            field,
            httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
            suggestion: `The ${field} should contain only letters, numbers, underscores, and hyphens`,
            example: `${field}: 'comp_abc123' or 'person_xyz789'`,
          }
        );
      }

      // Check for reasonable length
      if (id.length < 3 || id.length > 100) {
        throw new UniversalValidationError(
          `Invalid ${field} length: ${id.length} characters`,
          ErrorType.USER_ERROR,
          {
            field,
            httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
            suggestion: `The ${field} should be between 3 and 100 characters`,
            example: `${field}: 'comp_abc123'`,
          }
        );
      }
    }
  }
}

/**
 * Enhanced schema validation utility function with better error messages
 */
export function validateUniversalToolParams(
  toolName: string,
  params: any
): any {
  // Sanitize input parameters first
  const sanitizedValue = InputSanitizer.sanitizeObject(params);

  // Ensure we have a valid object to work with
  if (
    !sanitizedValue ||
    typeof sanitizedValue !== 'object' ||
    Array.isArray(sanitizedValue)
  ) {
    throw new UniversalValidationError(
      'Invalid parameters: expected an object',
      ErrorType.USER_ERROR,
      {
        suggestion: 'Provide parameters as an object',
        example: '{ resource_type: "companies", ... }',
        httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
      }
    );
  }

  const sanitizedParams = sanitizedValue as SanitizedObject;

  // Validate pagination parameters (limit, offset)
  validatePaginationParams(sanitizedParams);

  // Validate ID format for record_id and similar fields
  validateIdFields(sanitizedParams);

  // Validate resource_type if present
  if (sanitizedParams.resource_type) {
    const resourceType = String(sanitizedParams.resource_type);
    if (
      !Object.values(UniversalResourceType).includes(
        resourceType as UniversalResourceType
      )
    ) {
      const suggestion = suggestResourceType(resourceType);
      const validTypes = Object.values(UniversalResourceType).join(', ');

      throw new UniversalValidationError(
        `Invalid resource_type: '${resourceType}'`,
        ErrorType.USER_ERROR,
        {
          field: 'resource_type',
          suggestion: suggestion ? `Did you mean '${suggestion}'?` : undefined,
          example: `Expected one of: ${validTypes}`,
          httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
        }
      );
    }
  }

  switch (toolName) {
    case 'search-records':
      if (!sanitizedParams.resource_type) {
        throw new UniversalValidationError(
          'Missing required parameter: resource_type',
          ErrorType.USER_ERROR,
          {
            field: 'resource_type',
            suggestion: 'Specify which type of records to search',
            example: `resource_type: 'companies' | 'people' | 'records' | 'tasks'`,
          }
        );
      }
      break;

    case 'get-record-details':
      if (!sanitizedParams.resource_type) {
        throw new UniversalValidationError(
          'Missing required parameter: resource_type',
          ErrorType.USER_ERROR,
          {
            field: 'resource_type',
            example: `resource_type: 'companies'`,
          }
        );
      }
      if (!sanitizedParams.record_id) {
        throw new UniversalValidationError(
          'Missing required parameter: record_id',
          ErrorType.USER_ERROR,
          {
            field: 'record_id',
            suggestion:
              'Provide the unique identifier of the record to retrieve',
            example: `record_id: 'comp_abc123'`,
          }
        );
      }
      break;

    case 'create-record':
      if (!sanitizedParams.resource_type) {
        throw new UniversalValidationError(
          'Missing required parameter: resource_type',
          ErrorType.USER_ERROR,
          {
            field: 'resource_type',
            example: `resource_type: 'companies'`,
          }
        );
      }
      if (!sanitizedParams.record_data) {
        throw new UniversalValidationError(
          'Missing required parameter: record_data',
          ErrorType.USER_ERROR,
          {
            field: 'record_data',
            suggestion: 'Provide the data for creating the new record',
            example: `record_data: { name: 'Company Name', domain: 'example.com' }`,
          }
        );
      }
      break;

    case 'update-record':
      if (!sanitizedParams.resource_type) {
        throw new UniversalValidationError(
          'Missing required parameter: resource_type',
          ErrorType.USER_ERROR,
          { field: 'resource_type', example: `resource_type: 'companies'` }
        );
      }
      if (!sanitizedParams.record_id) {
        throw new UniversalValidationError(
          'Missing required parameter: record_id',
          ErrorType.USER_ERROR,
          { field: 'record_id', example: `record_id: 'comp_abc123'` }
        );
      }
      if (!sanitizedParams.record_data) {
        throw new UniversalValidationError(
          'Missing required parameter: record_data',
          ErrorType.USER_ERROR,
          {
            field: 'record_data',
            suggestion: 'Provide the data to update the record with',
            example: `record_data: { name: 'Updated Name' }`,
          }
        );
      }

      // Task content immutability validation
      if (sanitizedParams.resource_type === 'tasks') {
        const forbidden = ['content', 'content_markdown', 'content_plaintext'];
        if (
          sanitizedParams.record_data &&
          typeof sanitizedParams.record_data === 'object'
        ) {
          for (const k of forbidden) {
            if (k in sanitizedParams.record_data) {
              throw new UniversalValidationError(
                'Task content is immutable and cannot be updated'
              );
            }
          }
        }
      }
      break;

    case 'delete-record':
      if (!sanitizedParams.resource_type) {
        throw new UniversalValidationError(
          'Missing required parameter: resource_type',
          ErrorType.USER_ERROR,
          { field: 'resource_type', example: `resource_type: 'companies'` }
        );
      }
      if (!sanitizedParams.record_id) {
        throw new UniversalValidationError(
          'Missing required parameter: record_id',
          ErrorType.USER_ERROR,
          {
            field: 'record_id',
            suggestion: 'Provide the ID of the record to delete',
            example: `record_id: 'comp_abc123'`,
          }
        );
      }
      break;

    case 'create-note':
      if (!sanitizedParams.resource_type) {
        throw new UniversalValidationError(
          'Missing required parameter: resource_type',
          ErrorType.USER_ERROR,
          { field: 'resource_type', example: `resource_type: 'deals'` }
        );
      }
      if (!sanitizedParams.record_id) {
        throw new UniversalValidationError(
          'Missing required parameter: record_id',
          ErrorType.USER_ERROR,
          {
            field: 'record_id',
            suggestion: 'Provide the ID of the record to attach the note to',
            example: `record_id: '35dfdec5-f4a6-4a53-b5e0-f0809224e156'`,
          }
        );
      }
      if (!sanitizedParams.title) {
        throw new UniversalValidationError(
          'Missing required parameter: title',
          ErrorType.USER_ERROR,
          {
            field: 'title',
            suggestion: 'Provide a title for the note',
            example: `title: 'Meeting notes'`,
          }
        );
      }
      if (!sanitizedParams.content) {
        throw new UniversalValidationError(
          'Missing required parameter: content',
          ErrorType.USER_ERROR,
          {
            field: 'content',
            suggestion: 'Provide content for the note',
            example: `content: 'Discussion about project timeline'`,
          }
        );
      }
      break;

    case 'get-notes':
      // All parameters are optional for get-notes
      break;

    case 'update-note':
      if (!sanitizedParams.note_id) {
        throw new UniversalValidationError(
          'Missing required parameter: note_id',
          ErrorType.USER_ERROR,
          {
            field: 'note_id',
            suggestion: 'Provide the ID of the note to update',
            example: `note_id: 'note_abc123'`,
          }
        );
      }
      break;

    case 'search-notes':
      // All parameters are optional for search-notes
      break;

    case 'delete-note':
      if (!sanitizedParams.note_id) {
        throw new UniversalValidationError(
          'Missing required parameter: note_id',
          ErrorType.USER_ERROR,
          {
            field: 'note_id',
            suggestion: 'Provide the ID of the note to delete',
            example: `note_id: 'note_abc123'`,
          }
        );
      }
      break;

    case 'batch-operations':
      {
        if (!sanitizedParams.resource_type) {
          throw new UniversalValidationError(
            'Missing required parameter: resource_type',
            ErrorType.USER_ERROR,
            { field: 'resource_type', example: `resource_type: 'companies'` }
          );
        }
        if (!sanitizedParams.operation_type) {
          throw new UniversalValidationError(
            'Missing required parameter: operation_type',
            ErrorType.USER_ERROR,
            {
              field: 'operation_type',
              example: `operation_type: 'create' | 'update' | 'delete' | 'search' | 'get'`,
            }
          );
        }
        const operationType = String(sanitizedParams.operation_type);
        if (
          ['create', 'update'].includes(operationType) &&
          !sanitizedParams.records
        ) {
          throw new UniversalValidationError(
            `Missing required parameter for ${operationType} operations: records`,
            ErrorType.USER_ERROR,
            {
              field: 'records',
              suggestion: `Provide an array of record data for ${operationType} operations`,
              example: `records: [{ name: 'Company 1' }, { name: 'Company 2' }]`,
            }
          );
        }
        if (
          ['delete', 'get'].includes(operationType) &&
          !sanitizedParams.record_ids
        ) {
          throw new UniversalValidationError(
            `Missing required parameter for ${operationType} operations: record_ids`,
            ErrorType.USER_ERROR,
            {
              field: 'record_ids',
              suggestion: `Provide an array of record IDs for ${operationType} operations`,
              example: `record_ids: ['comp_abc123', 'comp_def456']`,
            }
          );
        }
      }
      break;

    case 'list-notes':
      if (!sanitizedParams.resource_type) {
        throw new UniversalValidationError(
          'Missing required parameter: resource_type',
          ErrorType.USER_ERROR,
          { field: 'resource_type', example: `resource_type: 'companies'` }
        );
      }
      if (!sanitizedParams.record_id) {
        throw new UniversalValidationError(
          'Missing required parameter: record_id',
          ErrorType.USER_ERROR,
          {
            field: 'record_id',
            suggestion: 'Provide the ID of the record to list notes for',
            example: `record_id: '35dfdec5-f4a6-4a53-b5e0-f0809224e156'`,
          }
        );
      }
      break;

    default:
      // Additional validation for other tools can be added here
      break;
  }

  return sanitizedParams;
}
