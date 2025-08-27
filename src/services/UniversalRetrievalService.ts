/**
 * UniversalRetrievalService - Centralized record retrieval operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal record retrieval functionality across all resource types.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import type { UniversalRecordDetailsParams } from '../handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../types/attio.js';
import { performance } from 'perf_hooks';

// Import services
import { ValidationService } from './ValidationService.js';
import { CachingService } from './CachingService.js';
import { UniversalUtilityService } from './UniversalUtilityService.js';

// Import performance tracking
import { enhancedPerformanceTracker } from '../middleware/performance-enhanced.js';

// Import error handling utilities
import { createRecordNotFoundError } from '../utils/validation/uuid-validation.js';
import { ErrorEnhancer } from '../errors/enhanced-api-errors.js';
import {
  isEnhancedApiError,
  ensureEnhanced,
  withEnumerableMessage,
} from '../errors/enhanced-helpers.js';
import { toMcpResult, HttpResponse } from '../lib/http/toMcpResult.js';

// Import resource-specific retrieval functions
import { getCompanyDetails } from '../objects/companies/index.js';
import { getPersonDetails } from '../objects/people/index.js';
import { getListDetails } from '../objects/lists.js';
import { getObjectRecord } from '../objects/records/index.js';
import { getTask } from '../objects/tasks.js';
import { getNote, normalizeNoteResponse } from '../objects/notes.js';

/**
 * UniversalRetrievalService provides centralized record retrieval functionality
 */
export class UniversalRetrievalService {
  /**
   * Get record details across any supported resource type
   *
   * @param params - Retrieval operation parameters
   * @returns Promise resolving to AttioRecord
   */
  static async getRecordDetails(
    params: UniversalRecordDetailsParams
  ): Promise<AttioRecord> {
    const { resource_type, record_id, fields } = params;

    // Start performance tracking
    const perfId = enhancedPerformanceTracker.startOperation(
      'get-record-details',
      'get',
      { resourceType: resource_type, recordId: record_id }
    );

    // Enhanced UUID validation using ValidationService (Issue #416)
    const validationStart = performance.now();

    // Early ID validation for performance tests - provide exact expected error message
    if (
      !record_id ||
      typeof record_id !== 'string' ||
      record_id.trim().length === 0
    ) {
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        'Invalid record identifier format',
        400
      );
      throw new Error('Invalid record identifier format');
    }

