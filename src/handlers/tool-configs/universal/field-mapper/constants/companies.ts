/**
 * Company field mappings and validation rules
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { FieldMapping } from '../types.js';

/**
 * Field mapping configuration for companies resource type
 */
export const COMPANIES_FIELD_MAPPING: FieldMapping = {
  fieldMappings: {
    // Common incorrect field names -> correct ones
    website: 'domains',
    url: 'domains',
    company_name: 'name',
    company_domain: 'domains',
    primary_domain: 'domains',
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
    'name',
    'domains',
    'type',
    'industry',
    'categories',
    'description',
    'founded',
    'estimated_arr',
    'employee_count',
    'location',
    'notes',
    'primary_domain',
    'twitter',
    'linkedin',
    'facebook',
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
