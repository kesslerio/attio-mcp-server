import { UniversalResourceType } from '../types.js';
import {
  ErrorType,
  HttpStatusCode,
  UniversalValidationError,
} from '../errors/validation-errors.js';
import { getLazyAttioClient } from '../../../../api/lazy-client.js';

export class CrossResourceValidator {
  static async validateCompanyExists(companyId: string): Promise<{
    exists: boolean;
    error?: {
      type: 'not_found' | 'api_error' | 'invalid_format';
      message: string;
      httpStatusCode: HttpStatusCode;
    };
  }> {
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
      const client = getLazyAttioClient();
      await client.get(`/objects/companies/records/${companyId.trim()}`);
      return { exists: true };
    } catch (error: unknown) {
      const responseStatus =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { status?: number } }).response ===
          'object'
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      if (responseStatus === 404) {
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
          message: `Failed to validate company existence: ${
            typeof error === 'object' && error !== null && 'message' in error
              ? String((error as { message?: unknown }).message)
              : 'Unknown API error'
          }`,
          httpStatusCode: HttpStatusCode.BAD_GATEWAY,
        },
      };
    }
  }

  static async validateRecordRelationships(
    resourceType: UniversalResourceType,
    recordData: Record<string, unknown> | null | undefined
  ): Promise<void> {
    if (!recordData || typeof recordData !== 'object') return;
    switch (resourceType) {
      case UniversalResourceType.PEOPLE: {
        const recordDataObj = recordData as Record<string, unknown>;
        const companyField = recordDataObj.company as
          | Record<string, unknown>
          | string
          | undefined;
        const nestedCompanyId =
          typeof companyField === 'object' &&
          companyField !== null &&
          'id' in companyField
            ? (companyField as Record<string, unknown>).id
            : undefined;
        const companyId =
          recordDataObj.company_id ?? nestedCompanyId ?? companyField;
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
        break;
      }
      case UniversalResourceType.RECORDS:
        // Placeholder for custom record relations validation
        break;
      case UniversalResourceType.TASKS:
        // Placeholder: validate referenced record existence if needed
        break;
      default:
        break;
    }
  }
}
