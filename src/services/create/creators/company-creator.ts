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
    const normalizedCompany = this.normalizeInput(input);
    const payload = this.createPayload(normalizedCompany);

    context.debug(this.constructor.name, '🔍 EXACT API PAYLOAD', {
      url: this.endpoint,
      payload: JSON.stringify(payload, null, 2),
    });

    try {
      const response = await context.client.post(this.endpoint, payload);
      return await this.processResponse(response, context, normalizedCompany);
    } catch (err: any) {
      this.handleApiError(err, context, payload);
    }
  }

  /**
   * Normalizes company input data
   * Handles domain/domains field normalization
   */
  protected normalizeInput(input: Record<string, unknown>): Record<string, unknown> {
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
          operator: 'contains'
        },
        {
          field: 'name',
          value: '', // Will be set dynamically in attemptRecovery
          operator: 'eq'
        }
      ],
      maxAttempts: 2
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
          context.debug(this.constructor.name, 'Company recovery succeeded by domain', {
            domain,
            recordId: record.id.record_id,
          });
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
          context.debug(this.constructor.name, 'Company recovery succeeded by name', {
            name,
            recordId: record.id.record_id,
          });
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
    const mustRecover = !record || !(record as any).id || !(record as any).id?.record_id;
    if (mustRecover && normalizedInput) {
      record = await this.attemptRecovery(context, normalizedInput);
    }

    return this.finalizeRecord(record, context);
  }

  /**
   * Extracts record from API response
   */
  private extractRecordFromResponse(response: any): any {
    // Use the existing extractor utility
    const { extractAttioRecord } = require('../extractor.js');
    return extractAttioRecord(response);
  }

  /**
   * Extracts record from search results
   */
  private extractRecordFromSearch(searchData: any): any {
    const { extractAttioRecord } = require('../extractor.js');
    return extractAttioRecord(searchData);
  }

  /**
   * Finalizes record processing
   */
  private finalizeRecord(record: any, context: ResourceCreatorContext): AttioRecord {
    const { assertLooksLikeCreated, isTestRun, debugRecordShape } = require('../extractor.js');
    
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

}