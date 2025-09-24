/**
 * Deals field mappings and validation rules
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { FieldMapping } from '../types.js';

/**
 * Field mapping configuration for deals resource type
 */
export const DEALS_FIELD_MAPPING: FieldMapping = {
  fieldMappings: {
    // Display names from discover-attributes (Issue #687)
    'deal name': 'name',
    'deal stage': 'stage',
    'deal value': 'value',
    'associated company': 'associated_company',
    // Value variations
    amount: 'value',
    deal_amount: 'value',
    price: 'value',
    revenue: 'value',
    // Name variations
    title: 'name',
    deal_name: 'name',
    deal_title: 'name',
    opportunity_name: 'name',
    // Stage variations
    status: 'stage',
    deal_stage: 'stage',
    pipeline_stage: 'stage',
    deal_status: 'stage',
    // Company variations (Issue #720: Enhanced field name validation)
    company: 'associated_company',
    companies: 'associated_company', // Issue #720: Map plural form
    company_id: 'associated_company',
    primary_company: 'associated_company',
    account: 'associated_company',
    accounts: 'associated_company', // Plural form
    customer: 'associated_company',
    customers: 'associated_company', // Plural form
    client: 'associated_company',
    clients: 'associated_company',
    organization: 'associated_company',
    organizations: 'associated_company',
    // People variations
    contact: 'associated_people',
    contacts: 'associated_people',
    person: 'associated_people', // Singular form
    primary_contact: 'associated_people',
    people: 'associated_people',
    // Owner variations
    owners: 'owner', // Plural form for owner
    // Invalid fields that users often try
    description: null, // Not available for deals
    notes: null, // Should be created separately
    close_date: null, // Not a built-in field
    expected_close_date: null,
    probability: null,
    source: null,
    lead_source: null,
    currency: null, // Handled automatically
    tags: null,
    labels: null,
    type: null,
    deal_type: null,
  },
  validFields: [
    'name',
    'stage',
    'value',
    'owner',
    'associated_company',
    'associated_people',
  ],
  commonMistakes: {
    'deal name':
      'Display name from discover-attributes. Maps to API field "name"',
    'deal stage':
      'Display name from discover-attributes. Maps to API field "stage"',
    'deal value':
      'Display name from discover-attributes. Maps to API field "value"',
    'associated company':
      'Display name from discover-attributes. Maps to API field "associated_company"',
    company_id: 'Use "associated_company" to link deals to companies',
    company: 'Use "associated_company" with the company record ID',
    companies:
      'Use "associated_company" to link deals to companies (maps plural to singular form)',
    primary_company: 'Use "associated_company" instead of "primary_company"',
    client: 'Use "associated_company" to link clients to deals',
    clients:
      'Use "associated_company" to link clients to deals (maps plural to singular form)',
    organization: 'Use "associated_company" to link organizations to deals',
    organizations:
      'Use "associated_company" to link organizations to deals (maps plural to singular form)',
    amount: 'Use "value" for deal amounts (numeric only, no currency symbols)',
    status: 'Use "stage" for deal pipeline stages',
    description:
      'Deals do not have a description field. Create notes separately after the deal',
    close_date:
      'Close date is not a built-in field. Use custom fields if needed',
    probability:
      'Probability is not a built-in field. Track in stage names or custom fields',
    currency: 'Currency is set automatically based on workspace settings',
    contact: 'Use "associated_people" to link contacts to deals',
    person:
      'Use "associated_people" to link people to deals (maps singular to plural form)',
    owners:
      'Use "owner" to assign deal ownership (maps plural to singular form)',
  },
  requiredFields: ['name', 'stage'],
  uniqueFields: [],
};
