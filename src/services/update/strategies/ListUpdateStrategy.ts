import { getFieldSuggestions } from '@/handlers/tool-configs/universal/field-mapper.js';
import {
  UniversalValidationError,
  ErrorType,
} from '@/handlers/tool-configs/universal/schemas.js';
import type { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { updateList } from '@/objects/lists.js';
import type { AttioList } from '@/types/attio.js';
import type { UpdateStrategy } from '@/services/update/strategies/BaseUpdateStrategy.js';

/**
 * ListUpdateStrategy - Handles updates for Attio Lists
 *
 * Extracted from UniversalUpdateService.updateListRecord to reduce monolith size
 * and isolate resource-specific behavior.
 */
export class ListUpdateStrategy implements UpdateStrategy {
  async update(
    recordId: string,
    values: Record<string, unknown>,
    resourceType: UniversalResourceType
  ): Promise<AttioList> {
    try {
      const list = await updateList(recordId, values);
      return {
        ...list,
        id: {
          ...list.id,
          list_id: list.id.list_id,
        },
        name: list.name || list.title,
      };
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
