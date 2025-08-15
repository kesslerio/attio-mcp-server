/**
 * UniversalUpdateService - Centralized record update operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal update functionality across all resource types.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import type { UniversalUpdateParams } from '../handlers/tool-configs/universal/types.js';
import { AttioRecord, AttioTask } from '../types/attio.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../handlers/tool-configs/universal/schemas.js';

// Import services
import { ValidationService } from './ValidationService.js';
import { UniversalUtilityService } from './UniversalUtilityService.js';

// Import field mapping utilities
import {
  mapRecordFields,
  validateResourceType,
  getFieldSuggestions,
  validateFields,
  getValidResourceTypes,
} from '../handlers/tool-configs/universal/field-mapper.js';

// Import validation utilities
import { validateRecordFields } from '../utils/validation-utils.js';

// Import deal defaults configuration
import { applyDealDefaultsWithValidation } from '../config/deal-defaults.js';

// Import resource-specific update functions
import { updateCompany } from '../objects/companies/index.js';
import { updateList } from '../objects/lists.js';
import { updatePerson } from '../objects/people-write.js';
import { updateObjectRecord } from '../objects/records/index.js';

/**
 * Helper function to check if we should use mock data based on environment
 */
function shouldUseMockData(): boolean {
  // Only activate for E2E tests and specific performance tests
  // Unit tests use vi.mock() and should not be interfered with
  return (
    process.env.E2E_MODE === 'true' ||
    process.env.USE_MOCK_DATA === 'true' ||
    process.env.OFFLINE_MODE === 'true' ||
    process.env.PERFORMANCE_TEST === 'true'
  );
}

/**
 * Task update with mock support - uses production MockService
 * Moved to production-side service to avoid test directory imports (Issue #489 Phase 1)
 */
async function updateTaskWithMockSupport(
  taskId: string,
  updateData: Record<string, unknown>
): Promise<AttioRecord> {
  // Delegate to production MockService to avoid TypeScript build errors
  const { MockService } = await import('./MockService.js');
  return await MockService.updateTask(taskId, updateData);
}

/**
 * UniversalUpdateService provides centralized record update functionality
 */
