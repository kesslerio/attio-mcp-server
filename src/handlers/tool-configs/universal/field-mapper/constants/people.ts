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

    // LinkedIn aliases (common mistakes)
    linkedin_url: 'linkedin',
    linkedin_link: 'linkedin',
    linkedinUrl: 'linkedin',
    linkedIn: 'linkedin',

    // Twitter aliases (common mistakes)
    twitter_url: 'twitter',
    twitter_handle: 'twitter',
    twitter_link: 'twitter',
    twitterHandle: 'twitter',
    twitterUrl: 'twitter',

    // Facebook aliases
    facebook_url: 'facebook',
    facebook_link: 'facebook',
    facebookUrl: 'facebook',
  },
  validFields: [
    // Core fields
    'name',
    'first_name',
    'last_name',
    'email_addresses',
    'phone_numbers',
    'title',
    'description',

    // Primary contact fields
    'primary_email_address',
    'primary_phone_number',

    // Profile fields
    'avatar_url',
    'timezone',
    'location',

    // Social media - canonical names
    'linkedin',
    'twitter',
    'facebook',
    'instagram',

    // Social media - alias forms (for validation acceptance)
    'linkedin_url',
    'twitter_url',
    'twitter_handle',
    'facebook_url',

    // Relationships
    'company',
    'associated_deals',
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
