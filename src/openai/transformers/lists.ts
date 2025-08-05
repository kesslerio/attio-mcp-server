/**
 * Transformer for list records
 * Converts Attio list data to OpenAI format
 */

import type { OpenAIFetchResult, OpenAISearchResult } from '../types.js';
import { extractAttributeValue, generateRecordUrl } from './index.js';

export const transformList = {
  /**
   * Transform list to search result format
   */
  toSearchResult(list: any): OpenAISearchResult {
    const id = list.id?.list_id || list.id?.record_id || list.id;
    const name = list.name || extractAttributeValue(list.attributes?.name);
    const description =
      list.description || extractAttributeValue(list.attributes?.description);

    // Build text description
    const textParts = [];

    if (description) {
      textParts.push(description);
    }

    // Add entry count if available
    if (list.entry_count !== undefined) {
      textParts.push(`${list.entry_count} entries`);
    }

    // Add list type/parent object info
    if (list.parent_object) {
      textParts.push(`Type: ${list.parent_object} list`);
    }

    // Add created by info if available
    if (list.created_by?.name) {
      textParts.push(`Created by: ${list.created_by.name}`);
    }

    return {
      id: `lists:${id}`,
      title: name || 'Unnamed List',
      text: textParts.join(' • ') || 'No description available',
      url: generateRecordUrl(id, 'lists'),
    };
  },

  /**
   * Transform list to fetch result format with full details
   */
  toFetchResult(list: any): OpenAIFetchResult {
    const searchResult = this.toSearchResult(list);

    // Collect all metadata
    const metadata: Record<string, any> = {};

    // Basic list information
    if (list.parent_object) {
      metadata.parent_object = list.parent_object;
    }

    if (list.entry_count !== undefined) {
      metadata.entry_count = list.entry_count;
    }

    // List configuration
    if (list.api_slug) {
      metadata.api_slug = list.api_slug;
    }

    if (list.workspace_id) {
      metadata.workspace_id = list.workspace_id;
    }

    // Access and visibility
    if (list.access_level) {
      metadata.access_level = list.access_level;
    }

    if (list.is_private !== undefined) {
      metadata.is_private = list.is_private;
    }

    // Sorting and filtering configuration
    if (list.default_sort) {
      metadata.default_sort = list.default_sort;
    }

    if (list.default_filter) {
      metadata.default_filter = list.default_filter;
    }

    // Attributes/columns configuration
    if (list.attributes && Array.isArray(list.attributes)) {
      metadata.attributes = list.attributes.map((attr: any) => ({
        id: attr.id,
        name: attr.name,
        type: attr.type,
        is_required: attr.is_required,
        is_unique: attr.is_unique,
      }));
    }

    // Creator information
    if (list.created_by) {
      metadata.created_by = {
        id: list.created_by.id,
        name: list.created_by.name,
        email: list.created_by.email,
      };
    }

    // Last modified by
    if (list.updated_by) {
      metadata.updated_by = {
        id: list.updated_by.id,
        name: list.updated_by.name,
        email: list.updated_by.email,
      };
    }

    // Permissions
    if (list.permissions) {
      metadata.permissions = list.permissions;
    }

    // Webhook configuration
    if (list.webhooks && Array.isArray(list.webhooks)) {
      metadata.webhook_count = list.webhooks.length;
    }

    // Add timestamps
    if (list.created_at) {
      metadata.created_at = list.created_at;
    }
    if (list.updated_at) {
      metadata.updated_at = list.updated_at;
    }

    return {
      ...searchResult,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  },
};