export class UniversalUpdateService {
  /**
   * Update a record across any supported resource type
   *
   * @param params - Update operation parameters
   * @returns Promise resolving to updated AttioRecord
   */
  static async updateRecord(
    params: UniversalUpdateParams
  ): Promise<AttioRecord> {
    const { resource_type, record_id, record_data } = params;

    // Pre-validate fields and provide helpful suggestions (less strict for updates)
    const fieldValidation = validateFields(
      resource_type,
      record_data.values || record_data
    );
    if (fieldValidation.warnings.length > 0) {
      console.log(
        'Field validation warnings:',
        fieldValidation.warnings.join('\n')
      );
    }
    if (fieldValidation.suggestions.length > 0) {
      const truncated = ValidationService.truncateSuggestions(
        fieldValidation.suggestions
      );
      console.log('Field suggestions:', truncated.join('\n'));
    }

    // Map field names to correct ones with collision detection
    const mappingResult = mapRecordFields(
      resource_type,
      record_data.values || record_data
    );
    if (mappingResult.errors && mappingResult.errors.length > 0) {
      throw new UniversalValidationError(
        mappingResult.errors.join(' '),
        ErrorType.USER_ERROR,
        {
          field: 'record_data',
          suggestion:
            'Please use only one field for each target. Multiple aliases mapping to the same field are not allowed.',
        }
      );
    }

    const { mapped: mappedData, warnings } = mappingResult;
    if (warnings.length > 0) {
      console.log('Field mapping applied:', warnings.join('\n'));
    }

    // TODO: Enhanced validation for Issue #413 - disabled for tasks compatibility
    // Will be re-enabled after tasks API validation is properly configured
    if (process.env.ENABLE_ENHANCED_VALIDATION === 'true') {
      const validation = await validateRecordFields(
        resource_type,
        mappedData as Record<string, unknown>,
        false
      );
      if (!validation.isValid) {
        const errorMessage = validation.error || 'Validation failed';
        throw new UniversalValidationError(errorMessage, ErrorType.USER_ERROR, {
          suggestion: 'Please fix the validation errors and try again.',
          field: undefined,
        });
      }
    }

    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
        return this.updateCompanyRecord(record_id, mappedData, resource_type);

      case UniversalResourceType.LISTS:
        return this.updateListRecord(record_id, mappedData, resource_type);

      case UniversalResourceType.PEOPLE:
        return this.updatePersonRecord(record_id, mappedData, resource_type);

      case UniversalResourceType.RECORDS:
        return updateObjectRecord('records', record_id, mappedData);

      case UniversalResourceType.DEALS:
        return this.updateDealRecord(record_id, mappedData);

      case UniversalResourceType.TASKS:
        return this.updateTaskRecord(record_id, mappedData);

      default:
        return this.handleUnsupportedResourceType(resource_type, params);
    }
  }

  /**
   * Update a company record with error handling
   */
  private static async updateCompanyRecord(
    record_id: string,
    mappedData: Record<string, unknown>,
    resource_type: UniversalResourceType
  ): Promise<AttioRecord> {
    try {
      return await updateCompany(record_id, mappedData);
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown>;
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(errorObj?.message || '');
      if (errorMessage.includes('Cannot find attribute')) {
        const match = errorMessage.match(/slug\/ID "([^"]+)"/);
        if (match && match[1]) {
          const suggestion = getFieldSuggestions(resource_type, match[1]);
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

  /**
   * Update a list record with error handling and format conversion
   */
  private static async updateListRecord(
    record_id: string,
    mappedData: Record<string, unknown>,
    resource_type: UniversalResourceType
  ): Promise<AttioRecord> {
    try {
      const list = await updateList(record_id, mappedData);
      // Convert AttioList to AttioRecord format
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
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(errorObj?.message || '');
      if (errorMessage.includes('Cannot find attribute')) {
        const match = errorMessage.match(/slug\/ID "([^"]+)"/);
        if (match && match[1]) {
          const suggestion = getFieldSuggestions(resource_type, match[1]);
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

  /**
   * Update a person record with email validation and error handling
   */
  private static async updatePersonRecord(
    record_id: string,
    mappedData: Record<string, unknown>,
    resource_type: UniversalResourceType
  ): Promise<AttioRecord> {
    try {
      // Validate email addresses for consistency with create operations
      ValidationService.validateEmailAddresses(mappedData);

      return await updatePerson(record_id, mappedData as any);
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown>;
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(errorObj?.message || '');
      if (errorMessage.includes('Cannot find attribute')) {
        const match = errorMessage.match(/slug\/ID "([^"]+)"/);
        if (match && match[1]) {
          const suggestion = getFieldSuggestions(resource_type, match[1]);
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

  /**
   * Update a deal record with defaults validation
   */
  private static async updateDealRecord(
    record_id: string,
    mappedData: Record<string, unknown>
  ): Promise<AttioRecord> {
    // Note: Updates are less likely to fail, but we still validate stages proactively
    const updatedDealData = await applyDealDefaultsWithValidation(
      mappedData,
      false
    );
    return updateObjectRecord('deals', record_id, updatedDealData);
  }

  /**
   * Update a task record with field transformation and mock support
   */
  private static async updateTaskRecord(
    record_id: string,
    mappedData: Record<string, unknown>
  ): Promise<AttioRecord> {
    // Transform mapped fields for task update
    // The field mapper has already transformed field names to API names
    // Now we need to adapt them for the updateTask function
    const taskUpdateData: Record<string, unknown> = {};

    // Handle content field if present
    if (mappedData.content !== undefined) {
      taskUpdateData.content = mappedData.content;
    }

    // Handle status field
    if (mappedData.is_completed !== undefined) {
      taskUpdateData.status = mappedData.is_completed ? 'completed' : 'pending';
    } else if (mappedData.status !== undefined) {
      taskUpdateData.status = mappedData.status;
    }

    // Handle assignee field
    if (mappedData.assignees !== undefined) {
      taskUpdateData.assigneeId = mappedData.assignees;
    } else if (mappedData.assignee_id !== undefined) {
      taskUpdateData.assigneeId = mappedData.assignee_id;
    } else if (mappedData.assigneeId !== undefined) {
      taskUpdateData.assigneeId = mappedData.assigneeId;
    }

    // Handle due date field
    if (mappedData.deadline_at !== undefined) {
      taskUpdateData.dueDate = mappedData.deadline_at;
    } else if (mappedData.due_date !== undefined) {
      taskUpdateData.dueDate = mappedData.due_date;
    } else if (mappedData.dueDate !== undefined) {
      taskUpdateData.dueDate = mappedData.dueDate;
    }

    // Handle linked records field
    if (mappedData.linked_records !== undefined) {
      // Extract record IDs from linked_records array structure
      if (Array.isArray(mappedData.linked_records)) {
        taskUpdateData.recordIds = mappedData.linked_records.map(
          (link: Record<string, unknown>) => link.record_id || link.id || link
        );
      } else {
        taskUpdateData.recordIds = [mappedData.linked_records];
      }
    } else if (mappedData.record_id !== undefined) {
      taskUpdateData.recordIds = [mappedData.record_id];
    }

    // Use mock-enabled task update for test environments
    const updatedTask = await updateTaskWithMockSupport(
      record_id,
      taskUpdateData
    );
    // Convert AttioTask to AttioRecord using proper type conversion
    // Mock functions already return AttioRecord, so handle both cases
    return shouldUseMockData()
      ? updatedTask // Already an AttioRecord from mock
      : UniversalUtilityService.convertTaskToRecord(
          updatedTask as unknown as AttioTask
        );
  }

  /**
   * Handle unsupported resource types with correction attempts
   */
  private static async handleUnsupportedResourceType(
    resource_type: string,
    params: UniversalUpdateParams
  ): Promise<AttioRecord> {
    // Check if resource type can be corrected
    const resourceValidation = validateResourceType(resource_type);
    if (resourceValidation.corrected) {
      // Retry with corrected resource type
      console.log(
        `Resource type corrected from "${resource_type}" to "${resourceValidation.corrected}"`
      );
      return this.updateRecord({
        ...params,
        resource_type: resourceValidation.corrected,
      });
    }
    throw new UniversalValidationError(
      `Unsupported resource type: ${resource_type}`,
      ErrorType.USER_ERROR,
      {
        suggestion:
          resourceValidation.suggestion ||
          `Valid resource types are: ${getValidResourceTypes()}`,
      }
    );
  }
}
