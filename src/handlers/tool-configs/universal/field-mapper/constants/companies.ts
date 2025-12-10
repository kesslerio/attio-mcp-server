/**
 * Company field mappings and validation rules
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { FieldMapping } from '../types.js';
import {
  createDisplayNameConstants,
  createPluralMappingConstants,
  validateFieldMappingConstants,
} from '../utils/field-mapping-constants.js';

// Display name constants for better maintainability (Issue #720)
const DISPLAY_NAMES = createDisplayNameConstants({
  COMPANY_NAME: 'company name',
  COMPANY_DOMAIN: 'company domain',
  COMPANY_TYPE: 'company type',
  FOUNDED_DATE: 'founded date',
});

// Plural to singular mapping pattern (Issue #720)
const PLURAL_MAPPINGS = createPluralMappingConstants({
  websites: 'domains',
  urls: 'domains',
  domains: 'domains', // Keep for consistency
});

// Validate constants for consistency
const validation = validateFieldMappingConstants(
  DISPLAY_NAMES,
  PLURAL_MAPPINGS
);
if (!validation.valid) {
  console.warn(
    'Companies field mapping constants validation issues:',
    validation.issues
  );
}

/**
 * Field mapping configuration for companies resource type
 */
export const COMPANIES_FIELD_MAPPING: FieldMapping = {
  fieldMappings: {
    // Display names from discover-attributes
    [DISPLAY_NAMES.COMPANY_NAME]: 'name',
    [DISPLAY_NAMES.COMPANY_DOMAIN]: 'domains',
    [DISPLAY_NAMES.COMPANY_TYPE]: 'type',
    [DISPLAY_NAMES.FOUNDED_DATE]: 'founded',
    // Common incorrect field names -> correct ones
    website: 'domains',
    url: 'domains',
    company_name: 'name',
    company_domain: 'domains',
    primary_domain: 'domains',
    ...PLURAL_MAPPINGS, // Use consolidated plural mappings
    // Note: Companies have a 'description' field - don't map to 'notes'
    note: 'description',
    size: 'estimated_arr',
    revenue: 'estimated_arr',
    // Remove harmful mappings that break valid fields
    // typpe: 'type', // Don't map - 'typpe' is a valid field in Attio
    company_type: 'type',
    founded_date: 'founded',
    founding_date: 'founded',
    year_founded: 'founded',
  },
  validFields: [
    // Core fields
    'name',
    'domains',
    'description',
    'categories',
    'industry',
    'type',
    'typpe', // Valid Attio field (not a typo)

    // Size and financials
    'team_size',
    'employee_count',
    'estimated_arr',
    'revenue',
    'founded',
    'founded_at',

    // Location fields
    'location',
    'locations',
    'primary_location',
    'headquarters',

    // Social media - canonical names
    'linkedin',
    'twitter',
    'facebook',
    'instagram',
    'angellist',
    'crunchbase',

    // Social media - alias forms (for validation acceptance)
    'linkedin_url',
    'twitter_url',
    'twitter_handle',
    'facebook_url',

    // Relationships
    'team', // Associated people
    'associated_deals',
    'associated_workspaces',

    // Other standard fields
    'notes',
    'primary_domain',
  ],
  commonMistakes: {
    domain:
      'Use "domains" (plural) as an array, e.g., domains: ["example.com"]',
    website: 'Use "domains" field with an array of domain names',
    notes:
      'Notes are separate objects linked to companies, not company attributes. Use "description" field for company descriptions',
    revenue: 'Use "estimated_arr" for revenue/ARR data',
  },
  requiredFields: ['name'],
  uniqueFields: ['domains'],
};
