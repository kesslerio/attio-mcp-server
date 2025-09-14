/**
 * CompanyCreator - Strategy implementation for company resource creation
 *
 * Handles company-specific creation logic including domain normalization,
 * error recovery, and company record processing.
 */

import type { AttioRecord } from '../../../types/attio.js';
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
    input: Record<string, unknown>,
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
        const h = context.client?.defaults?.headers ?? {};
        const c = h.common ?? {};
        const hasAuth = Boolean(
          c.Authorization ||
            c.authorization ||
            h.Authorization ||
            h.authorization
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

      const rec = this.extractRecordFromResponse(response);

      /* istanbul ignore next */
      if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
        createScopedLogger('CompanyCreator', 'create').debug(
          'Extracted record',
          {
            hasRec: !!rec,
            recType: typeof rec,
            recKeys: rec && typeof rec === 'object' ? Object.keys(rec) : null,
            hasId: !!rec?.id,
            hasRecordId: !!rec?.id?.record_id,
          }
        );
      }

      this.finalizeRecord(rec, context);
      registerMockAliasIfPresent(input, rec?.id?.record_id);

      const out = normalizeRecordForOutput(rec, 'companies');

      // Optional debug to confirm the shape:
      if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
        createScopedLogger('CompanyCreator', 'create').debug('types', {
          nameBefore: Array.isArray(rec?.values?.name)
            ? 'array'
            : typeof rec?.values?.name,
          nameAfter: typeof (out as any)?.values?.name,
          domainsAfter: Array.isArray((out as any)?.values?.domains),
        });
      }

      return out;
    } catch (err: any) {
      /* istanbul ignore next */
      if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
        createScopedLogger('CompanyCreator', 'create').debug(
          'Exception caught',
          {
            message: err.message,
            status: err?.response?.status,
            hasResponseData: !!err?.response?.data,
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
  protected normalizeInput(
    input: Record<string, unknown>
  ): Record<string, unknown> {
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
    normalizedInput?: Record<string, unknown>
  ): Promise<any> {
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
        if (record?.id?.record_id) {
          context.debug(
            this.constructor.name,
            'Company recovery succeeded by domain',
            {
              domain,
              recordId: record.id.record_id,
            }
          );
          return record;
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
        if (record?.id?.record_id) {
          context.debug(
            this.constructor.name,
            'Company recovery succeeded by name',
            {
              name,
              recordId: record.id.record_id,
            }
          );
          return record;
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
    response: any,
    context: ResourceCreatorContext,
    normalizedInput?: Record<string, unknown>
  ): Promise<AttioRecord> {
    context.debug(this.constructor.name, `${this.resourceType} API response`, {
      status: response?.status,
      statusText: response?.statusText,
      hasData: !!response?.data,
      hasNestedData: !!response?.data?.data,
      dataKeys: response?.data ? Object.keys(response.data) : [],
    });

    let record = this.extractRecordFromResponse(response);
    record = this.enrichRecordId(record, response);

    // Handle empty response with recovery attempt
    const mustRecover =
      !record || !(record as any).id || !(record as any).id?.record_id;
    if (mustRecover && normalizedInput) {
      record = await this.attemptRecovery(context, normalizedInput);
    }

    return this.finalizeRecord(record, context);
  }

  /**
   * Extracts record from API response
   */
  private extractRecordFromResponse(response: any): any {
    return extractAttioRecord(response);
  }

  /**
   * Extracts record from search results
   */
  private extractRecordFromSearch(searchData: any): any {
    return extractAttioRecord(searchData);
  }

  /**
   * Finalizes record processing
   */
  private finalizeRecord(
    record: any,
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
