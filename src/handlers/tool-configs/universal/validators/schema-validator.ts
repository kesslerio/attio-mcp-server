import {
  ErrorType,
  HttpStatusCode,
  UniversalValidationError,
} from '../errors/validation-errors.js';
import { UniversalResourceType } from '../types.js';
import { SanitizedObject, SanitizedValue } from '../schemas/common/types.js';
import {
  suggestResourceType,
  validateIdFields,
  validatePaginationParams,
} from './field-validator.js';

/**
 * Fields that should preserve newlines during sanitization.
 * These are content-heavy fields where multiline formatting is meaningful.
 */
const MULTILINE_FIELDS = new Set([
  'content',
  'content_markdown',
  'content_plaintext',
  'description',
  'body',
  'notes',
]);

export class InputSanitizer {
  /**
   * Strip XSS vectors: script tags, event handlers, HTML tags, and stray angle brackets.
   * Shared by both single-line and multiline sanitization.
   */
  private static stripXss(s: string): string {
    // Remove script tags (keep content inside)
    s = s.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '$1');
    // Remove event handlers
    s = s.replace(/on\w+\s*=\s*([^>\s]*)/gi, '$1');
    // Remove HTML tags
    s = s.replace(/<\/?[^>]+>/g, '');
    // Final safety: remove any remaining angle brackets to prevent partial tags
    s = s.replace(/[<>]/g, '');
    return s;
  }

  static sanitizeString(input: unknown): string {
    if (typeof input !== 'string') {
      return String(input);
    }
    const s = this.stripXss(input);
    return s.replace(/\s+/g, ' ').trim();
  }

  /**
   * Sanitize a multiline string - preserves newlines but normalizes other whitespace.
   * Still removes XSS/HTML tags and normalizes excessive whitespace within lines.
   * Used for content fields where line breaks are meaningful (notes, descriptions).
   */
  static sanitizeMultilineString(input: unknown): string {
    if (typeof input !== 'string') {
      return String(input);
    }
    const s = this.stripXss(input);

    // Normalize whitespace per line, but preserve newlines and leading indentation
    const lines = s.split(/\r?\n/);
    const normalizedLines = lines.map((line) => {
      // Preserve leading whitespace (semantic for Markdown indentation)
      const leadingWhitespace = line.match(/^[ \t]*/)?.[0] || '';
      const rest = line.slice(leadingWhitespace.length);
      // Normalize multiple spaces/tabs to single space in content, trim trailing only
      const normalizedRest = rest.replace(/[ \t]+/g, ' ').trimEnd();
      return leadingWhitespace + normalizedRest;
    });
    let result = normalizedLines.join('\n');

    // Normalize excessive blank lines (more than 2 consecutive) to just 2
    result = result.replace(/\n{3,}/g, '\n\n');

    return result.trim();
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
        const lowerKey = key.toLowerCase();
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
        // Multiline field handling - preserve newlines for content fields
        if (MULTILINE_FIELDS.has(lowerKey) && typeof value === 'string') {
          result[key] = this.sanitizeMultilineString(value);
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
  // Universal tools with underscore names (Issue #776 Phase 0)
  records_search: (p) => {
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
  records_get_details: (p) => {
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
  records_get_attributes: (p) => {
    if (!p.resource_type) {
      throw new UniversalValidationError(
        'Missing required parameter: resource_type',
        ErrorType.USER_ERROR,
        {
          field: 'resource_type',
          suggestion: 'Specify which resource type to get attributes for',
          example: `resource_type: 'companies' | 'people' | 'records' | 'tasks'`,
        }
      );
    }
    return p;
  },
  records_discover_attributes: (p) => {
    if (!p.resource_type) {
      throw new UniversalValidationError(
        'Missing required parameter: resource_type',
        ErrorType.USER_ERROR,
        {
          field: 'resource_type',
          suggestion: 'Specify which resource type to discover attributes for',
          example: `resource_type: 'companies' | 'people' | 'records' | 'tasks'`,
        }
      );
    }
    return p;
  },
  records_get_info: (p) => {
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
          suggestion:
            'Provide the unique identifier of the record to get info for',
          example: `record_id: 'comp_abc123'`,
        }
      );
    }
    return p;
  },
  // Legacy CRUD tools (still using hyphenated names)
  create_record: (p) => {
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
  update_record: (p) => {
    const candidateParams = p as Record<string, unknown>;
    if (!p.record_data) {
      if (candidateParams.data !== undefined) {
        p.record_data = candidateParams.data as Record<string, unknown>;
        delete candidateParams.data;
      } else {
        const ignoredKeys = new Set([
          'resource_type',
          'record_id',
          'return_details',
          'data',
        ]);
        const recordData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(candidateParams)) {
          if (!ignoredKeys.has(key)) {
            recordData[key] = value;
          }
        }
        if (Object.keys(recordData).length > 0) {
          p.record_data = recordData;
          for (const key of Object.keys(recordData)) {
            delete candidateParams[key];
          }
        }
      }
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
      const forbidden = ['content', 'content_markdown', 'content_plaintext'];
      if (p.record_data && typeof p.record_data === 'object') {
        const recordData = p.record_data as Record<string, unknown>;
        for (const k of forbidden) {
          if (k in recordData) {
            throw new UniversalValidationError(
              'Task content is immutable and cannot be updated'
            );
          }
        }
      }
    }
    return p;
  },
  delete_record: (p) => {
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
  create_note: (p) => {
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
  records_batch: (p) => {
    if (!p.resource_type) {
      throw new UniversalValidationError(
        'Missing required parameter: resource_type',
        ErrorType.USER_ERROR,
        { field: 'resource_type', example: `resource_type: 'companies'` }
      );
    }

    // Support both new flexible format (operations array) and legacy format (operation_type)
    const hasOperations =
      p.operations && Array.isArray(p.operations) && p.operations.length > 0;
    const hasLegacyFormat = p.operation_type;

    if (!hasOperations && !hasLegacyFormat) {
      throw new UniversalValidationError(
        'Missing required parameters: either "operations" array or "operation_type"',
        ErrorType.USER_ERROR,
        {
          field: 'operations',
          example: `operations: [{ operation: 'create', record_data: { name: 'Example' } }]`,
          suggestion:
            'Use either the new operations array format or legacy operation_type + records format',
        }
      );
    }

    // Validate new format
    if (hasOperations) {
      const operations = p.operations as Array<Record<string, unknown>>;
      for (let index = 0; index < operations.length; index++) {
        const op = operations[index];
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
      const operationType = String(p.operation_type);
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
  list_notes: (p) => {
    const candidateParams = p as Record<string, unknown>;
    if (!p.record_id && typeof candidateParams.parent_record_id === 'string') {
      p.record_id = candidateParams.parent_record_id;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any
): any /* eslint-disable-line @typescript-eslint/no-explicit-any */ {
  const sanitizedValue = InputSanitizer.sanitizeObject(params);
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
  validatePaginationParams(sanitizedParams);
  validateIdFields(sanitizedParams);
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
  const validator = toolValidators[toolName];
  if (validator) return validator(sanitizedParams);
  return sanitizedParams;
}
