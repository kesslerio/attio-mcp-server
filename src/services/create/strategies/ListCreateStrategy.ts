import type { AttioRecord } from '../../../types/attio.js';
import type {
  CreateStrategy,
  CreateStrategyParams,
} from './BaseCreateStrategy.js';
import { createList } from '../../../objects/lists.js';
import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../../../handlers/tool-configs/universal/schemas.js';

export class ListCreateStrategy implements CreateStrategy {
  async create(params: CreateStrategyParams): Promise<AttioRecord> {
    const { values, resourceType } = params;
    try {
      const list = await createList(values);
      const listData = list as Record<string, unknown>;
      const listId = listData.id as Record<string, unknown>;

      return {
        id: {
          record_id: listId.list_id as string,
          list_id: listId.list_id as string,
        },
        values: {
          name: (listData.name || listData.title) as string,
          description: listData.description as string,
          parent_object: (listData.object_slug ||
            listData.parent_object) as string,
          api_slug: listData.api_slug as string,
          workspace_id: listData.workspace_id as string,
          workspace_member_access: listData.workspace_member_access as string,
          created_at: listData.created_at as string,
        },
      } as unknown as AttioRecord;
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
