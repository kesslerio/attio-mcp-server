import type { AttioList } from '@/types/attio.js';
import type {
  CreateStrategy,
  CreateStrategyParams,
} from '@/services/create/strategies/BaseCreateStrategy.js';
import { createList } from '@/objects/lists.js';
import { getFieldSuggestions } from '@/handlers/tool-configs/universal/field-mapper.js';
import {
  UniversalValidationError,
  ErrorType,
} from '@/handlers/tool-configs/universal/errors/validation-errors.js';
import { ListConfigurationValidator } from '@/services/lists/ListConfigurationValidator.js';

export class ListCreateStrategy implements CreateStrategy {
  async create(params: CreateStrategyParams): Promise<AttioList> {
    const { values, resourceType } = params;

    // Shared access policy (Issue #1148): full-access default when neither
    // field is provided (R3) -> 'null' sentinel normalization (R2) -> shape
    // + create-time invariant. Input is never mutated (working copy).
    const createValues = ListConfigurationValidator.applyAccessDefaults(
      { ...values },
      { surface: 'create' }
    );

    // Validate parent_object against workspace objects (Issue #1195)
    if (
      createValues.parent_object &&
      typeof createValues.parent_object === 'string'
    ) {
      await ListConfigurationValidator.validateParentObject(
        createValues.parent_object as string
      );
    }

    try {
      const list = await createList(createValues);
      return list;
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
      throw err;
    }
  }
}
