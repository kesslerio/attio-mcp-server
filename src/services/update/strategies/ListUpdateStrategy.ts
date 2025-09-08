/**
 * ListUpdateStrategy - Handles list-specific update logic
 * 
 * Extracted from UniversalUpdateService list update logic
 * Handles list updates and format conversion
 */

import { BaseUpdateStrategy, UpdateStrategyParams, UpdateStrategyResult } from './BaseUpdateStrategy.js';
import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../../types/attio.js';
import { updateList } from '../../../objects/lists.js';
import { getListDetails } from '../../../objects/lists.js';
import { UniversalValidationError, ErrorType } from '../../../handlers/tool-configs/universal/schemas.js';
import { getFieldSuggestions } from '../../../handlers/tool-configs/universal/field-mapper.js';
import { debug } from '../../../utils/logger.js';

export class ListUpdateStrategy extends BaseUpdateStrategy {
  constructor() {
    super(UniversalResourceType.LISTS);
  }

  async update(params: UpdateStrategyParams): Promise<UpdateStrategyResult> {
    const { record_id, mapped_data, persist_unlisted_fields } = params;
    
    // Fetch existing list if field persistence is needed
    const existingList = persist_unlisted_fields 
      ? await this.fetchExistingRecord(record_id)
      : null;
    
    // Validate update permissions
    await this.validateUpdatePermissions(record_id, mapped_data);
    
    // Format data for API with list-specific logic
    const listData = this.formatForAPI(mapped_data, existingList);
    
    // Merge with existing fields if needed
    const finalData = await this.mergeWithExistingFields(
      listData,
      existingList,
      persist_unlisted_fields || false
    );
    
    // Execute update with format conversion
    const updatedList = await this.updateListWithErrorHandling(record_id, finalData);

    debug('List updated successfully', {
      list_id: record_id,
      updated_fields: Object.keys(finalData)
    });

    return {
      record: updatedList,
      metadata: {
        updated_fields: this.identifyUpdatedFields(
          existingList || {},
          updatedList
        )
      }
    };
  }

  protected async fetchExistingRecord(record_id: string): Promise<AttioRecord | null> {
    try {
      return await getListDetails(record_id);
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  protected async validateUpdatePermissions(
    record_id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // Lists don't have special permission requirements beyond existence
    // The API call will handle existence validation
  }

  protected formatForAPI(
    data: Record<string, unknown>,
    existingRecord?: AttioRecord | null
  ): Record<string, unknown> {
    const formatted = { ...data };
    
    // Handle name field normalization
    if (formatted.name && typeof formatted.name === 'string') {
      formatted.name = formatted.name.trim();
    }
    
    // Handle title field (alternative to name)
    if (formatted.title && typeof formatted.title === 'string') {
      formatted.title = formatted.title.trim();
      // Use title as name if name is not provided
      if (!formatted.name) {
        formatted.name = formatted.title;
      }
    }
    
    // Handle description field
    if (formatted.description && typeof formatted.description === 'string') {
      formatted.description = formatted.description.trim();
    }
    
    // Handle API slug normalization
    if (formatted.api_slug && typeof formatted.api_slug === 'string') {
      // Convert to lowercase and replace spaces with underscores
      formatted.api_slug = formatted.api_slug
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    }
    
    return formatted;
  }

  /**
   * Update list with enhanced error handling and format conversion
   */
  private async updateListWithErrorHandling(
    record_id: string,
    data: Record<string, unknown>
  ): Promise<AttioRecord> {
    try {
      const list = await updateList(record_id, data);
      
      // Convert AttioList to AttioRecord format (from original updateListRecord)
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
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown>;
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(errorObj?.message || '');
      
      // Handle field not found errors with suggestions
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
      
      // Handle list name uniqueness errors
      if (errorMessage.includes('name') && errorMessage.includes('already exists')) {
        throw new UniversalValidationError(
          'A list with this name already exists',
          ErrorType.USER_ERROR,
          { field: 'name' }
        );
      }
      
      // Handle API slug uniqueness errors
      if (errorMessage.includes('api_slug') && errorMessage.includes('already exists')) {
        throw new UniversalValidationError(
          'A list with this API slug already exists',
          ErrorType.USER_ERROR,
          { field: 'api_slug' }
        );
      }
      
      throw error;
    }
  }
}