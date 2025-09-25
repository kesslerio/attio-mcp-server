/**
 * CompanyCreator - Strategy implementation for company resource creation
 *
 * Handles company-specific creation logic including domain normalization,
 * error recovery, and company record processing.
 */

import type { AttioRecord, JsonObject } from '../../../types/attio.js';
import type { ResourceCreatorContext, RecoveryOptions } from './types.js';
import { BaseCreator } from './base-creator.js';
import { normalizeCompanyValues } from '../data-normalizers.js';
import {
  extractAttioRecord,
  assertLooksLikeCreated,
  isTestRun,
  debugRecordShape,
  normalizeRecordForOutput,
} from '../extractor.js';
import { registerMockAliasIfPresent } from '../../../test-support/mock-alias.js';
import { createScopedLogger } from '../../../utils/logger.js';
import {
  safeExtractRecordId,
  safeExtractValuesObject,
} from '../../../utils/type-extraction.js';

/**
 * Company-specific resource creator
 * Implements Strategy Pattern for company creation
 */
export class CompanyCreator extends BaseCreator {
  readonly resourceType = 'companies';
  readonly endpoint = '/objects/companies/records';

  /**
   * Creates a company record with domain normalization
   *
   * @param input - Company data including name, domain/domains, industry, etc.
   * @param context - Shared context with client and utilities
   * @returns Promise<AttioRecord> - Created company record with id.record_id
   */
  async create(
    input: JsonObject,
    context: ResourceCreatorContext
  ): Promise<AttioRecord> {
    this.assertClientHasAuth(context);
    const normalizedCompany = this.normalizeInput(input);
    const payload = this.createPayload(normalizedCompany);

    context.debug(this.constructor.name, '🔍 EXACT API PAYLOAD', {
      url: this.endpoint,
      fullUrl: `https://api.attio.com/v2${this.endpoint}`,
      payload: JSON.stringify(payload, null, 2),
    });

    try {
      /* istanbul ignore next */
      if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
        const h =
          (context.client?.defaults?.headers as JsonObject) ??
          ({} as JsonObject);
        const c = (h.common as JsonObject) ?? ({} as JsonObject);
        const hasAuth = Boolean(
          (c.Authorization as string) ||
            (c.authorization as string) ||
            (h.Authorization as string) ||
            (h.authorization as string)
        );
        createScopedLogger('CompanyCreator', 'create').debug('Client probe', {
          baseURL: context.client.defaults?.baseURL,
          hasAuth,
        });
      }

      const response = await context.client.post(this.endpoint, payload);

      /* istanbul ignore next */
      if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
        createScopedLogger('CompanyCreator', 'create').debug('Raw response', {
          status: response.status,
          hasData: !!response.data,
          dataType: typeof response.data,
          dataKeys:
            response.data && typeof response.data === 'object'
              ? Object.keys(response.data)
              : null,
          fullResponseData: JSON.stringify(response.data, null, 2),
        });
      }

      const rec = this.extractRecordFromResponse(
        response as unknown as JsonObject
      );

