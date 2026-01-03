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
} from '@/handlers/tool-configs/universal/schemas.js';

export class ListCreateStrategy implements CreateStrategy {
  async create(params: CreateStrategyParams): Promise<AttioList> {
    const { values, resourceType } = params;
    try {
      const list = await createList(values);
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
