/**
 * Field value transformation functions
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';

/**
 * Converts various value types to boolean for task completion status
 * Supports common task status strings and values
 */
function toBooleanish(v: any): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (
      [
        'done',
        'complete',
        'completed',
        'true',
        'yes',
        'y',
        '1',
        'closed',
      ].includes(s)
    )
      return true;
    if (['open', 'pending', 'in progress', 'false', 'no', 'n', '0'].includes(s))
      return false;
  }
  return undefined;
}

/**
 * Transforms field values to match Attio API expectations
 * Handles complex field value transformations for each resource type
 */
export async function transformFieldValue(
  resourceType: UniversalResourceType,
  fieldName: string,
  value: any,
  options?: { skipDomainPreflight?: boolean }
): Promise<any> {
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
    const toRef = (v: any) => {
      if (typeof v === 'string') return { record_id: v };
      if (v?.record_id) return { record_id: v.record_id };
      if (v?.id?.record_id) return { record_id: v.id.record_id };
      if (v?.id) return { record_id: v.id };
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
    const toRef = (v: any) =>
      (typeof v === 'string' && { record_id: v }) ||
      (v && typeof v === 'object' && 'record_id' in v ? v : null);

    const arr = Array.isArray(value) ? value : [value];
    const refs = arr.map(toRef).filter(Boolean);
    return refs.length ? refs : value;
  }

  // Tasks field transformations
  if (resourceType === UniversalResourceType.TASKS) {
    if (fieldName === 'is_completed') {
      const b = toBooleanish(value);
      return b === undefined ? value : b;
    }
    if (fieldName === 'deadline_at') {
      // accept Date, number (ms), or string; output ISO
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'number') return new Date(value).toISOString();
      if (typeof value === 'string') {
        const d = new Date(value);
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