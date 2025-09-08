/**
 * ListCreateStrategy - Handles list-specific creation logic
 *
 * Extracted from UniversalCreateService.createListRecord (lines 866-907)
 */

import {
  BaseCreateStrategy,
  CreateStrategyParams,
  CreateStrategyResult,
} from './BaseCreateStrategy.js';
import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import { createList } from '../../../objects/lists.js';
import { AttioRecord } from '../../../types/attio.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../../../handlers/tool-configs/universal/schemas.js';
import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';

export class ListCreateStrategy extends BaseCreateStrategy {
  constructor() {
    super(UniversalResourceType.LISTS);
  }

  async create(params: CreateStrategyParams): Promise<CreateStrategyResult> {
    const { mapped_data } = params;

    try {
      const list = await createList(mapped_data);

      // Convert AttioList to AttioRecord format
      const record = {
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

      return {
        record,
        metadata: {
          warnings: this.collectWarnings(mapped_data),
        },
      };
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown>;
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(errorObj?.message || '');

      if (errorMessage.includes('Cannot find attribute')) {
        const match = errorMessage.match(/slug\/ID "([^"]+)"/);
        if (match && match[1]) {
          const suggestion = getFieldSuggestions(this.resource_type, match[1]);
          throw new UniversalValidationError(
            (error as Error).message,
            ErrorType.USER_ERROR,
            { suggestion, field: match[1] }
          );
        }
      }
      throw error;
    }
  }

  protected validateResourceData(data: Record<string, unknown>): void {
    // List validation is handled by the createList function
    // No specific field requirements for list creation
  }

  protected formatForAPI(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    // List formatting is handled by the createList function
    return data;
  }

  private collectWarnings(data: Record<string, unknown>): string[] {
    const warnings: string[] = [];

    if (!data.name && !data.title) {
      warnings.push(
        'List created without a name or title - consider adding one for better identification'
      );
    }

    return warnings;
  }
}
