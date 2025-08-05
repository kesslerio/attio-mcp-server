/**
 * Transformer for company records
 * Converts Attio company data to OpenAI format
 */

import type { OpenAIFetchResult, OpenAISearchResult } from '../types.js';
import {
  buildTextDescription,
  extractAttributeValue,
  generateRecordUrl,
} from './index.js';

export const transformCompany = {
  /**
   * Transform company to search result format
   */
  toSearchResult(company: any): OpenAISearchResult {
    const id = company.id?.record_id || company.id;
    const name = extractAttributeValue(
      company.attributes?.name || company.name
    );
    const domain = extractAttributeValue(
      company.attributes?.domains || company.domains
    );
    const description = extractAttributeValue(
      company.attributes?.description || company.description
    );

    // Build text from multiple fields
    const textParts = [];
    if (domain) textParts.push(`Domain: ${domain}`);
    if (description) textParts.push(description);

    // Add location info if available
    const city = extractAttributeValue(company.attributes?.city);
    const state = extractAttributeValue(company.attributes?.state);
    const country = extractAttributeValue(company.attributes?.country);
    const location = [city, state, country].filter(Boolean).join(', ');
    if (location) textParts.push(`Location: ${location}`);

    // Add industry if available
    const industry = extractAttributeValue(company.attributes?.industry);
    if (industry) textParts.push(`Industry: ${industry}`);

    return {
      id: `companies:${id}`,
      title: name || 'Unnamed Company',
      text: textParts.join(' • ') || 'No description available',
      url: generateRecordUrl(id, 'companies'),
    };
  },

  /**
   * Transform company to fetch result format with full details
   */
  toFetchResult(company: any): OpenAIFetchResult {
    const searchResult = this.toSearchResult(company);

    // Collect all metadata
    const metadata: Record<string, any> = {};

    // Basic info
    const attributes = company.attributes || {};

    // Contact information
    if (attributes.phone_numbers) {
      metadata.phone_numbers = extractAttributeValue(attributes.phone_numbers);
    }
    if (attributes.email_addresses) {
      metadata.email_addresses = extractAttributeValue(
        attributes.email_addresses
      );
    }

    // Business information
    const businessFields = [
      'industry',
      'company_size',
      'founded_date',
      'revenue',
      'employee_count',
      'funding_stage',
      'total_funding',
    ];

    for (const field of businessFields) {
      const value = extractAttributeValue(attributes[field]);
      if (value) {
        metadata[field] = value;
      }
    }

    // Social profiles
    const socialFields = [
      'linkedin_url',
      'twitter_url',
      'facebook_url',
      'instagram_url',
      'youtube_url',
      'github_url',
    ];

    for (const field of socialFields) {
      const value = extractAttributeValue(attributes[field]);
      if (value) {
        metadata[field] = value;
      }
    }

    // Address information
    const addressFields = [
      'street_address',
      'city',
      'state',
      'postal_code',
      'country',
    ];
    const address: Record<string, string> = {};

    for (const field of addressFields) {
      const value = extractAttributeValue(attributes[field]);
      if (value) {
        address[field] = value;
      }
    }

    if (Object.keys(address).length > 0) {
      metadata.address = address;
    }

    // Tags and categories
    if (attributes.tags) {
      metadata.tags = extractAttributeValue(attributes.tags);
    }
    if (attributes.categories) {
      metadata.categories = extractAttributeValue(attributes.categories);
    }

    // Relationships
    if (company.relationships) {
      metadata.relationships = company.relationships;
    }

    // Add created and updated timestamps
    if (company.created_at) {
      metadata.created_at = company.created_at;
    }
    if (company.updated_at) {
      metadata.updated_at = company.updated_at;
    }

    return {
      ...searchResult,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  },
};
