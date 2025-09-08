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
      const l = list as unknown as Record<string, unknown>;
      const lid = (l.id as Record<string, unknown>) || {};
      return {
        id: {
          record_id: lid.list_id as string,
          list_id: lid.list_id as string,
        },
        values: {
          name: (l.name as string) || (l.title as string),
          description: l.description as string,
          parent_object: (l.object_slug as string) || (l.parent_object as string),
          api_slug: l.api_slug as string,
          workspace_id: l.workspace_id as string,
          workspace_member_access: l.workspace_member_access as string,
          created_at: l.created_at as string,
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
