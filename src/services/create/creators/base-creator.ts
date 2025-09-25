/**
 * BaseCreator - Abstract base class for all resource creators
 *
 * Provides common functionality and utilities shared across all resource creators.
 * Implements Strategy Pattern base behavior including error handling, recovery,
 * and response processing.
 */

import type { AttioRecord, JsonObject } from '@shared-types/attio.js';
import type {
  ResourceCreator,
  ResourceCreatorContext,
  ResourceCreatorError,
  RecoveryOptions,
} from './types.js';
import { EnhancedApiError } from '@errors/enhanced-api-errors.js';
import { extractRecordId } from '@utils/validation/uuid-validation.js';
import {
  extractAttioRecord,
  assertLooksLikeCreated,
  isTestRun,
  debugRecordShape,
} from '@services/create/extractor.js';
import { validateRequiredArrayField } from '@services/create/validators.js';

/**
 * Abstract base class for resource creators
 * Provides shared functionality and enforces creator interface
 */
export abstract class BaseCreator implements ResourceCreator {
  abstract readonly resourceType: string;
  abstract readonly endpoint: string;

  /**
   * Creates a resource record (implemented by subclasses)
   */
  abstract create(
    input: JsonObject,
    context: ResourceCreatorContext
  ): Promise<AttioRecord>;

  /**
   * Normalizes input data for the specific resource type
   * Override in subclasses for resource-specific normalization
   */
  protected normalizeInput(input: JsonObject): JsonObject {
    return input;
  }

  /**
   * Validates required array field presence
   */
  protected assertRequiredArray(
    payload: JsonObject,
    field: string,
    errorMessage: string
  ): void {
    validateRequiredArrayField(payload, field, errorMessage);
  }

  /**
   * Creates the API payload for resource creation
   */
  protected createPayload(normalizedInput: JsonObject): JsonObject {
    return {
      data: {
        values: normalizedInput,
      },
    };
  }

  /**
   * Processes API response and extracts record
   */
  protected async processResponse(
    response: JsonObject,
    context: ResourceCreatorContext,
    normalizedInput?: JsonObject
  ): Promise<AttioRecord> {
    context.debug(this.constructor.name, `${this.resourceType} API response`, {
      status: response?.status,
      statusText: response?.statusText,
      hasData: !!response?.data,
      hasNestedData: !!(response?.data as Record<string, unknown>)?.data,
      dataKeys: response?.data
        ? Object.keys(response.data as Record<string, unknown>)
        : [],
    });

    let record = extractAttioRecord(response);

    // Enrich missing id from web_url if available
    const enrichedRecord = this.enrichRecordId(
      record || ({} as JsonObject),
      response
    );

    // Handle empty response with recovery if needed
    const mustRecover =
      !enrichedRecord ||
      !(enrichedRecord as JsonObject).id ||
      !((enrichedRecord as JsonObject).id as JsonObject)?.record_id;
    if (mustRecover) {
      record = await this.attemptRecovery(context, normalizedInput);
    } else {
      record = enrichedRecord as AttioRecord;
    }

    assertLooksLikeCreated(record, `${this.constructor.name}.create`);

    if (isTestRun()) {
      context.debug(
        this.constructor.name,
        `Normalized ${this.resourceType} record`,
        debugRecordShape(record)
      );
    }

    return record as AttioRecord;
  }

  /**
   * Enriches record with ID extracted from web_url if missing
   */
  protected enrichRecordId(
    record: JsonObject,
    response: JsonObject
  ): JsonObject {
    if (record && (!record.id || !(record.id as JsonObject)?.record_id)) {
      const webUrl = record?.web_url || (response?.data as JsonObject)?.web_url;
      const rid = webUrl ? extractRecordId(String(webUrl)) : undefined;
      if (rid) {
        const existingId = (record.id as JsonObject) || ({} as JsonObject);
        record.id = { ...existingId, record_id: rid };
      }
    }
    return record;
  }

