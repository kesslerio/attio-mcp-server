/**
 * Generic transformer for any record type
 * Provides fallback transformation when specific transformers aren't available
 */

import type { OpenAIFetchResult, OpenAISearchResult } from '../types.js';
import { extractAttributeValue, generateRecordUrl } from './index.js';

export const transformGenericRecord = {
  /**
   * Transform generic record to search result format
   */
  toSearchResult(record: any, resourceType: string): OpenAISearchResult {
    const id = record.id?.record_id || record.id;

    // Try to extract a title from common fields
    const titleCandidates = [
      'name',
      'title',
      'subject',
      'headline',
      'label',
      'display_name',
      'full_name',
      'company_name',
    ];

    let title = '';
    for (const candidate of titleCandidates) {
      const value = extractAttributeValue(
        record.attributes?.[candidate] || record[candidate]
      );
      if (value) {
        title = value;
        break;
      }
    }

    // Try to build description from common fields
    const descriptionCandidates = [
      'description',
      'summary',
      'about',
      'bio',
      'content',
      'details',
      'notes',
      'overview',
    ];

    const textParts = [];
    for (const candidate of descriptionCandidates) {
      const value = extractAttributeValue(
        record.attributes?.[candidate] || record[candidate]
      );
      if (value) {
        textParts.push(value);
        break;
      }
    }

    // Add type information
    textParts.push(`Type: ${resourceType}`);

    // Add any email or domain if available
    const email = extractAttributeValue(record.attributes?.email_addresses);
    if (email) textParts.push(`Email: ${email}`);

    const domain = extractAttributeValue(record.attributes?.domains);
    if (domain) textParts.push(`Domain: ${domain}`);

    return {
      id: `${resourceType}:${id}`,
      title: title || `${resourceType} Record`,
      text: textParts.join(' • ') || 'No details available',
      url: generateRecordUrl(id, resourceType),
    };
  },

  /**
   * Transform generic record to fetch result format with all available data
   */
  toFetchResult(record: any, resourceType: string): OpenAIFetchResult {
    const searchResult = this.toSearchResult(record, resourceType);

    // For generic records, include all attributes as metadata
    const metadata: Record<string, any> = {
      _type: resourceType,
    };

    // Add all attributes
    if (record.attributes && typeof record.attributes === 'object') {
      const attributes: Record<string, any> = {};

      for (const [key, value] of Object.entries(record.attributes)) {
        const extractedValue = extractAttributeValue(value);
        if (extractedValue) {
          attributes[key] = extractedValue;
        }
      }

      if (Object.keys(attributes).length > 0) {
        metadata.attributes = attributes;
      }
    }

    // Add direct properties (excluding special ones)
    const excludeKeys = [
      'id',
      'attributes',
      'created_at',
      'updated_at',
      'relationships',
      'name',
      'title',
      'description',
    ];

    for (const [key, value] of Object.entries(record)) {
      if (!excludeKeys.includes(key) && value !== null && value !== undefined) {
        metadata[key] = value;
      }
    }

    // Add relationships
    if (record.relationships && Object.keys(record.relationships).length > 0) {
      metadata.relationships = record.relationships;
    }

    // Add timestamps
    if (record.created_at) {
      metadata.created_at = record.created_at;
    }
    if (record.updated_at) {
      metadata.updated_at = record.updated_at;
    }

    return {
      ...searchResult,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  },
};
