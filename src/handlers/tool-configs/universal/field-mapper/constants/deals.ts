/**
 * Deals field mappings and validation rules
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { FieldMapping } from '../types.js';
import {
  createDisplayNameConstants,
  createPluralMappingConstants,
} from '../utils/field-mapping-constants.js';

// Display name constants for better maintainability (Issue #720)
const DISPLAY_NAMES = createDisplayNameConstants({
  DEAL_NAME: 'deal name',
  DEAL_STAGE: 'deal stage',
  DEAL_VALUE: 'deal value',
  DEAL_OWNER: 'deal owner',
  ASSOCIATED_COMPANY: 'associated company',
  ASSOCIATED_PEOPLE: 'associated people',
  UTM_SOURCE: 'utm source',
  UTM_MEDIUM: 'utm medium',
  UTM_CAMPAIGN: 'utm campaign',
  UTM_CONTENT: 'utm content',
  UTM_TERM: 'utm term',
});

// Plural to singular mapping pattern (Issue #720)
const PLURAL_MAPPINGS = createPluralMappingConstants({
  companies: 'associated_company',
  organizations: 'associated_company',
  clients: 'associated_company',
  accounts: 'associated_company',
  customers: 'associated_company',
  contacts: 'associated_people',
  owners: 'owner',
});

/**
 * Field mapping configuration for deals resource type
 */
export const DEALS_FIELD_MAPPING: FieldMapping = {
  fieldMappings: {
    // Display names from discover-attributes (Issue #687)
    [DISPLAY_NAMES.DEAL_NAME]: 'name',
    [DISPLAY_NAMES.DEAL_STAGE]: 'stage',
    [DISPLAY_NAMES.DEAL_VALUE]: 'value',
    [DISPLAY_NAMES.DEAL_OWNER]: 'owner',
    [DISPLAY_NAMES.ASSOCIATED_COMPANY]: 'associated_company',
    [DISPLAY_NAMES.ASSOCIATED_PEOPLE]: 'associated_people',
    [DISPLAY_NAMES.UTM_SOURCE]: 'utm_source',
    [DISPLAY_NAMES.UTM_MEDIUM]: 'utm_medium',
    [DISPLAY_NAMES.UTM_CAMPAIGN]: 'utm_campaign',
    [DISPLAY_NAMES.UTM_CONTENT]: 'utm_content',
    [DISPLAY_NAMES.UTM_TERM]: 'utm_term',
    // Owner variations
    'deal owner': 'owner',
    owner_id: 'owner',
    assignee: 'owner',
    assigned_to: 'owner',
    owner: 'owner',
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
    ...PLURAL_MAPPINGS, // Use consolidated plural mappings
    company_id: 'associated_company',
    primary_company: 'associated_company',
    account: 'associated_company',
    customer: 'associated_company',
    client: 'associated_company',
    organization: 'associated_company',
    // People variations
    contact: 'associated_people',
    person: 'associated_people', // Singular form
    primary_contact: 'associated_people',
    people: 'associated_people',
    'associated person': 'associated_people',
    'associated people': 'associated_people',
    associated_person: 'associated_people',
    associated_people: 'associated_people',
    // UTM fields
    utm_source: 'utm_source',
    utm_medium: 'utm_medium',
    utm_campaign: 'utm_campaign',
    utm_content: 'utm_content',
    utm_term: 'utm_term',
    utmSource: 'utm_source',
    utmMedium: 'utm_medium',
    utmCampaign: 'utm_campaign',
    utmContent: 'utm_content',
    utmTerm: 'utm_term',
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
  } as const,
  validFields: [
    'name',
    'stage',
    'value',
    'owner',
    'associated_company',
    'associated_people',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
  ] as const,
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
    'deal owner':
      'Display name from discover-attributes. Maps to API field "owner"',
    owner_id: 'Use "owner" to assign deal ownership',
    assignee: 'Use "owner" to assign deal ownership',
    assigned_to: 'Use "owner" to assign deal ownership',
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
  requiredFields: ['name', 'stage'] as const,
  uniqueFields: [] as const,
} as const;
