import type { AttioRecord } from '../../../types/attio.js';
import type { PersonAttributes } from '../../../objects/people/types.js';
import { updatePerson } from '../../../objects/people-write.js';
import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';
import { UniversalValidationError, ErrorType } from '../../../handlers/tool-configs/universal/schemas.js';
import type { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import type { UpdateStrategy } from './BaseUpdateStrategy.js';
import { ValidationService } from '../../ValidationService.js';

/**
 * PersonUpdateStrategy - Handles updates for People (with email validation)
 */
export class PersonUpdateStrategy implements UpdateStrategy {
  async update(
    recordId: string,
    values: Record<string, unknown>,
    resourceType: UniversalResourceType
  ): Promise<AttioRecord> {
    try {
      // Validate emails same as create operations
      ValidationService.validateEmailAddresses(values);
      // Coerce mapped/validated values to PersonAttributes for update
      return (await updatePerson(
        recordId,
        values as unknown as PersonAttributes
      )) as unknown as AttioRecord;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Cannot find attribute')) {
        const match = errorMessage.match(/slug\/ID "([^"]+)"/);
        if (match && match[1]) {
          const suggestion = getFieldSuggestions(resourceType, match[1]);
          throw new UniversalValidationError(errorMessage, ErrorType.USER_ERROR, {
            suggestion,
            field: match[1],
          });
        }
      }
      throw err;
    }
  }
}
