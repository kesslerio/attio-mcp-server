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

    // Apply the full-access default when neither access field is provided (R3)
    const createValues: Record<string, unknown> = { ...values };
    ListConfigurationValidator.normalizeWorkspaceAccess(createValues);
    if (
      createValues.workspace_access === undefined &&
      createValues.workspace_member_access === undefined
    ) {
      createValues.workspace_access = 'full-access';
    }

    // Validate parent_object against workspace objects (Issue #1195)
    if (
      createValues.parent_object &&
      typeof createValues.parent_object === 'string'
    ) {
      await ListConfigurationValidator.validateParentObject(
        createValues.parent_object as string
      );
    }

    // Validate access-control fields (Issue #1148) — enforce create-time invariant
    ListConfigurationValidator.validateAccessControls(createValues, {
      enforceFullAccessInvariant: true,
    });

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
