/**
 * Transformer for people/person records
 * Converts Attio person data to OpenAI format
 */

import type { OpenAIFetchResult, OpenAISearchResult } from '../types.js';
import {
  buildTextDescription,
  extractAttributeValue,
  generateRecordUrl,
} from './index.js';

export const transformPerson = {
  /**
   * Transform person to search result format
   */
  toSearchResult(person: any): OpenAISearchResult {
    const id = person.id?.record_id || person.id;
    const name = extractAttributeValue(person.attributes?.name || person.name);
    const email = extractAttributeValue(
      person.attributes?.email_addresses || person.email_addresses
    );
    const title = extractAttributeValue(
      person.attributes?.job_title || person.job_title
    );
    const company = extractAttributeValue(
      person.attributes?.company || person.company
    );

    // Build text description
    const textParts = [];
    if (title) textParts.push(title);
    if (company) textParts.push(`at ${company}`);
    if (email) textParts.push(`Email: ${email}`);

    // Add phone if available
    const phone = extractAttributeValue(person.attributes?.phone_numbers);
    if (phone) textParts.push(`Phone: ${phone}`);

    // Add location if available
    const location = extractAttributeValue(person.attributes?.location);
    if (location) textParts.push(`Location: ${location}`);

    return {
      id: `people:${id}`,
      title: name || email || 'Unknown Person',
      text: textParts.join(' • ') || 'No details available',
      url: generateRecordUrl(id, 'people'),
    };
  },

  /**
   * Transform person to fetch result format with full details
   */
  toFetchResult(person: any): OpenAIFetchResult {
    const searchResult = this.toSearchResult(person);

    // Collect all metadata
    const metadata: Record<string, any> = {};

    const attributes = person.attributes || {};

    // Professional information
    const professionalFields = [
      'job_title',
      'department',
      'seniority_level',
      'years_in_role',
      'previous_companies',
    ];

    for (const field of professionalFields) {
      const value = extractAttributeValue(attributes[field]);
      if (value) {
        metadata[field] = value;
      }
    }

    // Contact information
    if (attributes.phone_numbers) {
      metadata.phone_numbers = extractAttributeValue(attributes.phone_numbers);
    }
    if (attributes.email_addresses) {
      metadata.email_addresses = extractAttributeValue(
        attributes.email_addresses
      );
    }

    // Social profiles
    const socialFields = [
      'linkedin_url',
      'twitter_url',
      'github_url',
      'personal_website',
    ];

    for (const field of socialFields) {
      const value = extractAttributeValue(attributes[field]);
      if (value) {
        metadata[field] = value;
      }
    }

    // Personal information
    const personalFields = [
      'location',
      'timezone',
      'languages',
      'interests',
      'skills',
    ];

    for (const field of personalFields) {
      const value = extractAttributeValue(attributes[field]);
      if (value) {
        metadata[field] = value;
      }
    }

    // Company relationship
    if (attributes.company) {
      const companyInfo: any = {
        name: extractAttributeValue(attributes.company),
      };

      // If we have a company record reference
      if (person.relationships?.company) {
        companyInfo.record_id = person.relationships.company.record_id;
        companyInfo.url = generateRecordUrl(
          person.relationships.company.record_id,
          'companies'
        );
      }

      metadata.company = companyInfo;
    }

    // Tags and notes
    if (attributes.tags) {
      metadata.tags = extractAttributeValue(attributes.tags);
    }
    if (attributes.notes) {
      metadata.notes = extractAttributeValue(attributes.notes);
    }

    // Lead/contact status
    const statusFields = [
      'lead_status',
      'contact_owner',
      'last_contacted',
      'next_follow_up',
    ];

    for (const field of statusFields) {
      const value = extractAttributeValue(attributes[field]);
      if (value) {
        metadata[field] = value;
      }
    }

    // Add timestamps
    if (person.created_at) {
      metadata.created_at = person.created_at;
    }
    if (person.updated_at) {
      metadata.updated_at = person.updated_at;
    }

    return {
      ...searchResult,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  },
};
