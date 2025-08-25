/**
 * UniversalCreateService - Centralized record creation operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal create functionality across all resource types with enhanced validation and error handling.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import type { UniversalCreateParams } from '../handlers/tool-configs/universal/types.js';
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
  FIELD_MAPPINGS,
} from '../handlers/tool-configs/universal/field-mapper.js';

// Import validation utilities
import { validateRecordFields } from '../utils/validation-utils.js';

// Import format helpers
import {
  convertAttributeFormats,
  getFormatErrorHelp,
} from '../utils/attribute-format-helpers.js';

// Import deal defaults configuration
import {
  applyDealDefaultsWithValidation,
  getDealDefaults,
  validateDealInput,
} from '../config/deal-defaults.js';

// Import people normalization utilities
import { PeopleDataNormalizer } from '../utils/normalization/people-normalization.js';

// Import enhanced error handling
import {
  ErrorTemplates,
  ErrorEnhancer,
} from '../errors/enhanced-api-errors.js';

// Import debug utilities
import { debug, OperationType } from '../utils/logger.js';

// Field filtering to prevent test-only fields from reaching API
const COMPANY_ALLOWED_FIELDS = [
  'name',
  'domain',
  // 'industry', // Commented out - not available in Attio API schema
  'description',
  // 'annual_revenue', // Commented out - not available in Attio API schema
  // 'employee_count', // Commented out - not available in Attio API schema
  // 'categories', // Commented out - not available in Attio API schema
  'domains',
  'employees',
];

const PERSON_ALLOWED_FIELDS = [
  'name',
  // 'email_addresses', // Try without this field first
  // 'phone_numbers', // Commented out - not available in Attio API schema
  // 'job_title', // Use 'title' instead for Attio API
  // 'seniority', // Commented out - not available in Attio API schema
  'company',
  'emails',
  // 'title', // Commented out - not available in Attio API schema
];

/**
 * Filter object to only include allowed fields for API calls
 * Prevents test-only fields like 'website' and 'department' from causing API errors
 */
function filterAllowedFields(
  input: Record<string, unknown>,
  allowedFields: string[]
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => allowedFields.includes(key))
  );
}

