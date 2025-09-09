import type { AttioRecord } from '../../../types/attio.js';
import { updateCompany } from '../../../objects/companies/index.js';
import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../../../handlers/tool-configs/universal/schemas.js';
import type { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import type { UpdateStrategy } from './BaseUpdateStrategy.js';

/**
 * CompanyUpdateStrategy - Handles updates for Companies
 */
export class CompanyUpdateStrategy implements UpdateStrategy {
  async update(
    recordId: string,
    values: Record<string, unknown>,
    resourceType: UniversalResourceType
  ): Promise<AttioRecord> {
    try {
      // Extract values from Attio envelope for legacy updateCompany function
      return (await updateCompany(recordId, values)) as unknown as AttioRecord;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Cannot find attribute')) {
        const match = errorMessage.match(/slug\/ID "([^"]+)"/);
        if (match && match[1]) {
          const suggestion = getFieldSuggestions(resourceType, match[1]);
          throw new UniversalValidationError(
            errorMessage,
            ErrorType.USER_ERROR,
            {
              suggestion,
              field: match[1],
            }
          );
        }
      }
      throw err;
    }
  }
}
