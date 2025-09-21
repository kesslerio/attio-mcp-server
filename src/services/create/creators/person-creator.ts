/**
 * PersonCreator - Strategy implementation for person resource creation
 *
 * Handles person-specific creation logic including name and email normalization,
 * email retry logic, error recovery, and person record processing.
 */

import type { AxiosResponse } from 'axios';
import type { AttioRecord } from '../../../types/attio.js';
import type { ResourceCreatorContext, RecoveryOptions } from './types.js';
import { BaseCreator } from './base-creator.js';
import {
  normalizePersonValues,
  normalizeEmailsToObjectFormat,
  normalizeEmailsToStringFormat,
} from '../data-normalizers.js';
import {
  extractAttioRecord,
  assertLooksLikeCreated,
  isTestRun,
  debugRecordShape,
  normalizeRecordForOutput,
} from '../extractor.js';
import { registerMockAliasIfPresent } from '../../../test-support/mock-alias.js';
import { createScopedLogger } from '../../../utils/logger.js';
import { safeExtractRecordId } from '../../../utils/type-extraction.js';

/**
 * Person-specific resource creator
 * Implements Strategy Pattern for person creation with email retry logic
 */
export class PersonCreator extends BaseCreator {
  readonly resourceType = 'people';
  readonly endpoint = '/objects/people/records';

