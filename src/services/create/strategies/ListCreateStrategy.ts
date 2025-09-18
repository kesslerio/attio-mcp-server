import type { AttioRecord } from '../../../types/attio.js';
import type {
  CreateStrategy,
  CreateStrategyParams,
} from './BaseCreateStrategy.js';

interface ListCreateResponse {
  id: {
    list_id: string;
  };
  name?: string;
  title?: string;
  description?: string;
  object_slug?: string;
  parent_object?: string;
  api_slug?: string;
  workspace_id?: string;
  workspace_member_access?: string;
  created_at?: string;
}
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
      const list = (await createList(values)) as ListCreateResponse;
      return {
        id: {
          record_id: list.id.list_id,
          list_id: list.id.list_id,
        },
        values: {
          name: list.name || list.title,
          description: list.description,
          parent_object: list.object_slug || list.parent_object,
          api_slug: list.api_slug,
          workspace_id: list.workspace_id,
          workspace_member_access: list.workspace_member_access,
          created_at: list.created_at,
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
