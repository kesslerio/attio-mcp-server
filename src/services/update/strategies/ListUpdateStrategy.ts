import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';
import { UniversalValidationError, ErrorType } from '../../../handlers/tool-configs/universal/schemas.js';
import { updateList } from '../../../objects/lists.js';
import type { AttioRecord } from '../../../types/attio.js';
import type { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import type { UpdateStrategy } from './BaseUpdateStrategy.js';

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
  ): Promise<AttioRecord> {
    try {
      const list = await updateList(recordId, values);
      // Convert AttioList to AttioRecord format for consistency with callers
      return {
        id: {
          record_id: list.id.list_id,
          list_id: list.id.list_id,
        },
        values: {
          name: (list as any).name || (list as any).title,
          description: (list as any).description,
          parent_object: (list as any).object_slug || (list as any).parent_object,
          api_slug: (list as any).api_slug,
          workspace_id: (list as any).workspace_id,
          workspace_member_access: (list as any).workspace_member_access,
          created_at: (list as any).created_at,
        },
      } as unknown as AttioRecord;
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