    // Validate UUID format with clear error distinction
    // Invalid UUID format should be treated as validation error for performance tests
    try {
      ValidationService.validateUUID(record_id, resource_type, 'GET', perfId);
    } catch (validationError) {
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        'Invalid UUID format validation error',
        400
      );
      // For performance tests, preserve the original validation error message
      // This allows error.message to contain "Invalid record identifier format"
      if (validationError instanceof Error) {
        throw validationError; // Preserve original EnhancedApiError with .message property
      }
      // Fallback for non-Error cases
      throw new Error('Invalid record identifier format');
    }

    enhancedPerformanceTracker.markTiming(
      perfId,
      'validation',
      performance.now() - validationStart
    );

    // Check 404 cache using CachingService
    if (CachingService.isCached404(resource_type, record_id)) {
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        'Cached 404 response',
        404,
        { cached: true }
      );
      // Use EnhancedApiError for consistent error handling
      throw createRecordNotFoundError(record_id, resource_type);
    }

    // Track API call timing
    const apiStart = enhancedPerformanceTracker.markApiStart(perfId);
    let result: AttioRecord;

    try {
      result = await this.retrieveRecordByType(resource_type, record_id);

      enhancedPerformanceTracker.markApiEnd(perfId, apiStart);
      enhancedPerformanceTracker.endOperation(perfId, true, undefined, 200);

      // Apply field filtering if fields parameter was provided
      if (fields && fields.length > 0) {
        const filteredResult = this.filterResponseFields(result, fields);
        // Ensure the filtered result maintains AttioRecord structure
        return {
          id: result.id,
          created_at: result.created_at,
          updated_at: result.updated_at,
          values:
            (filteredResult.values as Record<string, unknown>) || result.values,
        } as unknown as AttioRecord;
      }
      return result;
    } catch (apiError: unknown) {
      enhancedPerformanceTracker.markApiEnd(perfId, apiStart);

      // Handle EnhancedApiError instances directly - preserve them through the chain
      if (isEnhancedApiError(apiError)) {
        // Cache 404 responses using CachingService
        if (apiError.statusCode === 404) {
          CachingService.cache404Response(resource_type, record_id);
        }

        enhancedPerformanceTracker.endOperation(
          perfId,
          false,
          apiError.message,
          apiError.statusCode
        );

        // Re-throw EnhancedApiError as-is - make message enumerable for vitest
        throw withEnumerableMessage(apiError);
      }

      // Enhanced error handling for Issues #415, #416, #417
      const errorObj = apiError as Record<string, unknown>;
      const statusCode =
        ((errorObj?.response as Record<string, unknown>)?.status as number) ||
        (errorObj?.statusCode as number) ||
        500;

      if (
        statusCode === 404 ||
        (apiError instanceof Error && apiError.message.includes('not found'))
      ) {
        // Cache 404 responses using CachingService
        CachingService.cache404Response(resource_type, record_id);

        enhancedPerformanceTracker.endOperation(
          perfId,
          false,
          'Record not found',
          404
        );

        // URS suite expects createRecordNotFoundError for generic 404s
        throw createRecordNotFoundError(record_id, resource_type);
      }

      if (statusCode === 400) {
        enhancedPerformanceTracker.endOperation(
          perfId,
          false,
          'Invalid request',
          400
        );

        // Create and throw enhanced error
        const error = new Error(`Invalid record_id format: ${record_id}`);
        (error as any).statusCode = 400;
        throw ensureEnhanced(error, {
          endpoint: `/${resource_type}/${record_id}`,
          method: 'GET',
          resourceType: resource_type,
          recordId: record_id,
        });
      }

      // Check if this is our structured HTTP response before enhancing
      if (
        apiError &&
        typeof apiError === 'object' &&
        'status' in apiError &&
        'body' in apiError
      ) {
        // Convert legacy HTTP response to EnhancedApiError
        const message = (apiError as any).body?.message || 'HTTP error';
        const status = (apiError as any).status || 500;
        enhancedPerformanceTracker.endOperation(perfId, false, message, status);
        const error = new Error(message);
        (error as any).statusCode = status;
        throw ensureEnhanced(error, {
          endpoint: `/${resource_type}/${record_id}`,
          method: 'GET',
          resourceType: resource_type,
          recordId: record_id,
        });
      }

      // For HTTP errors, use ErrorEnhancer to auto-enhance
      if (Number.isFinite(statusCode)) {
        const error =
          apiError instanceof Error ? apiError : new Error(String(apiError));
        const enhancedError = ErrorEnhancer.autoEnhance(
          error,
          resource_type,
          'get-record-details',
          record_id
        );
        enhancedPerformanceTracker.endOperation(
          perfId,
          false,
          // Issue #425: Use safe error message extraction
          ErrorEnhancer.getErrorMessage(enhancedError),
          statusCode
        );
        throw enhancedError;
      }

      // For non-HTTP errors (TypeError, ETIMEDOUT), rethrow as-is
      // Error-recovery suite expects original error messages
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        apiError instanceof Error ? apiError.message : String(apiError),
        500
      );
      throw apiError;
    }
  }

  /**
   * Retrieve record by resource type with type-specific handling
   */
  private static async retrieveRecordByType(
    resource_type: UniversalResourceType,
    record_id: string
  ): Promise<AttioRecord> {
    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
        return await getCompanyDetails(record_id);

      case UniversalResourceType.PEOPLE:
        return await getPersonDetails(record_id);

      case UniversalResourceType.LISTS:
        return this.retrieveListRecord(record_id);

      case UniversalResourceType.RECORDS:
        return await getObjectRecord('records', record_id);

      case UniversalResourceType.DEALS:
        return await getObjectRecord('deals', record_id);

      case UniversalResourceType.TASKS:
        return this.retrieveTaskRecord(record_id, resource_type);

      case UniversalResourceType.NOTES:
        return this.retrieveNoteRecord(record_id);

      default:
        throw new Error(
          `Unsupported resource type for get details: ${resource_type}`
        );
    }
  }

  /**
   * Retrieve list record with format conversion
   */
  private static async retrieveListRecord(
    record_id: string
  ): Promise<AttioRecord> {
    try {
      const list = await getListDetails(record_id);

      // NEW: robust null/shape guard - check for null, missing id, or empty list_id
      if (
        !list ||
        !list.id ||
        !('list_id' in list.id) ||
        !list.id.list_id ||
        list.id.list_id.trim() === ''
      ) {
        // Create and throw enhanced error
        const error = new Error(
          `List record with ID "${record_id}" not found.`
        );
        (error as any).statusCode = 404;
        throw ensureEnhanced(error, {
          endpoint: `/lists/${record_id}`,
          method: 'GET',
          resourceType: 'lists',
          recordId: record_id,
        });
      }

      // proceed safely
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
      // Handle EnhancedApiError instances directly
      if (isEnhancedApiError(error)) {
        // Re-throw EnhancedApiError as-is
        throw withEnumerableMessage(error);
      }

      // Handle legacy error format - don't mask auth/network issues as 404s
      if (error && typeof error === 'object' && 'status' in error) {
        const httpError = error as { status: number; body?: unknown };
        if (httpError.status === 404) {
          // Legitimate 404 from API - return legacy format
          throw {
            status: 404,
            body: {
              code: 'not_found',
              message: `List record with ID "${record_id}" not found.`,
            },
          };
        }
        // Re-throw other HTTP errors (auth, network, etc.) as-is
        const errorMessage =
          error instanceof Error
            ? error.message
            : `HTTP Error ${httpError.status}`;
        throw withEnumerableMessage(new Error(errorMessage));
      }

      // For non-HTTP errors, treat as not found only if it's a typical not-found error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        // Return legacy format for test compatibility
        throw {
          status: 404,
          body: {
            code: 'not_found',
            message: `List record with ID "${record_id}" not found.`,
          },
        };
      }

      // Re-throw other errors to avoid masking legitimate issues
      throw error;
    }
  }

  /**
   * Retrieve task record with conversion and error handling
   */
  private static async retrieveTaskRecord(
    record_id: string,
    resource_type: UniversalResourceType
  ): Promise<AttioRecord> {
    try {
      const task = await getTask(record_id);
      // Convert AttioTask to AttioRecord using proper type conversion
      return UniversalUtilityService.convertTaskToRecord(task);
    } catch (error: unknown) {
      // Handle EnhancedApiError instances directly
      if (isEnhancedApiError(error)) {
        // Re-throw EnhancedApiError as-is
        throw withEnumerableMessage(error);
      }

      // Handle legacy error format - don't mask auth/network issues as 404s
      if (error && typeof error === 'object' && 'status' in error) {
        const httpError = error as { status: number; body?: unknown };
        if (httpError.status === 404) {
          // Cache legitimate 404s and create EnhancedApiError
          CachingService.cache404Response(resource_type, record_id);
          const error = new Error(
            `${resource_type.charAt(0).toUpperCase() + resource_type.slice(1, -1)} record with ID "${record_id}" not found.`
          );
          (error as any).statusCode = 404;
          throw ensureEnhanced(error, {
            endpoint: `/${resource_type}/${record_id}`,
            method: 'GET',
            resourceType: resource_type,
            recordId: record_id,
          });
        }
        // Re-throw other HTTP errors (auth, network, etc.) as-is
        const errorMessage =
          error instanceof Error
            ? error.message
            : `HTTP Error ${httpError.status}`;
        throw withEnumerableMessage(new Error(errorMessage));
      }

      // For non-HTTP errors, only treat as 404 if it's clearly a not-found error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        CachingService.cache404Response(resource_type, record_id);
        // URS test expects createRecordNotFoundError for consistent message
        throw createRecordNotFoundError(record_id, resource_type);
      }

      // Re-throw other errors to avoid masking legitimate issues
      throw error;
    }
  }

  /**
   * Retrieve note record with normalization and error handling
   */
  private static async retrieveNoteRecord(
    noteId: string
  ): Promise<AttioRecord> {
    try {
      const response = await getNote(noteId);
      const note = response.data;

      // Normalize to universal record format
      const normalizedRecord = normalizeNoteResponse(note);
      return normalizedRecord as AttioRecord;
    } catch (error: unknown) {
      // Handle EnhancedApiError instances directly
      if (isEnhancedApiError(error)) {
        // Re-throw EnhancedApiError as-is
        throw withEnumerableMessage(error);
      }

      // Handle legacy error format - don't mask auth/network issues as 404s
      if (error && typeof error === 'object' && 'status' in error) {
        const httpError = error as { status: number; body?: unknown };
        if (httpError.status === 404) {
          // Cache legitimate 404s and create EnhancedApiError
          CachingService.cache404Response('notes', noteId);
          const error = new Error(`Note with ID "${noteId}" not found.`);
          (error as any).statusCode = 404;
          throw ensureEnhanced(error, {
            endpoint: `/notes/${noteId}`,
            method: 'GET',
            resourceType: 'notes',
            recordId: noteId,
          });
        }
        // Re-throw other HTTP errors (auth, network, etc.) as-is
        const errorMessage =
          error instanceof Error
            ? error.message
            : `HTTP Error ${httpError.status}`;
        throw withEnumerableMessage(new Error(errorMessage));
      }

      // For non-HTTP errors, only treat as 404 if it's clearly a not-found error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        CachingService.cache404Response('notes', noteId);
        // Return legacy format for test compatibility
        throw {
          status: 404,
          body: {
            code: 'not_found',
            message: `Note with ID "${noteId}" not found.`,
          },
        };
      }

      // Re-throw other errors to avoid masking legitimate issues
      throw error;
    }
  }

  /**
   * Filter response fields to only include requested fields
   */
  private static filterResponseFields(
    data: Record<string, unknown>,
    requestedFields?: string[]
  ): Record<string, unknown> {
    if (!requestedFields || requestedFields.length === 0) {
      return data; // Return full data if no fields specified
    }

    // Handle AttioRecord structure with id, values, created_at, updated_at
    if (data && typeof data === 'object' && 'id' in data && 'values' in data) {
      // Always preserve core AttioRecord structure
      const attioData = data as AttioRecord;
      const filtered: AttioRecord = {
        id: attioData.id,
        created_at: attioData.created_at,
        updated_at: attioData.updated_at,
        values: {},
      };

      // Filter values object to only requested fields
      const values = attioData.values as Record<string, unknown>;
      if (values && typeof values === 'object') {
        for (const field of requestedFields) {
          if (field in values) {
            filtered.values = filtered.values || {};
            let value = values[field];

            // Normalize Attio array format to simple values for easier consumption
            if (
              Array.isArray(value) &&
              value.length > 0 &&
              value[0]?.value !== undefined
            ) {
              value = value[0].value;
            }

            (filtered.values as Record<string, unknown>)[field] = value;
          }
        }
      }

      return filtered;
    }

    // Handle generic objects (not AttioRecord structure)
    const filtered: Record<string, unknown> = {};
    for (const field of requestedFields) {
      if (field in data) {
        filtered[field] = data[field];
      }
    }

    return filtered;
  }

  /**
   * Check if a record exists (lightweight check)
   */
  static async recordExists(
    resource_type: UniversalResourceType,
    record_id: string
  ): Promise<boolean> {
    try {
      // Check cached 404s first for performance
      if (CachingService.isCached404(resource_type, record_id)) {
        return false;
      }

      // Try to retrieve the record
      await this.getRecordDetails({ resource_type, record_id });
      return true;
    } catch (error: unknown) {
      // Handle EnhancedApiError instances directly
      if (isEnhancedApiError(error)) {
        // For 404 errors, return false; for other errors, re-throw
        if (error.statusCode === 404) {
          return false;
        }
        throw withEnumerableMessage(error);
      }

      // Check for structured HTTP response (404)
      const statusCode =
        (error as any)?.response?.status ?? (error as any)?.statusCode;
      const message = (error as any)?.message ?? '';

      if (statusCode === 404 || message.includes('not found')) {
        return false;
      }

      // For HTTP errors, enhance via ErrorEnhancer (URS test expects "Enhanced error")
      if (Number.isFinite(statusCode)) {
        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        const enhanced = ErrorEnhancer.autoEnhance(errorObj);
        throw enhanced;
      }

      // For non-HTTP errors, re-throw as-is
      throw error;
    }
  }

  /**
   * Get multiple records with batch optimization
   */
  static async getMultipleRecords(
    resource_type: UniversalResourceType,
    record_ids: string[],
    fields?: string[]
  ): Promise<(AttioRecord | null)[]> {
    // For now, fetch records individually
    // TODO: Implement batch API calls where supported by Attio
    const results = await Promise.allSettled(
      record_ids.map((record_id) =>
        this.getRecordDetails({ resource_type, record_id, fields })
      )
    );

    return results.map((result) =>
      result.status === 'fulfilled' ? result.value : null
    );
  }

  /**
   * Get record with performance metrics
   */
  static async getRecordWithMetrics(
    params: UniversalRecordDetailsParams
  ): Promise<{
    record: AttioRecord;
    metrics: { duration: number; cached: boolean; source: 'cache' | 'live' };
  }> {
    const start = performance.now();

    // Check if response is cached
    const isCached = CachingService.isCached404(
      params.resource_type,
      params.record_id
    );

    const record = await this.getRecordDetails(params);
    const duration = performance.now() - start;

    return {
      record,
      metrics: {
        duration,
        cached: isCached,
        source: isCached ? 'cache' : 'live',
      },
    };
  }
}
