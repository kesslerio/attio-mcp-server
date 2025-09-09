import type { AttioRecord } from '../../../types/attio.js';
import type { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import type {
  CreateStrategy,
  CreateStrategyParams,
} from './BaseCreateStrategy.js';
import { getCreateService } from '../../create/index.js';
import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../../../handlers/tool-configs/universal/schemas.js';
import {
  getFormatErrorHelp,
  convertAttributeFormats,
} from '../../../utils/attribute-format-helpers.js';
import { enhanceUniquenessError } from '../../../handlers/tool-configs/universal/field-mapper/validators/uniqueness-validator.js';

export class CompanyCreateStrategy implements CreateStrategy<AttioRecord> {
  async create(params: CreateStrategyParams): Promise<AttioRecord> {
    const { values, resourceType } = params;
    try {
      // Apply format conversions like monolith for test parity
      const corrected = convertAttributeFormats('companies', values);
      const service = getCreateService();
      const result = (await service.createCompany(
        corrected
      )) as unknown as AttioRecord | null;
      if (!result) {
        throw new UniversalValidationError(
          'Company creation failed: createCompany returned null/undefined',
          ErrorType.API_ERROR,
          { field: 'result' }
        );
      }
      // Type guard for expected structure
      const hasRecordId =
        typeof (result as any)?.id?.record_id === 'string' &&
        (result as any).id.record_id.length > 0;
      if (!hasRecordId) {
        throw new UniversalValidationError(
          'Company creation failed: Invalid record structure',
          ErrorType.API_ERROR,
          { field: 'id' }
        );
      }
      return result as AttioRecord;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Cannot find attribute')) {
        const match = msg.match(/slug\/ID "([^"]+)"/);
        if (match && match[1]) {
          const suggestion = getFieldSuggestions(resourceType, match[1]);
          const enhanced = getFormatErrorHelp('companies', match[1], msg);
          throw new UniversalValidationError(enhanced, ErrorType.USER_ERROR, {
            suggestion,
            field: match[1],
          });
        }
      }
      if (msg.includes('uniqueness constraint')) {
        throw new UniversalValidationError(
          'Uniqueness constraint violation for companies',
          ErrorType.USER_ERROR,
          {
            suggestion:
              'Try searching for existing records first or use different unique values',
          }
        );
      }
      throw err;
    }
  }
}
