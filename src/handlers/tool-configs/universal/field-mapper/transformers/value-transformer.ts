/**
 * Field value transformation functions
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';

/**
 * Transforms field values to match Attio API expectations
 * Handles complex field value transformations for each resource type
 */
export async function transformFieldValue(
  resourceType: UniversalResourceType,
  fieldName: string,
  value: unknown
): Promise<unknown> {
  // Handle domains field for companies
  if (
    resourceType === UniversalResourceType.COMPANIES &&
    fieldName === 'domains'
  ) {
    // If value is already in correct format, return as-is
    if (
      Array.isArray(value) &&
      value.every((v) => typeof v === 'object' && 'domain' in v)
    ) {
      return value;
    }

    // If value is an array of strings, transform to domain objects
    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      return value.map((domain) => ({ domain }));
    }

    // If value is a single string, transform to array with domain object
    if (typeof value === 'string') {
      return [{ domain: value }];
    }

    // If value is a single domain object, wrap in array
    if (typeof value === 'object' && value !== null && 'domain' in value) {
      return [value];
    }
  }

  // Handle email_addresses field for people
  if (
    resourceType === UniversalResourceType.PEOPLE &&
    fieldName === 'email_addresses'
  ) {
    // If value is already in correct format, return as-is
    if (
      Array.isArray(value) &&
      value.every((v) => typeof v === 'object' && 'email_address' in v)
    ) {
      return value;
    }

    // If value is an array of strings, transform to email objects
    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      return value.map((email) => ({ email_address: email }));
    }

    // If value is a single string, transform to array with email object
    if (typeof value === 'string') {
      return [{ email_address: value }];
    }

    // If value is a single email object, wrap in array
    if (
      typeof value === 'object' &&
      value !== null &&
      'email_address' in value
    ) {
      return [value];
    }
  }

  // Handle phone_numbers field for people
  if (
    resourceType === UniversalResourceType.PEOPLE &&
    fieldName === 'phone_numbers'
  ) {
    // If value is already in correct format, return as-is
    if (
      Array.isArray(value) &&
      value.every((v) => typeof v === 'object' && 'phone_number' in v)
    ) {
      return value;
    }

    // If value is an array of strings, transform to phone objects
    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      return value.map((phone) => ({ phone_number: phone }));
    }

    // If value is a single string, transform to array with phone object
    if (typeof value === 'string') {
      return [{ phone_number: value }];
    }

    // If value is a single phone object, wrap in array
    if (
      typeof value === 'object' &&
      value !== null &&
      'phone_number' in value
    ) {
      return [value];
    }
  }

  // People.company → [{ record_id }] (normalize all formats to array-of-refs)
  if (
    resourceType === UniversalResourceType.PEOPLE &&
    fieldName === 'company'
  ) {
      if (typeof v === 'string') return { record_id: v };
      if (v && typeof v === 'object') {
        if (obj.record_id) return { record_id: obj.record_id };
        if (obj.id && typeof obj.id === 'object') {
          if (idObj.record_id) return { record_id: idObj.record_id };
        }
        if (obj.id) return { record_id: obj.id };
      }
      return v; // last-resort passthrough
    };

    if (Array.isArray(value)) return value.map(toRef);
    return [toRef(value)];
  }

  // Deals.associated_company / associated_people → [{ record_id }]
  if (
    resourceType === UniversalResourceType.DEALS &&
    (fieldName === 'associated_company' || fieldName === 'associated_people')
  ) {
      (typeof v === 'string' && { record_id: v }) ||
      (v && typeof v === 'object' && 'record_id' in v ? v : null);

    return refs.length ? refs : value;
  }

  // Tasks field transformations
  if (resourceType === UniversalResourceType.TASKS) {
    if (fieldName === 'is_completed') {
      return b === undefined ? value : b;
    }
    if (fieldName === 'deadline_at') {
      // accept Date, number (ms), or string; output ISO
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'number') return new Date(value).toISOString();
      if (typeof value === 'string') {
        return isNaN(d.getTime()) ? value : d.toISOString();
      }
    }
    if (fieldName === 'assignees') {
      // Convert single string to array for assignees field
      if (typeof value === 'string') {
        return [value];
      }
      // If already an array, return as-is
      if (Array.isArray(value)) {
        return value;
      }
      // For other types, wrap in array
      return [value];
    }
  }

  // Default: return value unchanged
  return value;
}
