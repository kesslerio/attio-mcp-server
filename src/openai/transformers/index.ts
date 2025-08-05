/**
 * Main transformer module that delegates to specific transformers
 * based on resource type
 */

import { debug } from '../../utils/logger.js';
import type {
  OpenAIFetchResult,
  OpenAISearchResult,
  SupportedAttioType,
} from '../types.js';
import { transformCompany } from './companies.js';
import { transformGenericRecord } from './generic.js';
import { transformList } from './lists.js';
import { transformPerson } from './people.js';
import { transformTask } from './tasks.js';

/**
 * Transform an Attio record to OpenAI search result format
 * @param record - Attio record
 * @param resourceType - Type of the record
 * @returns OpenAI search result or null if transformation fails
 */
export function transformToSearchResult(
  record: any,
  resourceType: SupportedAttioType
): OpenAISearchResult | null {
  if (!(record && record.id)) {
    return null;
  }

  debug(
    'Transform',
    `Converting ${resourceType} to search result`,
    { resourceType },
    'transformToSearchResult'
  );

  try {
    switch (resourceType) {
      case 'companies':
        return transformCompany.toSearchResult(record);

      case 'people':
        return transformPerson.toSearchResult(record);

      case 'lists':
        return transformList.toSearchResult(record);

      case 'tasks':
        return transformTask.toSearchResult(record);

      default:
        return transformGenericRecord.toSearchResult(record, resourceType);
    }
  } catch (error: any) {
    debug(
      'Transform',
      `Failed to transform ${resourceType} record`,
      { resourceType, error: error.message },
      'transformToSearchResult'
    );
    return null;
  }
}

/**
 * Transform an Attio record to OpenAI fetch result format
 * @param record - Attio record
 * @param resourceType - Type of the record
 * @returns OpenAI fetch result or null if transformation fails
 */
export function transformToFetchResult(
  record: any,
  resourceType: SupportedAttioType
): OpenAIFetchResult | null {
  if (!(record && record.id)) {
    return null;
  }

  debug(
    'Transform',
    `Converting ${resourceType} to fetch result`,
    { resourceType },
    'transformToFetchResult'
  );

  try {
    switch (resourceType) {
      case 'companies':
        return transformCompany.toFetchResult(record);

      case 'people':
        return transformPerson.toFetchResult(record);

      case 'lists':
        return transformList.toFetchResult(record);

      case 'tasks':
        return transformTask.toFetchResult(record);

      default:
        return transformGenericRecord.toFetchResult(record, resourceType);
    }
  } catch (error: any) {
    debug(
      'Transform',
      `Failed to transform ${resourceType} record`,
      { resourceType, error: error.message },
      'transformToFetchResult'
    );
    return null;
  }
}

/**
 * Extract text value from an Attio attribute
 * @param attribute - Attio attribute object
 * @returns String value or empty string
 */
export function extractAttributeValue(attribute: any): string {
  if (!attribute) return '';

  // Handle different attribute structures
  if (typeof attribute === 'string') return attribute;
  if (attribute.value !== undefined) return String(attribute.value);
  if (attribute.text) return attribute.text;
  if (attribute.name) return attribute.name;

  // For arrays, join values
  if (Array.isArray(attribute)) {
    return attribute
      .map((item) => extractAttributeValue(item))
      .filter(Boolean)
      .join(', ');
  }

  // For objects with nested values
  if (attribute.values && Array.isArray(attribute.values)) {
    return attribute.values
      .map((v: any) => extractAttributeValue(v))
      .filter(Boolean)
      .join(', ');
  }

  return '';
}

/**
 * Build a text description from multiple attributes
 * @param attributes - Object containing attributes
 * @param fields - List of field names to include
 * @returns Combined text description
 */
export function buildTextDescription(
  attributes: any,
  fields: string[]
): string {
  const parts: string[] = [];

  for (const field of fields) {
    const value = extractAttributeValue(attributes[field]);
    if (value) {
      parts.push(value);
    }
  }

  return parts.join(' • ');
}

/**
 * Generate a URL for an Attio record
 * @param recordId - Record ID
 * @param resourceType - Type of resource
 * @returns URL string
 */
export function generateRecordUrl(
  recordId: string,
  resourceType: string
): string {
  // You can customize this based on your Attio workspace URL
  const baseUrl = process.env.ATTIO_BASE_URL || 'https://app.attio.com';

  switch (resourceType) {
    case 'companies':
      return `${baseUrl}/objects/companies/${recordId}`;
    case 'people':
      return `${baseUrl}/objects/people/${recordId}`;
    case 'lists':
      return `${baseUrl}/lists/${recordId}`;
    case 'tasks':
      return `${baseUrl}/tasks/${recordId}`;
    default:
      return `${baseUrl}/objects/${resourceType}/${recordId}`;
  }
}