  /**
   * Creates a person record with name and email normalization
   *
   * @param input - Person data including name, email/email_addresses, title, etc.
   * @param context - Shared context with client and utilities
   * @returns Promise<AttioRecord> - Created person record with id.record_id
   */
  async create(
    input: Record<string, unknown>,
    context: ResourceCreatorContext
  ): Promise<AttioRecord> {
    this.assertClientHasAuth(context);
    const normalizedPerson = this.normalizeInput(input);

    context.debug(this.constructor.name, '🔍 EXACT API PAYLOAD', {
      url: this.endpoint,
      payload: JSON.stringify({ data: { values: normalizedPerson } }, null, 2),
    });

    try {
      const response = await this.createPersonWithRetry(
        context,
        normalizedPerson
      );
      const rec = this.extractRecordFromResponse(
        response as unknown as Record<string, unknown>
      );
      this.finalizeRecord(rec, context);
      const recordId = safeExtractRecordId(rec);
      if (recordId) {
        registerMockAliasIfPresent(input, recordId);
      }
      const out = normalizeRecordForOutput(rec, 'people');

      // Optional debug to confirm the shape:
      if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
        createScopedLogger('PersonCreator', 'create').debug('types', {
          nameBefore: Array.isArray(
            (
              (rec as Record<string, unknown>)?.values as Record<
                string,
                unknown
              >
            )?.name
          )
            ? 'array'
            : typeof (
                (rec as Record<string, unknown>)?.values as Record<
                  string,
                  unknown
                >
              )?.name,
          nameAfter: Array.isArray(
            (
              (out as Record<string, unknown>)?.values as Record<
                string,
                unknown
              >
            )?.name
          )
            ? 'array'
            : typeof (
                (out as Record<string, unknown>)?.values as Record<
                  string,
                  unknown
                >
              )?.name,
        });
      }

      return out as AttioRecord;
    } catch (err: unknown) {
      return this.handleApiError(err, context, {
        data: { values: normalizedPerson },
      });
    }
  }

  /**
   * Normalizes person input data
   * Handles name and email field normalization
   */
  protected normalizeInput(
    input: Record<string, unknown>
  ): Record<string, unknown> {
    return normalizePersonValues(input);
  }

  /**
   * Creates person with email format retry logic
   * Implements the same retry pattern as original createPerson
   */
  private async createPersonWithRetry(
    context: ResourceCreatorContext,
    filteredPersonData: Record<string, unknown>
  ): Promise<AxiosResponse> {
    const doCreate = async (values: Record<string, unknown>) =>
      context.client.post(this.endpoint, { data: { values } });

    try {
      // Attempt #1
      return await doCreate(filteredPersonData);
    } catch (firstErr: unknown) {
      const error = firstErr as { response?: { status?: number } };
      const status = error?.response?.status;

      // Only retry on 400 with alternate email schema
      if (status === 400) {
        const alt: Record<string, unknown> = { ...filteredPersonData };
        const emails = alt.email_addresses as unknown[] | undefined;

        if (emails && emails.length) {
          if (typeof emails[0] === 'string') {
            alt.email_addresses = normalizeEmailsToObjectFormat(emails);
          } else if (
            emails[0] &&
            typeof emails[0] === 'object' &&
            emails[0] !== null &&
            'email_address' in emails[0]
          ) {
            alt.email_addresses = normalizeEmailsToStringFormat(emails);
          }

          context.debug(
            this.constructor.name,
            'Retrying person creation with alternate email format',
            {
              originalFormat:
                emails.length > 0 ? typeof emails[0] : 'undefined',
              retryFormat:
                Array.isArray(alt.email_addresses) &&
                alt.email_addresses.length > 0
                  ? typeof alt.email_addresses[0]
                  : 'undefined',
            }
          );

          return await doCreate(alt);
        }
      }
      throw firstErr;
    }
  }

  /**
   * Provides person-specific recovery options
   * Attempts recovery by primary email address
   */
  protected getRecoveryOptions(): RecoveryOptions {
    return {
      searchFilters: [
        {
          field: 'email_addresses',
          value: '', // Will be set dynamically in attemptRecovery
          operator: 'contains',
        },
      ],
      maxAttempts: 1,
    };
  }

  /**
   * Person-specific recovery implementation
   * Attempts to find person by primary email address
   */
  protected async attemptRecovery(
    context: ResourceCreatorContext,
    normalizedInput?: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (!normalizedInput) {
      throw this.createEnhancedError(
        new Error('Person creation returned empty/invalid record'),
        context,
        500
      );
    }

    // Try recovery by primary email
    const email = Array.isArray(normalizedInput.email_addresses)
      ? (normalizedInput.email_addresses[0] as string)
      : undefined;

    try {
      if (email) {
        const { data: searchResult } = await context.client.post(
          `${this.endpoint}/search`,
          {
            filter: { email_addresses: { contains: email } },
            limit: 1,
            order: { created_at: 'desc' },
          }
        );

        const record = this.extractRecordFromSearch(searchResult);
        if (
          (record as Record<string, unknown>)?.id &&
          safeExtractRecordId(record)
        ) {
          context.debug(
            this.constructor.name,
            'Person recovery succeeded by email',
            {
              email,
              recordId: (
                (record as Record<string, unknown>)?.id as Record<
                  string,
                  unknown
                >
              )?.record_id,
            }
          );
          return record as AttioRecord;
        }
      }
    } catch (e) {
      context.debug(this.constructor.name, 'Person recovery failed', {
        message: (e as Error)?.message,
      });
    }

    throw this.createEnhancedError(
      new Error('Person creation and recovery both failed'),
      context,
      500
    );
  }

  /**
   * Processes response with person-specific logic
   * Includes recovery attempt with normalized input
   */
  protected async processResponse(
    response: Record<string, unknown>,
    context: ResourceCreatorContext,
    normalizedInput?: Record<string, unknown>
  ): Promise<AttioRecord> {
    context.debug(this.constructor.name, `${this.resourceType} API response`, {
      status: response?.status,
      statusText: response?.statusText,
      hasData: !!response?.data,
      hasNestedData: !!(response?.data as Record<string, unknown>)?.data,
    });

    let record = this.extractRecordFromResponse(response);
    record = this.enrichRecordId(record, response);

    // Handle empty response with recovery attempt
    const mustRecover =
      !record ||
      !(record as Record<string, unknown>).id ||
      !safeExtractRecordId(record);
    if (mustRecover && normalizedInput) {
      record = await this.attemptRecovery(context, normalizedInput);
    }

    return this.finalizeRecord(record, context);
  }

  /**
   * Extracts record from API response
   */
  private extractRecordFromResponse(
    response: Record<string, unknown>
  ): Record<string, unknown> {
    return extractAttioRecord(response) || {};
  }

  /**
   * Extracts record from search results
   */
  private extractRecordFromSearch(
    searchData: Record<string, unknown>
  ): Record<string, unknown> {
    return extractAttioRecord(searchData) || {};
  }

  /**
   * Finalizes record processing
   */
  private finalizeRecord(
    record: Record<string, unknown>,
    context: ResourceCreatorContext
  ): AttioRecord {
    assertLooksLikeCreated(record, `${this.constructor.name}.create`);

    /* istanbul ignore next */
    if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
      createScopedLogger('PersonCreator', 'finalizeRecord').debug(
        'extracted keys',
        {
          keys:
            record && typeof record === 'object'
              ? Object.keys(record)
              : [typeof record],
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
