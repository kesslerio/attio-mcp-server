/**
 * People field mappings and validation rules
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { FieldMapping } from '../types.js';

/**
 * Field mapping configuration for people resource type
 */
export const PEOPLE_FIELD_MAPPING: FieldMapping = {
  fieldMappings: {
    // Name variations
    full_name: 'name',
    person_name: 'name',
    contact_name: 'name',
    first_name: 'name', // Will need special handling
    last_name: 'name', // Will need special handling
    // Email variations
    email: 'email_addresses',
    emails: 'email_addresses',
    email_address: 'email_addresses',
    primary_email: 'email_addresses',
    // Phone variations
    phone: 'phone_numbers',
    phones: 'phone_numbers',
    phone_number: 'phone_numbers',
    mobile: 'phone_numbers',
    cell: 'phone_numbers',
    // Title variations
    job_title: 'title',
    position: 'title',
    role: 'title',
    // Company variations - use 'company' (correct field), not 'company_id'
    organization: 'company',
    employer: 'company',
    // Other fields - 'description' exists on people, don't map to 'notes'
    note: 'description',
    bio: 'description',
  },
  validFields: [
    'name',
    'email_addresses',
    'phone_numbers',
    'title',
    'company',
    'location',
    'twitter',
    'linkedin',
    'facebook',
    'description',
    'first_name',
    'last_name',
  ],
  commonMistakes: {
    email: 'Use "email_addresses" (plural) as an array',
    phone: 'Use "phone_numbers" (plural) as an array',
    first_name:
      'Use "name" field with full name, or pass first_name/last_name in a name object',
    company_id: 'Use "company" field with the company record reference',
    notes: 'Use "description" field for people descriptions',
  },
  requiredFields: ['name'],
  uniqueFields: ['email_addresses'],
};