  /**
   * Attempts to recover record by searching for it
   * Override in subclasses to implement resource-specific recovery
   */
  protected async attemptRecovery(
    context: ResourceCreatorContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _normalizedInput?: JsonObject
  ): Promise<AttioRecord> {
    const recoveryOptions = this.getRecoveryOptions();
    if (!recoveryOptions) {
      throw this.createEnhancedError(
        new Error(
          `${this.resourceType} creation returned empty/invalid record`
        ),
        context,
        500
      );
    }

    for (const filter of recoveryOptions.searchFilters) {
      try {
        const searchEndpoint = `${this.endpoint}/search`;
        const searchFilter: JsonObject = {
          [filter.field]:
            filter.operator === 'contains'
              ? { contains: filter.value }
              : { eq: filter.value },
        };

        const { data: searchResult } = await context.client.post(
          searchEndpoint,
          {
            filter: searchFilter,
            limit: 1,
            order: { created_at: 'desc' },
          }
        );

        const record = extractAttioRecord(searchResult);
        const typedRecord = record as JsonObject | undefined;
        const recordId = typedRecord?.id
          ? (typedRecord.id as JsonObject)?.record_id
          : undefined;
        if (recordId) {
          context.debug(
            this.constructor.name,
            `${this.resourceType} recovery succeeded`,
            {
              recoveredBy: filter.field,
              recordId,
            }
          );
          return typedRecord as unknown as AttioRecord;
        }
      } catch (e) {
        context.debug(
          this.constructor.name,
          `${this.resourceType} recovery attempt failed`,
          {
            field: filter.field,
            message: (e as Error)?.message,
          }
        );
      }
    }

    throw this.createEnhancedError(
      new Error(`${this.resourceType} creation and recovery both failed`),
      context,
      500
    );
  }

  /**
   * Gets recovery options for this resource type
   * Override in subclasses to provide resource-specific recovery
   */
  protected getRecoveryOptions(): RecoveryOptions | null {
    return null;
  }

  /**
   * Creates enhanced API error with context
   */
  /**
   * Fails fast if auth is missing to avoid confusing "200 {}" responses
   */
  protected assertClientHasAuth(context: ResourceCreatorContext) {
    const common = context.client?.defaults?.headers?.common ?? {};
    const direct = context.client?.defaults?.headers ?? {};

    const auth = (common['Authorization'] ??
      common['authorization'] ??
      direct['Authorization'] ??
      direct['authorization']) as string | undefined;

    if (!auth) {
      throw new Error('Attio client has no Authorization header.');
    }
  }

  protected createEnhancedError(
    error: Error,
    context: ResourceCreatorContext,
    status: number = 500
  ): EnhancedApiError {
    const errorInfo: ResourceCreatorError = {
      operation: 'create',
      endpoint: this.endpoint,
      resourceType: this.resourceType,
      originalError: error,
      httpStatus: status,
    };

    context.logError(
      this.constructor.name,
      `${this.resourceType} creation error`,
      errorInfo as unknown as JsonObject
    );

    let message: string;
    if (status === 500) {
      message = `invalid request: Attio ${this.resourceType} creation failed with a server error.`;
    } else {
      message = `Attio ${this.resourceType} creation failed (${status}): ${error.message}`;
    }

    return new EnhancedApiError(message, status, this.endpoint, 'POST', {
      httpStatus: status,
      resourceType: this.resourceType,
      operation: 'create',
      originalError: error,
    });
  }

  /**
   * Handles API errors during creation
   */
  protected handleApiError(
    err: unknown,
    context: ResourceCreatorContext,
    payload?: JsonObject
  ): never {
    const error = err as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
      name?: string;
    };
    const status = error?.response?.status ?? 500;
    const data = error?.response?.data;
    const detailMessage = data?.message;

    context.logError(
      this.constructor.name,
      `${this.resourceType} API error details`,
      {
        status,
        errorBody: data,
        requestPayload: payload,
      }
    );

    throw this.createEnhancedError(
      new Error(
        detailMessage || error?.message || `${this.resourceType} creation error`
      ),
      context,
      status
    );
  }
}
