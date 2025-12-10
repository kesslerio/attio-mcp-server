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
  isMultiSelect?: boolean;
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
    // Try select endpoint first (covers select and multi-select)
    try {
      const options = await getSelectOptions(
        objectSlug,
        attributeSlug,
        showArchived
      );
      return {
        options,
        attributeType: 'select',
      };
    } catch (selectError) {
      // Select failed - try status endpoint
      try {
        const statuses = await getStatusOptions(
          objectSlug,
          attributeSlug,
          showArchived
        );
        return {
          options: statuses,
          attributeType: 'status',
        };
      } catch (statusError) {
        // Both failed - re-throw with helpful message
        logError(
          'AttributeOptionsService',
          `Failed to get options for ${objectSlug}.${attributeSlug}`,
          { selectError, statusError }
        );

        // Throw the original select error with enhanced message
        const message =
          selectError instanceof Error
            ? selectError.message
            : String(selectError);
        throw new Error(
          `Attribute "${attributeSlug}" on "${objectSlug}" does not support options. ` +
            `This may not be a select, multi-select, or status attribute. ` +
            `Original error: ${message}`
        );
      }
    }
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
        err
      );
      throw err;
    }
  }
}
