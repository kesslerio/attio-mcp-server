import { SanitizedObject } from '../schemas/common/types.js';
import { UniversalResourceType } from '../types.js';

export function suggestResourceType(invalid: string): string | undefined {
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
  if (suggestions[lower]) return suggestions[lower];
  let bestMatch = '';
  let bestScore = 0;
  for (const validType of validTypes) {
    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = validType;
    }
  }
  return bestMatch || undefined;
}

function getStringSimilarity(str1: string, str2: string): number {
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
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

export function validatePaginationParams(params: SanitizedObject): void {
  if (
    'limit' in params &&
    params.limit !== null &&
    params.limit !== undefined
  ) {
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
    params.limit = limit;
  }
  if (
    'offset' in params &&
    params.offset !== null &&
    params.offset !== undefined
  ) {
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
    params.offset = offset;
  }
}

export function validateIdFields(params: SanitizedObject): void {
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
