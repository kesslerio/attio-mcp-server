import { SanitizedObject, SanitizedValue } from '../schemas/common/types.js';
import { UniversalResourceType } from '../types.js';

export class InputSanitizer {
  static sanitizeString(input: unknown): string {
    if (typeof input !== 'string') {
      return String(input);
    }
    let s = input;
    s = s.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '$1');
    s = s.replace(/on\w+\s*=\s*([^>\s]*)/gi, '$1');
    s = s.replace(/<\/?[^>]+>/g, '');
    return s.replace(/\s+/g, ' ').trim();
  }

  static normalizeEmail(email: unknown): string {
    if (typeof email !== 'string') {
      return String(email).trim().toLowerCase();
    }
    return email.trim().toLowerCase();
  }

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
      const result: Record<string, SanitizedValue> = {};
      for (const [key, value] of Object.entries(
        obj as Record<string, unknown>
      )) {
        if (lowerKey === 'email' && typeof value === 'string') {
          result[key] = this.normalizeEmail(value);
          continue;
        }
        if (lowerKey === 'email_address' && typeof value === 'string') {
          result[key] = this.normalizeEmail(value);
          continue;
        }
        if (lowerKey === 'email_addresses' && Array.isArray(value)) {
          result[key] = (value as unknown[]).map((v) =>
            typeof v === 'string'
              ? this.normalizeEmail(v)
              : (this.sanitizeObject(v) as SanitizedValue)
          );
          continue;
        }
        result[key] = this.sanitizeObject(value);
      }
      return result as SanitizedObject;
    }
    return String(obj);
  }
}

type ToolValidator = (params: SanitizedObject) => SanitizedObject;

const toolValidators: Record<string, ToolValidator> = {
  'search-records': (p) => {
    if (!p.resource_type) {
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
    return p;
  },
  'get-record-details': (p) => {
    if (!p.resource_type) {
      throw new UniversalValidationError(
        'Missing required parameter: resource_type',
        ErrorType.USER_ERROR,
        { field: 'resource_type', example: `resource_type: 'companies'` }
      );
    }
    if (!p.record_id) {
      throw new UniversalValidationError(
        'Missing required parameter: record_id',
        ErrorType.USER_ERROR,
        {
          field: 'record_id',
          suggestion: 'Provide the unique identifier of the record to retrieve',
          example: `record_id: 'comp_abc123'`,
        }
      );
    }
    return p;
  },
  'create-record': (p) => {
    if (!p.resource_type) {
      throw new UniversalValidationError(
        'Missing required parameter: resource_type',
        ErrorType.USER_ERROR,
        { field: 'resource_type', example: `resource_type: 'companies'` }
      );
    }
    if (!p.record_data) {
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
    return p;
  },
  'update-record': (p) => {
    if (!p.resource_type) {
      throw new UniversalValidationError(
        'Missing required parameter: resource_type',
        ErrorType.USER_ERROR,
        { field: 'resource_type', example: `resource_type: 'companies'` }
      );
    }
    if (!p.record_id) {
      throw new UniversalValidationError(
        'Missing required parameter: record_id',
        ErrorType.USER_ERROR,
        { field: 'record_id', example: `record_id: 'comp_abc123'` }
      );
    }
    if (!p.record_data) {
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
    if (p.resource_type === 'tasks') {
      if (p.record_data && typeof p.record_data === 'object') {
        for (const k of forbidden) {
          if (k in (p.record_data as any)) {
            throw new UniversalValidationError(
              'Task content is immutable and cannot be updated'
            );
          }
        }
      }
    }
    return p;
  },
  'delete-record': (p) => {
    if (!p.resource_type) {
      throw new UniversalValidationError(
        'Missing required parameter: resource_type',
        ErrorType.USER_ERROR,
        { field: 'resource_type', example: `resource_type: 'companies'` }
      );
    }
    if (!p.record_id) {
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
    return p;
  },
  'create-note': (p) => {
    if (!p.resource_type) {
      throw new UniversalValidationError(
        'Missing required parameter: resource_type',
        ErrorType.USER_ERROR,
        { field: 'resource_type', example: `resource_type: 'deals'` }
      );
    }
    if (!p.record_id) {
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
    if (!p.title) {
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
    if (!p.content) {
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
    return p;
  },
  'get-notes': (p) => p,
  'search-notes': (p) => p,
  'update-note': (p) => {
    if (!p.note_id) {
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
    return p;
  },
  'delete-note': (p) => {
    if (!p.note_id) {
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
    return p;
  },
  'batch-operations': (p) => {
    if (!p.resource_type) {
      throw new UniversalValidationError(
        'Missing required parameter: resource_type',
        ErrorType.USER_ERROR,
        { field: 'resource_type', example: `resource_type: 'companies'` }
      );
    }
    
    // Support both new flexible format (operations array) and legacy format (operation_type)
    
    if (!hasOperations && !hasLegacyFormat) {
      throw new UniversalValidationError(
        'Missing required parameters: either "operations" array or "operation_type"',
        ErrorType.USER_ERROR,
        {
          field: 'operations',
          example: `operations: [{ operation: 'create', record_data: { name: 'Example' } }]`,
          suggestion: 'Use either the new operations array format or legacy operation_type + records format',
        }
      );
    }
    
    // Validate new format
    if (hasOperations) {
      for (const [index, op] of operations.entries()) {
        if (!op.operation) {
          throw new UniversalValidationError(
            `Missing operation type for operation at index ${index}`,
            ErrorType.USER_ERROR,
            {
              field: `operations[${index}].operation`,
              example: `operation: 'create'`,
            }
          );
        }
        if (!op.record_data) {
          throw new UniversalValidationError(
            `Missing record_data for operation at index ${index}`,
            ErrorType.USER_ERROR,
            {
              field: `operations[${index}].record_data`,
              example: `record_data: { name: 'Example' }`,
            }
          );
        }
      }
    }
    
    // Validate legacy format
    if (hasLegacyFormat) {
      if (['create', 'update'].includes(operationType) && !p.records) {
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
      if (['delete', 'get'].includes(operationType) && !p.record_ids) {
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
    return p;
  },
  'list-notes': (p) => {
    if (!p.record_id && (p as any).parent_record_id) {
      (p as any).record_id = (p as any).parent_record_id;
    }
    if (!p.resource_type) {
      throw new UniversalValidationError(
        'Missing required parameter: resource_type',
        ErrorType.USER_ERROR,
        { field: 'resource_type', example: `resource_type: 'companies'` }
      );
    }
    if (!p.record_id) {
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
    return p;
  },
};

export function validateUniversalToolParams(
  toolName: string,
  params: any
): unknown {
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
  validatePaginationParams(sanitizedParams);
  validateIdFields(sanitizedParams);
  if (sanitizedParams.resource_type) {
    if (
      !Object.values(UniversalResourceType).includes(
        resourceType as UniversalResourceType
      )
    ) {
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
  if (validator) return validator(sanitizedParams);
  return sanitizedParams;
}