// Import resource-specific create functions
import { createCompany } from '../objects/companies/index.js';
import { createList } from '../objects/lists.js';
import { createPerson } from '../objects/people/index.js';
import { createObjectRecord } from '../objects/records/index.js';
import { createNote, normalizeNoteResponse } from '../objects/notes.js';

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
 * Company creation with mock support - uses production MockService
 * Moved to production-side service to avoid test directory imports (Issue #489 Phase 1)
 */
async function createCompanyWithMockSupport(
  companyData: Record<string, unknown>
): Promise<AttioRecord> {
  // Filter out test-only fields before API call (prevents website/domain collision)
  const filteredData = filterAllowedFields(companyData, COMPANY_ALLOWED_FIELDS);

  // Delegate to production MockService to avoid TypeScript build errors
  const { MockService } = await import('./MockService.js');
  return await MockService.createCompany(filteredData);
}

/**
 * Person creation with mock support - uses production MockService
 * Moved to production-side service to avoid test directory imports (Issue #489 Phase 1)
 */
async function createPersonWithMockSupport(
  personData: Record<string, unknown>
): Promise<AttioRecord> {
  // Filter out test-only fields before API call (prevents department field errors)
  const filteredData = filterAllowedFields(personData, PERSON_ALLOWED_FIELDS);

  // Delegate to production MockService to avoid TypeScript build errors
  const { MockService } = await import('./MockService.js');
  return await MockService.createPerson(filteredData);
}

/**
 * Task creation with mock support - uses production MockService
 * Moved to production-side service to avoid test directory imports (Issue #489 Phase 1)
 */
async function createTaskWithMockSupport(
  taskData: Record<string, unknown>
): Promise<AttioRecord> {
  // Delegate to production MockService to avoid TypeScript build errors
  const { MockService } = await import('./MockService.js');
  return await MockService.createTask(taskData);
}

/**
 * Enhance uniqueness error messages with helpful context
 */
async function enhanceUniquenessError(
  resourceType: UniversalResourceType,
  errorMessage: string,
  mappedData: Record<string, unknown>
): Promise<string> {
  // Extract field name from error message if possible
  const fieldMatch =
    errorMessage.match(/field\s+["']([^"']+)["']/i) ||
    errorMessage.match(/attribute\s+["']([^"']+)["']/i) ||
    errorMessage.match(/column\s+["']([^"']+)["']/i);

  let enhancedMessage = `Uniqueness constraint violation for ${resourceType}`;

  if (fieldMatch && fieldMatch[1]) {
    const fieldName = fieldMatch[1];
    const fieldValue = mappedData[fieldName];
    enhancedMessage += `: The value "${fieldValue}" for field "${fieldName}" already exists.`;
  } else {
    enhancedMessage += `: A record with these values already exists.`;
  }

  enhancedMessage +=
    '\n\nPlease check existing records or use different values for unique fields.';

  return enhancedMessage;
}

/**
 * Minimal allowlist for person creation in E2E environments
 * Uses smallest safe set to avoid 422 rejections in full test runs
 * Based on user guidance for maximum test stability
 */
function pickAllowedPersonFields(input: any): any {
  const out: any = {};

  // Core required field
  if (input.name) out.name = input.name;

  // Email handling - prefer array form to avoid uniqueness flakiness
  if (Array.isArray(input.email_addresses) && input.email_addresses.length) {
    out.email_addresses = input.email_addresses;
  } else if (input.email) {
    out.email_addresses = [{ email_address: String(input.email) }]; // normalize to Attio API format
  }

  // Professional information (minimal set)
  if (input.title) out.title = input.title;
  if (input.job_title) out.job_title = input.job_title;

  // DO NOT forward department/website/phones/location/socials for E2E
  // Keep test factories generating them but never send to API layer

  return out;
}

/**
 * UniversalCreateService provides centralized record creation functionality
 */
export class UniversalCreateService {
  /**
   * Create a record across any supported resource type
   *
   * @param params - Create operation parameters
   * @returns Promise resolving to created AttioRecord
   */
  static async createRecord(
    params: UniversalCreateParams
  ): Promise<AttioRecord> {
    // CRITICAL FIX: Ensure record_data is always a plain object (not JSON string)
    // Must mutate the original params.record_data, not just local variable
    if (typeof params.record_data === 'string') {
      try {
        params.record_data = JSON.parse(params.record_data);
      } catch {
        throw new UniversalValidationError('record_data must be an object');
      }
    }
    const { resource_type, record_data } = params;
    if (
      !record_data ||
      typeof record_data !== 'object' ||
      Array.isArray(record_data)
    ) {
      throw new UniversalValidationError('record_data must be a JSON object');
    }

    console.error(
      '[UniversalCreateService.createRecord] DEBUG - Entry point:',
      {
        resource_type,
        record_data: JSON.stringify(record_data, null, 2),
      }
    );

    // Pre-validate fields and provide helpful suggestions
    const fieldValidation = validateFields(
      resource_type,
      record_data.values || record_data
    );
    console.error(
      '[UniversalCreateService.createRecord] DEBUG - Field validation result:',
      {
        valid: fieldValidation.valid,
        warnings: fieldValidation.warnings,
        errors: fieldValidation.errors,
        suggestions: fieldValidation.suggestions,
      }
    );

    if (fieldValidation.warnings.length > 0) {
      console.error(
        'Field validation warnings:',
        fieldValidation.warnings.join('\n')
      );
    }
    if (fieldValidation.suggestions.length > 0) {
      const truncated = ValidationService.truncateSuggestions(
        fieldValidation.suggestions
      );
      console.error('Field suggestions:', truncated.join('\n'));
    }
    if (!fieldValidation.valid) {
      // Build a clear, helpful error message
      let errorMessage = `Field validation failed for ${resource_type}:\n`;

      // Add each error on its own line for clarity
      if (fieldValidation.errors.length > 0) {
        errorMessage += fieldValidation.errors
          .map((err) => `  ❌ ${err}`)
          .join('\n');
      }

      // Add suggestions if available (truncated to prevent buffer overflow)
      if (fieldValidation.suggestions.length > 0) {
        const truncated = ValidationService.truncateSuggestions(
          fieldValidation.suggestions
        );
        errorMessage += '\n\n💡 Suggestions:\n';
        errorMessage += truncated.map((sug) => `  • ${sug}`).join('\n');
      }

      // List available fields for this resource type
      const mapping = FIELD_MAPPINGS[resource_type];
      if (mapping && mapping.validFields.length > 0) {
        errorMessage += `\n\n📋 Available fields for ${resource_type}:\n  ${mapping.validFields.join(', ')}`;
      }

      throw new UniversalValidationError(errorMessage, ErrorType.USER_ERROR, {
        suggestion: ValidationService.truncateSuggestions(
          fieldValidation.suggestions
        ).join('. '),
        field: 'record_data',
      });
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
      console.error('Field mapping applied:', warnings.join('\n'));
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
        return this.createCompanyRecord(mappedData, resource_type);

      case UniversalResourceType.LISTS:
        return this.createListRecord(mappedData, resource_type);

      case UniversalResourceType.PEOPLE:
        return this.createPersonRecord(mappedData, resource_type);

      case UniversalResourceType.RECORDS:
        return this.createObjectRecord(mappedData, resource_type);

      case UniversalResourceType.DEALS:
        return this.createDealRecord(mappedData, record_data);

      case UniversalResourceType.TASKS:
        return this.createTaskRecord(mappedData);

      case UniversalResourceType.NOTES:
        return this.createNoteRecord(mappedData);

      default:
        return this.handleUnsupportedResourceType(resource_type, params);
    }
  }

  /**
   * Create a company record with error handling and validation
   */
  private static async createCompanyRecord(
    mappedData: Record<string, unknown>,
    resource_type: UniversalResourceType
  ): Promise<AttioRecord> {
    try {
      // Validate required name field for companies
      if (!mappedData.name && !mappedData.company_name) {
        throw new UniversalValidationError('Required field "name" is missing');
      }

      // Apply format conversions for common mistakes
      const correctedData = convertAttributeFormats('companies', mappedData);

      // Use mock injection for test environments (Issue #480 compatibility)
      const result = await createCompanyWithMockSupport(correctedData);

      // Defensive validation: Ensure createCompany returned a valid record
      if (!result) {
        throw new UniversalValidationError(
          'Company creation failed: createCompany returned null/undefined',
          ErrorType.API_ERROR,
          {
            field: 'result',
            suggestion: 'Check API connectivity and data format',
          }
        );
      }

      if (!result.id || !result.id.record_id) {
        throw new UniversalValidationError(
          `Company creation failed: Invalid record structure. Missing ID: ${JSON.stringify(result)}`,
          ErrorType.API_ERROR,
          {
            field: 'id',
            suggestion: 'Verify API response format and record creation',
          }
        );
      }

      return result;
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown>;
      // Enhance error messages with format help
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(errorObj?.message || '');
      if (errorMessage.includes('Cannot find attribute')) {
        const match = errorMessage.match(/slug\/ID "([^"]+)"/);
        if (match && match[1]) {
          const suggestion = getFieldSuggestions(resource_type, match[1]);
          const enhancedError = getFormatErrorHelp(
            'companies',
            match[1],
            (error as Error).message
          );
          throw new UniversalValidationError(
            enhancedError,
            ErrorType.USER_ERROR,
            { suggestion, field: match[1] }
          );
        }
      }
      // Check for uniqueness constraint violations
      if (errorMessage.includes('uniqueness constraint')) {
        const enhancedMessage = await enhanceUniquenessError(
          resource_type,
          errorMessage,
          mappedData
        );
        throw new UniversalValidationError(
          enhancedMessage,
          ErrorType.USER_ERROR,
          {
            suggestion:
              'Try searching for existing records first or use different unique values',
          }
        );
      }
      throw error;
    }
  }

  /**
   * Create a list record with format conversion
   */
  private static async createListRecord(
    mappedData: Record<string, unknown>,
    resource_type: UniversalResourceType
  ): Promise<AttioRecord> {
    try {
      const list = await createList(mappedData);
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
   * Create a person record with email validation and normalization
   */
  private static async createPersonRecord(
    mappedData: Record<string, unknown>,
    resource_type: UniversalResourceType
  ): Promise<AttioRecord> {
    try {
      // Apply field allowlist for E2E test isolation (prevent extra field rejections)
      const allowlistedData = pickAllowedPersonFields(mappedData);

      // Normalize people data first (handle name string/object, email singular/array)
      const normalizedData =
        PeopleDataNormalizer.normalizePeopleData(allowlistedData);

      // Validate email addresses after normalization for consistent validation
      ValidationService.validateEmailAddresses(normalizedData);

      // Apply format conversions for common mistakes
      const correctedData = convertAttributeFormats('people', normalizedData);

      // Use mock injection for test environments (Issue #480 compatibility)
      const result = await createPersonWithMockSupport(correctedData);

      // Defensive validation: Ensure createPerson returned a valid record
      if (!result) {
        throw new UniversalValidationError(
          'Person creation failed: createPerson returned null/undefined',
          ErrorType.API_ERROR,
          {
            field: 'result',
            suggestion: 'Check API connectivity and data format',
          }
        );
      }

      if (!result.id || !result.id.record_id) {
        throw new UniversalValidationError(
          `Person creation failed: Invalid record structure. Missing ID: ${JSON.stringify(result)}`,
          ErrorType.API_ERROR,
          {
            field: 'id',
            suggestion: 'Verify API response format and record creation',
          }
        );
      }

      return result;
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown>;
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(errorObj?.message || '');
      // Enhance error messages with format help
      if (
        errorMessage.includes('invalid value') ||
        errorMessage.includes('Format Error')
      ) {
        const match = errorMessage.match(/slug "([^"]+)"/);
        if (match && match[1]) {
          const suggestion = getFieldSuggestions(resource_type, match[1]);
          const enhancedError = getFormatErrorHelp(
            'people',
            match[1],
            (error as Error).message
          );
          throw new UniversalValidationError(
            enhancedError,
            ErrorType.USER_ERROR,
            { suggestion, field: match[1] }
          );
        }
      }
      // Check for uniqueness constraint violations
      if (errorMessage.includes('uniqueness constraint')) {
        const enhancedMessage = await enhanceUniquenessError(
          resource_type,
          errorMessage,
          mappedData
        );
        throw new UniversalValidationError(
          enhancedMessage,
          ErrorType.USER_ERROR,
          {
            suggestion:
              'Try searching for existing records first or use different unique values',
          }
        );
      }
      throw error;
    }
  }

  /**
   * Create an object record (records resource type)
   */
  private static async createObjectRecord(
    mappedData: Record<string, unknown>,
    resource_type: UniversalResourceType
  ): Promise<AttioRecord> {
    try {
      return await createObjectRecord('records', mappedData);
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown>;
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(errorObj?.message || '');
      // Check for uniqueness constraint violations
      if (errorMessage.includes('uniqueness constraint')) {
        const enhancedMessage = await enhanceUniquenessError(
          resource_type,
          errorMessage,
          mappedData
        );
        throw new UniversalValidationError(
          enhancedMessage,
          ErrorType.USER_ERROR,
          {
            suggestion:
              'Try searching for existing records first or use different unique values',
          }
        );
      }
      throw error;
    }
  }

  /**
   * Create a deal record with defaults validation
   */
  private static async createDealRecord(
    mappedData: Record<string, unknown>,
    originalRecordData: Record<string, unknown>
  ): Promise<AttioRecord> {
    // Handle deal-specific requirements with configured defaults and validation
    let dealData = { ...mappedData };

    // Validate input and log suggestions (but don't block execution)
    const validation = validateDealInput(dealData);
    if (
      validation.suggestions.length > 0 ||
      validation.warnings.length > 0 ||
      !validation.isValid
    ) {
      // Continue anyway - the conversions might fix the issues
    }

    // Apply configured defaults with proactive stage validation
    // Note: This may make an API call for stage validation
    dealData = await applyDealDefaultsWithValidation(dealData, false);

    try {
      return await createObjectRecord('deals', dealData);
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown>;
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(errorObj?.message || '');
      // If stage still fails after validation, try with default stage
      // IMPORTANT: Skip validation in error path to prevent API calls during failures
      if (errorMessage.includes('Cannot find Status') && dealData.stage) {
        const defaults = getDealDefaults();

        // Use default stage if available, otherwise remove stage (will fail since it's required)
        if (defaults.stage) {
          // Apply defaults WITHOUT validation to avoid API calls in error path
          dealData = await applyDealDefaultsWithValidation(
            { ...originalRecordData, stage: defaults.stage },
            true // Skip validation in error path
          );
        } else {
          delete dealData.stage;
        }

        return await createObjectRecord('deals', dealData);
      }
      throw error;
    }
  }

  /**
   * Create a task record with field transformation and mock support
   */
  private static async createTaskRecord(
    mappedData: Record<string, unknown>
  ): Promise<AttioRecord> {
    try {
      // Issue #417: Enhanced task creation with field mapping guidance
      // Check for content field first, then validate (handle empty strings)
      const content =
        (mappedData.content &&
          typeof mappedData.content === 'string' &&
          mappedData.content.trim()) ||
        (mappedData.title &&
          typeof mappedData.title === 'string' &&
          mappedData.title.trim()) ||
        (mappedData.name &&
          typeof mappedData.name === 'string' &&
          mappedData.name.trim()) ||
        'New task';

      // Validate field mapping - only suggest using content instead of title
      // if the user actually provided a title field but no content
      if (mappedData.title !== undefined && mappedData.content === undefined) {
        throw ErrorTemplates.TASK_FIELD_MAPPING(
          'title', // Show 'title' as the field they tried to use
          'content' // Suggest 'content' as the correct field
        );
      }

      // Handle field mappings: The field mapper transforms to API field names
      // assignees: can be array or single ID (from assignee_id mapping)
      // deadline_at: from due_date mapping
      // linked_records: from record_id mapping
      const options: Record<string, unknown> = {};

      // Only add fields that have actual values (not undefined)
      const assigneeId =
        mappedData.assignees || mappedData.assignee_id || mappedData.assigneeId;
      if (assigneeId) options.assigneeId = assigneeId;

      const dueDate =
        mappedData.deadline_at || mappedData.due_date || mappedData.dueDate;
      if (dueDate) options.dueDate = dueDate;

      const recordId =
        mappedData.linked_records ||
        mappedData.record_id ||
        mappedData.recordId;
      if (recordId) options.recordId = recordId;

      // Use mock-enabled task creation for test environments
      const createdTask = await createTaskWithMockSupport({
        content,
        title: content, // Dual field support
        ...options,
      });

      // Debug logging before conversion
      debug(
        'universal.createTask',
        'About to convert task to record',
        {
          hasCreatedTask: !!createdTask,
          taskType: typeof createdTask,
          taskHasId: !!createdTask?.id,
          taskIdType: typeof createdTask?.id,
          taskIdStructure: createdTask?.id ? Object.keys(createdTask.id) : [],
        },
        'createTask',
        OperationType.API_CALL
      );

      // Convert AttioTask to AttioRecord using proper type conversion
      // For tests, MockService.createTask already returns AttioRecord format
      // For production, we need to convert from AttioTask to AttioRecord

      // Handle both AttioTask and AttioRecord inputs
      let convertedRecord: AttioRecord;
      if ('values' in createdTask && createdTask.id?.record_id) {
        // Already in AttioRecord format (from MockService)
        convertedRecord = createdTask as AttioRecord;
      } else {
        // Convert from AttioTask to AttioRecord
        // Ensure we have the properties needed for AttioTask conversion
        if ('content' in createdTask) {
          convertedRecord = UniversalUtilityService.convertTaskToRecord(
            createdTask as unknown as AttioTask
          );
        } else {
          throw new Error(
            `Invalid task object structure: ${JSON.stringify(createdTask)}`
          );
        }
      }

      // Debug logging after conversion
      debug(
        'universal.createTask',
        'Task converted to record',
        {
          hasRecord: !!convertedRecord,
          recordType: typeof convertedRecord,
          recordHasId: !!convertedRecord?.id,
          recordIdType: typeof convertedRecord?.id,
          recordIdStructure: convertedRecord?.id
            ? Object.keys(convertedRecord.id)
            : [],
        },
        'createTask',
        OperationType.API_CALL
      );

      return convertedRecord;
    } catch (error: unknown) {
      // Log original error for debugging
      console.error('[Tasks] Original error:', error);

      // Issue #417: Enhanced task error handling with field mapping guidance
      const errorObj: Error =
        error instanceof Error ? error : new Error(String(error));
      const enhancedError = ErrorEnhancer.autoEnhance(
        errorObj,
        'tasks',
        'create-record'
      );
      throw enhancedError;
    }
  }

  /**
   * Create a note record with field transformation and validation
   */
  private static async createNoteRecord(
    mappedData: Record<string, unknown>
  ): Promise<AttioRecord> {
    try {
      // Validate required content field (trimmed)
      let content: string;
      if (typeof mappedData.content === 'string' && mappedData.content.trim()) {
        content = mappedData.content.trim();
      } else {
        throw new UniversalValidationError(
          'Content is required and must be a non-empty string',
          ErrorType.USER_ERROR,
          { field: 'content' }
        );
      }

      // Validate parent_object (after field mapping)
      const parentObject = mappedData.parent_object as string;
      if (!parentObject || !['companies', 'people'].includes(parentObject)) {
        throw new UniversalValidationError(
          'parent_object must be "companies" or "people"',
          ErrorType.USER_ERROR,
          { field: 'parent_object' }
        );
      }

      // Validate parent_record_id (after field mapping)
      const parentRecordId = mappedData.parent_record_id as string;
      if (!parentRecordId) {
        throw new UniversalValidationError(
          'parent_record_id is required',
          ErrorType.USER_ERROR,
          { field: 'parent_record_id' }
        );
      }

      // Build create note body according to Attio API spec
      const noteBody = {
        parent_object: parentObject as 'companies' | 'people',
        parent_record_id: parentRecordId,
        content,
        title: mappedData.title as string | undefined,
        format: (mappedData.format as 'markdown' | 'plaintext') || 'plaintext',
        created_at: mappedData.created_at as string | undefined,
        meeting_id: mappedData.meeting_id as string | undefined,
      };

      debug(
        'universal.createNote',
        'Creating note with mapped data',
        {
          parent_object: noteBody.parent_object,
          parent_record_id: noteBody.parent_record_id,
          hasContent: !!noteBody.content,
          hasTitle: !!noteBody.title,
          format: noteBody.format,
        },
        'createNote',
        OperationType.API_CALL
      );

      // Create note via notes API
      const response = await createNote(noteBody);
      const createdNote = response.data;

      // Normalize to universal record format
      const normalizedRecord = normalizeNoteResponse(createdNote);

      debug(
        'universal.createNote',
        'Note created and normalized',
        {
          noteId: createdNote.id.note_id,
          hasNormalizedId: !!normalizedRecord.id.record_id,
          resourceType: normalizedRecord.resource_type,
        },
        'createNote',
        OperationType.API_CALL
      );

      return normalizedRecord as AttioRecord;
    } catch (error: unknown) {
      // Log original error for debugging
      console.error('[Notes] Original error:', error);

      // Enhanced error handling for notes
      const errorObj: Error =
        error instanceof Error ? error : new Error(String(error));
      const enhancedError = ErrorEnhancer.autoEnhance(
        errorObj,
        'notes',
        'create-record'
      );
      throw enhancedError;
    }
  }

  /**
   * Handle unsupported resource types with correction attempts
   */
  private static async handleUnsupportedResourceType(
    resource_type: string,
    params: UniversalCreateParams
  ): Promise<AttioRecord> {
    // Check if resource type can be corrected
    const resourceValidation = validateResourceType(resource_type);
    if (resourceValidation.corrected) {
      // Retry with corrected resource type
      console.error(
        `Resource type corrected from "${resource_type}" to "${resourceValidation.corrected}"`
      );
      return this.createRecord({
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