      /* istanbul ignore next */
      if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
        createScopedLogger('CompanyCreator', 'create').debug(
          'Extracted record',
          {
            hasRec: !!rec,
            recType: typeof rec,
            recKeys: rec && typeof rec === 'object' ? Object.keys(rec) : null,
            hasId: !!(rec as JsonObject)?.id,
            hasRecordId: !!safeExtractRecordId(rec),
          }
        );
      }

      this.finalizeRecord(rec, context);
      const recordId = safeExtractRecordId(rec);
      if (recordId) {
        registerMockAliasIfPresent(input, recordId);
      }

      const out = normalizeRecordForOutput(rec, 'companies');

      // Optional debug to confirm the shape:
      if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
        createScopedLogger('CompanyCreator', 'create').debug('types', {
          nameBefore: Array.isArray(
            ((rec as JsonObject)?.values as JsonObject)?.name
          )
            ? 'array'
            : typeof ((rec as JsonObject)?.values as JsonObject)?.name,
          nameAfter: typeof safeExtractValuesObject(out)?.name,
          domainsAfter: Array.isArray(safeExtractValuesObject(out)?.domains),
        });
      }

      return out as AttioRecord;
    } catch (err: unknown) {
      /* istanbul ignore next */
      if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
        createScopedLogger('CompanyCreator', 'create').debug(
          'Exception caught',
          {
            message: (err as Error).message,
            status: (
              (err as Record<string, unknown>)?.response as Record<
                string,
                unknown
              >
            )?.status,
            hasResponseData: !!(
              (err as Record<string, unknown>)?.response as Record<
                string,
                unknown
              >
            )?.data,
          }
        );
      }
      return this.handleApiError(err, context, payload);
    }
  }

  /**
   * Normalizes company input data
   * Handles domain/domains field normalization
   */
  protected normalizeInput(input: JsonObject): JsonObject {
    return normalizeCompanyValues(input);
  }

  /**
   * Provides company-specific recovery options
   * Attempts recovery by domain and then by name
   */
  protected getRecoveryOptions(): RecoveryOptions {
    return {
      searchFilters: [
        {
          field: 'domains',
          value: '', // Will be set dynamically in attemptRecovery
          operator: 'contains',
        },
        {
          field: 'name',
          value: '', // Will be set dynamically in attemptRecovery
          operator: 'eq',
        },
      ],
      maxAttempts: 2,
    };
  }

  /**
   * Company-specific recovery implementation
   * Attempts to find company by domain first, then by name
   */
  protected async attemptRecovery(
    context: ResourceCreatorContext,
    normalizedInput?: JsonObject
  ): Promise<AttioRecord> {
    if (!normalizedInput) {
      throw this.createEnhancedError(
        new Error('Company creation returned empty/invalid record'),
        context,
        500
      );
    }

    // Try recovery by domain first
    const domain = Array.isArray(normalizedInput.domains)
      ? normalizedInput.domains[0]
      : undefined;

    try {
      if (domain) {
        const { data: searchByDomain } = await context.client.post(
          `${this.endpoint}/search`,
          {
            filter: { domains: { contains: domain } },
            limit: 1,
            order: { created_at: 'desc' },
          }
        );
        const record = this.extractRecordFromSearch(searchByDomain);
        const recordId =
          (record as JsonObject)?.id &&
          ((record as JsonObject)?.id as JsonObject)?.record_id;
        if (recordId) {
          context.debug(
            this.constructor.name,
            'Company recovery succeeded by domain',
            {
              domain,
              recordId: safeExtractRecordId(record),
            }
          );
          return record as AttioRecord;
        }
      }

      // Try recovery by name
      const name = normalizedInput.name as string;
      if (name) {
        const { data: searchByName } = await context.client.post(
          `${this.endpoint}/search`,
          {
            filter: { name: { eq: name } },
            limit: 1,
            order: { created_at: 'desc' },
          }
        );
        const record = this.extractRecordFromSearch(searchByName);
        const recordId =
          (record as JsonObject)?.id &&
          ((record as JsonObject)?.id as JsonObject)?.record_id;
        if (recordId) {
          context.debug(
            this.constructor.name,
            'Company recovery succeeded by name',
            {
              name,
              recordId: safeExtractRecordId(record),
            }
          );
          return record as AttioRecord;
        }
      }
    } catch (e) {
      context.debug(this.constructor.name, 'Company recovery failed', {
        message: (e as Error)?.message,
      });
    }

    throw this.createEnhancedError(
      new Error('Company creation and recovery both failed'),
      context,
      500
    );
  }

  /**
   * Processes response with company-specific logic
   * Includes recovery attempt with normalized input
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
      hasNestedData: !!(response?.data as JsonObject)?.data,
      dataKeys: response?.data ? Object.keys(response.data as JsonObject) : [],
    });

    let record = this.extractRecordFromResponse(response);
    record = this.enrichRecordId(record, response);

    // Handle empty response with recovery attempt
    const mustRecover =
      !record ||
      !(record as JsonObject).id ||
      !((record as JsonObject).id as JsonObject)?.record_id;
    if (mustRecover && normalizedInput) {
      record = await this.attemptRecovery(context, normalizedInput);
    }

    return this.finalizeRecord(record, context);
  }

  /**
   * Extracts record from API response
   */
  private extractRecordFromResponse(response: JsonObject): JsonObject {
    return extractAttioRecord(response) || {};
  }

  /**
   * Extracts record from search results
   */
  private extractRecordFromSearch(searchData: JsonObject): JsonObject {
    return extractAttioRecord(searchData) || {};
  }

  /**
   * Finalizes record processing
   */
  private finalizeRecord(
    record: JsonObject,
    context: ResourceCreatorContext
  ): AttioRecord {
    assertLooksLikeCreated(record, `${this.constructor.name}.create`);

    /* istanbul ignore next */
    if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
      createScopedLogger('CompanyCreator', 'finalizeRecord').debug(
        'extracted keys',
        {
          keys:
            record && typeof record === 'object'
              ? Object.keys(record)
              : typeof record,
        }
      );
    }

    if (isTestRun()) {
      context.debug(
        this.constructor.name,
        `Normalized ${this.resourceType} record`,
        debugRecordShape(record)
      );
    }

    return record as AttioRecord;
  }
}
