import type { AttioRecord } from '../../../types/attio.js';
import type { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
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
      return {
        id: {
          record_id: (list as any).id.list_id,
          list_id: (list as any).id.list_id,
        },
        values: {
          name: (list as any).name || (list as any).title,
          description: (list as any).description,
          parent_object:
            (list as any).object_slug || (list as any).parent_object,
          api_slug: (list as any).api_slug,
          workspace_id: (list as any).workspace_id,
          workspace_member_access: (list as any).workspace_member_access,
          created_at: (list as any).created_at,
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
