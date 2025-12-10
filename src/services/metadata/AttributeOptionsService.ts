/**
 * Service for retrieving attribute options (select, multi-select, status).
 * Provides a unified interface for fetching valid options from Attio.
 */

import {
  getSelectOptions,
  getListSelectOptions,
  getStatusOptions,
} from '@/api/attio-client.js';
import type { AttioSelectOption, AttioStatusOption } from '@/api/types.js';
import { error as logError } from '@/utils/logger.js';

/**
 * Result structure for attribute options
 */
export interface AttributeOptionsResult {
  options: (AttioSelectOption | AttioStatusOption)[];
  attributeType: 'select' | 'status';
}

/**
 * Service for fetching attribute options from Attio.
 * Handles both select/multi-select and status attribute types.
 */
export class AttributeOptionsService {
  /**
   * Gets options for any option-based attribute (select, multi-select, status).
   * Auto-detects attribute type by trying select first, then status.
   *
   * @param objectSlug - The object slug (e.g., "companies", "people", "deals")
   * @param attributeSlug - The attribute slug (e.g., "channel", "stage")
   * @param showArchived - Whether to include archived options
   * @returns Options with attribute type information
   */
  static async getOptions(
    objectSlug: string,
    attributeSlug: string,
    showArchived?: boolean
  ): Promise<AttributeOptionsResult> {
    let selectOptions: AttioSelectOption[] = [];
    let selectError: unknown = null;
    let statusError: unknown = null;

    // Try select endpoint first (covers select and multi-select)
    try {
      selectOptions = await getSelectOptions(
        objectSlug,
        attributeSlug,
        showArchived
      );
    } catch (err) {
      selectError = err;
    }

    // Select succeeded with results → return as select
    if (!selectError && selectOptions.length > 0) {
      return {
        options: selectOptions,
        attributeType: 'select',
      };
    }

    // Select empty or failed → try status endpoint
    // This handles status attributes like deals.stage where /options returns []
    // but /statuses returns actual values (Issue #987)
    try {
      const statuses = await getStatusOptions(
        objectSlug,
        attributeSlug,
        showArchived
      );
      // Status endpoint succeeded → treat as status type (even if empty)
      return {
        options: statuses,
        attributeType: 'status',
      };
    } catch (err) {
      statusError = err;
      logError(
        'AttributeOptionsService',
        `Status endpoint failed for ${objectSlug}.${attributeSlug}`,
        err,
        { objectSlug, attributeSlug }
      );
    }

    // Status failed but select succeeded with empty → return empty select
    // (legitimate case for unconfigured select attributes)
    if (!selectError) {
      return {
        options: selectOptions,
        attributeType: 'select',
      };
    }

    // Both failed → throw with detailed error context
    const selectMsg =
      selectError instanceof Error ? selectError.message : String(selectError);
    const statusMsg =
      statusError instanceof Error ? statusError.message : String(statusError);

    logError(
      'AttributeOptionsService',
      `Failed to get options for ${objectSlug}.${attributeSlug}`,
      selectError instanceof Error ? selectError : new Error(selectMsg),
      { selectError: selectMsg, statusError: statusMsg }
    );

    throw new Error(
      `Attribute "${attributeSlug}" on "${objectSlug}" does not support options. ` +
        `This may not be a select, multi-select, or status attribute. ` +
        `Select error: ${selectMsg}; Status error: ${statusMsg}`
    );
  }

  /**
   * Gets options for a select attribute on a list.
   *
   * @param listId - The list ID or slug
   * @param attributeSlug - The attribute slug
   * @param showArchived - Whether to include archived options
   * @returns Options with attribute type information
   */
  static async getListOptions(
    listId: string,
    attributeSlug: string,
    showArchived?: boolean
  ): Promise<AttributeOptionsResult> {
    try {
      const options = await getListSelectOptions(
        listId,
        attributeSlug,
        showArchived
      );
      return {
        options,
        attributeType: 'select',
      };
    } catch (err) {
      logError(
        'AttributeOptionsService',
        `Failed to get list options for ${listId}.${attributeSlug}`,
        err,
        { listId, attributeSlug }
      );
      throw err;
    }
  }
}
