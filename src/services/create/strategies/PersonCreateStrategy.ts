import type { AttioRecord } from '../../../types/attio.js';
import type {
  CreateStrategy,
  CreateStrategyParams,
} from './BaseCreateStrategy.js';
import { getCreateService } from '../../create/index.js';
import { ValidationService } from '../../ValidationService.js';
import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../../../handlers/tool-configs/universal/schemas.js';
import type { PersonCreateAttributes } from '../../../types/attio.js';
import { PeopleDataNormalizer } from '../../../utils/normalization/people-normalization.js';
import { convertAttributeFormats } from '../../../utils/attribute-format-helpers.js';

export class PersonCreateStrategy implements CreateStrategy<AttioRecord> {
  async create(params: CreateStrategyParams): Promise<AttioRecord> {
    const { values, resourceType } = params;
    // Ensure email format is valid and normalized (parity with existing behavior)
    ValidationService.validateEmailAddresses(values);
    try {
      // Normalize company field to string if an object was mapped
      const castValues = { ...(values as Record<string, unknown>) };
      const comp = castValues.company as unknown;
      if (comp && typeof comp === 'object') {
        const rid = (comp as Record<string, unknown>).record_id as
          | string
          | undefined;
        if (typeof rid === 'string') castValues.company = rid;
        else delete castValues.company;
      }
      // Normalize then convert formats to align with monolith behavior
      PeopleDataNormalizer.normalizePeopleData(castValues);
      const formatted = convertAttributeFormats('people', castValues);
      const service = getCreateService();
      return (await service.createPerson(
        formatted as unknown as PersonCreateAttributes
      )) as unknown as AttioRecord;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Cannot find attribute')) {
        const match = msg.match(/slug\/ID "([^"]+)"/);
        if (match && match[1]) {
          const suggestion = getFieldSuggestions(resourceType, match[1]);
          throw new UniversalValidationError(msg, ErrorType.USER_ERROR, {
            suggestion,
            field: match[1],
          });
        }
      }
      if (msg.includes('uniqueness constraint')) {
        throw new UniversalValidationError(
          'Uniqueness constraint violation for people',
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
