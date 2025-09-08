import { UniversalResourceType } from '../types.js';

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
      const { getAttioClient } = await import(
        '../../../../api/attio-client.js'
      );
      await client.get(`/objects/companies/records/${companyId.trim()}`);
      return { exists: true };
    } catch (error: unknown) {
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

  static async validateRecordRelationships(
    resourceType: UniversalResourceType,
    recordData: any
  ): Promise<void> {
    if (!recordData || typeof recordData !== 'object') return;
    switch (resourceType) {
      case UniversalResourceType.PEOPLE: {
          recordData.company_id || recordData.company?.id || recordData.company;
        if (companyId) {
            await this.validateCompanyExists(companyIdString);
          if (!validationResult.exists) {
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
