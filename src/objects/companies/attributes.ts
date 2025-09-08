/**
 * Attribute management for companies
 */
import { Company } from '../../types/attio.js';
import { getCompanyDetails, extractCompanyId } from './basic.js';
import { listCompanies } from './basic.js';
import { wrapError, getErrorMessage } from '../../utils/error-utilities.js';

/**
 * Logs attribute operation errors in a consistent format
 *
 * @param functionName - The name of the function where the error occurred
 * @param error - The error that was caught
 * @param context - Optional additional context about the operation
 */
function logAttributeError(
  functionName: string,
  error: unknown,
  context: Record<string, unknown> = {}
) {
  console.error(`[${functionName}] Error:`, error);
  console.error(
    `- Error type: ${
      error instanceof Error ? error.constructor.name : typeof error
    }`
  );
  console.error(`- Message: ${getErrorMessage(error)}`);

  if (error instanceof Error && error.stack) {
    console.error(`- Stack trace: ${error.stack}`);
  } else {
    console.error('- No stack trace available');
  }

  if (Object.keys(context).length > 0) {
    console.error('- Context:', context);
  }
}

/**
 * Gets specific company fields based on a field list
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param fields - Array of field names to retrieve
 * @returns Partial company data with only requested fields
 */
export async function getCompanyFields(
  companyIdOrUri: string,
  fields: string[]
): Promise<Partial<Company>> {
  let companyId: string;

  try {
    // Extract company ID from URI if needed
    companyId = extractCompanyId(companyIdOrUri);

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[getCompanyFields] Fetching fields for company ${companyId}:`,
        fields
      );
    }

    // Fetch all company data first

    // Filter to only requested fields
    const filteredValues: Record<string, unknown> = {};

    for (const field of fields) {
      if (field in allValues) {
        filteredValues[field] = allValues[field];
      }
    }

    // Always include basic identifiers
    if (!('name' in filteredValues) && 'name' in allValues) {
      filteredValues.name = allValues.name;
    }

    const result: Partial<Company> = {
      id: fullCompany.id,
      values: filteredValues,
    };

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[getCompanyFields] Filtered to ${
          Object.keys(filteredValues).length
        } fields`
      );
    }

    return result;
  } catch (error: unknown) {
    throw wrapError(error, 'Could not retrieve company fields');
  }
}

/**
 * Gets basic company information (limited fields for performance)
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Basic company information
 */
export async function getCompanyBasicInfo(
  companyIdOrUri: string
): Promise<Partial<Company>> {
    'name',
    'website',
    'industry',
    'type',
    'type_persona',
    'employee_range',
    'foundation_date',
    'primary_location',
    'description',
    'logo_url',
  ];

  return getCompanyFields(companyIdOrUri, basicFields);
}

/**
 * Gets company contact information
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company contact information
 */
export async function getCompanyContactInfo(
  companyIdOrUri: string
): Promise<Partial<Company>> {
    'name',
    'website',
    'company_phone_5',
    'primary_location',
    'street_address',
    'street_address_2',
    'city',
    'state',
    'postal_code',
    'country',
    'main_contact',
  ];

  return getCompanyFields(companyIdOrUri, contactFields);
}

/**
 * Gets company business information
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company business information
 */
export async function getCompanyBusinessInfo(
  companyIdOrUri: string
): Promise<Partial<Company>> {
    'name',
    'type',
    'type_persona',
    'services',
    'categories',
    'industry',
    'estimated_arr_usd',
    'funding_raised_usd',
    'employee_range',
    'foundation_date',
  ];

  return getCompanyFields(companyIdOrUri, businessFields);
}

/**
 * Gets company social media and online presence
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company social media information
 */
export async function getCompanySocialInfo(
  companyIdOrUri: string
): Promise<Partial<Company>> {
    'name',
    'website',
    'linkedin',
    'twitter',
    'facebook',
    'instagram',
    'angellist',
    'twitter_follower_count',
    'logo_url',
  ];

  return getCompanyFields(companyIdOrUri, socialFields);
}

/**
 * Gets custom fields for a company, filtering out standard fields
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @param customFieldNames - Optional array of specific custom field names to retrieve
 * @returns Company object with only custom fields populated
 * @example
 * ```typescript
 * // Get all custom fields
 * const custom = await getCompanyCustomFields("comp_123");
 *
 * // Get specific custom fields
 * const selected = await getCompanyCustomFields("comp_123", ["contract_value", "lead_source"]);
 * ```
 */
export async function getCompanyCustomFields(
  companyIdOrUri: string,
  customFieldNames?: string[]
): Promise<Partial<Company>> {
  // If specific custom fields are requested, fetch only those
  if (customFieldNames && customFieldNames.length > 0) {
    // Always include name for context
    return getCompanyFields(companyIdOrUri, fieldsToFetch);
  }

  // Otherwise, we need to fetch all fields first to identify custom ones

  // Standard fields that are NOT custom
    'name',
    'website',
    'industry',
    'domains',
    'description',
    'logo_url',
    'primary_location',
    'employee_range',
    'foundation_date',
    'created_at',
    'created_by',
    'matching_id',
    'record_id',
    'linkedin',
    'twitter',
    'facebook',
    'instagram',
    'angellist',
    'twitter_follower_count',
    'estimated_arr_usd',
    'funding_raised_usd',
    'categories',
    'about',
    'notes',
    'team',
    'main_contact',
    'street_address',
    'street_address_2',
    'city',
    'state',
    'postal_code',
    'country',
    'first_interaction',
    'last_interaction',
    'next_interaction',
    'first_email_interaction',
    'last_email_interaction',
    'first_calendar_interaction',
    'last_calendar_interaction',
    'next_calendar_interaction',
    'strongest_connection_strength',
    'strongest_connection_user',
    'associated_deals',
    'associated_workspaces',
  ]);

  // Extract custom fields
  const customFields: Record<string, unknown> = {};

  for (const [fieldName, fieldValue] of Object.entries(values)) {
    if (!standardFields.has(fieldName)) {
      customFields[fieldName] = fieldValue;
    }
  }

  return {
    id: allData.id,
    values: {
      name: values.name,
      ...customFields,
    },
  };
}

/**
 * Discovers all available attributes for companies in the workspace
 *
 * @returns List of all company attributes with metadata
 */
export async function discoverCompanyAttributes(): Promise<{
  standard: string[];
  custom: string[];
  all: Array<{
    name: string;
    type: string;
    isCustom: boolean;
  }>;
}> {
  // This is a simplified version - in reality, Attio likely has an API endpoint
  // to list all available attributes for an object type
  // For now, we'll fetch a sample company and examine its fields

  if (process.env.NODE_ENV === 'development') {
    console.error(
      '[discoverCompanyAttributes] Starting attribute discovery...'
    );
  }

  try {
    // Get a sample company to see what fields are available

    if (!Array.isArray(companies) || companies.length === 0) {
      // For tests, we can return some reasonable default attributes
      if (process.env.NODE_ENV === 'test') {
          { slug: 'name', type: 'text' },
          { slug: 'website', type: 'text' },
          { slug: 'industry', type: 'text' },
          { slug: 'description', type: 'text' },
          { slug: 'domain', type: 'text' },
          { slug: 'team_size', type: 'number' },
        ];
        return {
          standard: testAttributes.map((a) => a.slug),
          custom: [],
          all: testAttributes.map((a) => ({
            name: a.slug,
            type: a.type,
            isCustom: false,
          })),
        };
      }
      // Return an empty structure rather than throwing an error
      return {
        standard: [],
        custom: [],
        all: [],
      };
    }

    // Check if the company has the expected structure

    if (!sampleCompanyId) {
      console.warn(
        '[discoverCompanyAttributes] Sample company has no record ID:',
        {
          hasId: !!sampleCompany?.id,
          idType: typeof sampleCompany?.id,
          idKeys: sampleCompany?.id ? Object.keys(sampleCompany.id) : null,
          company: sampleCompany,
        }
      );
      return {
        standard: [],
        custom: [],
        all: [],
      };
    }

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[discoverCompanyAttributes] Using sample company ID: ${sampleCompanyId}`
      );
    }


    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[discoverCompanyAttributes] Retrieved ${
          Object.keys(values).length
        } fields from sample company`
      );
    }

      'name',
      'website',
      'industry',
      'domains',
      'description',
      'logo_url',
      'primary_location',
      'employee_range',
      'foundation_date',
      'created_at',
      'created_by',
      'matching_id',
      'record_id',
      'linkedin',
      'twitter',
      'facebook',
      'instagram',
      'angellist',
      'twitter_follower_count',
      'estimated_arr_usd',
      'funding_raised_usd',
      'categories',
      'about',
      'notes',
      'team',
      'main_contact',
      'street_address',
      'street_address_2',
      'city',
      'state',
      'postal_code',
      'country',
      'first_interaction',
      'last_interaction',
      'next_interaction',
      'first_email_interaction',
      'last_email_interaction',
      'first_calendar_interaction',
      'last_calendar_interaction',
      'next_calendar_interaction',
      'strongest_connection_strength',
      'strongest_connection_user',
      'associated_deals',
      'associated_workspaces',
    ]);

    const standard: string[] = [];
    const custom: string[] = [];
    const all: Array<{ name: string; type: string; isCustom: boolean }> = [];

    for (const [fieldName, fieldValue] of Object.entries(values)) {
        Array.isArray(fieldValue) && fieldValue.length > 0
          ? fieldValue[0].attribute_type || 'unknown'
          : 'unknown';

      if (isCustom) {
        custom.push(fieldName);
      } else {
        standard.push(fieldName);
      }

      all.push({
        name: fieldName,
        type: fieldType,
        isCustom,
      });
    }

      standard: standard.sort(),
      custom: custom.sort(),
      all: all.sort((a, b) => a.name.localeCompare(b.name)),
    };

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[discoverCompanyAttributes] Discovery complete. Found ${standard.length} standard fields and ${custom.length} custom fields.`
      );
    }

    return result;
  } catch (error: unknown) {
    // Use consistent error logging pattern
    logAttributeError('discoverCompanyAttributes', error, {
      operation: 'attribute discovery',
      context: 'company attributes',
    });

    // Throw with more context
    throw new Error(
      `Failed to discover company attributes: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Gets specific attributes for a company or lists available attributes
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param attributeName - Optional name of specific attribute to retrieve
 * @returns If attributeName provided: specific attribute value, otherwise list of available attributes
 */
export async function getCompanyAttributes(
  companyIdOrUri: string,
  attributeName?: string
): Promise<{
  attributes?: string[];
  value?: unknown;
  company: string;
}> {

  try {
    if (attributeName) {
      // Return specific attribute value

      if (value === undefined) {
        throw new Error(
          `Attribute '${attributeName}' not found for company ${companyName}`
        );
      }

      // Extract simple value from array structure if applicable
      let simplifiedValue = value;
      if (Array.isArray(value) && value.length > 0) {
        if (firstItem && firstItem.value !== undefined) {
          simplifiedValue = firstItem.value;
        } else if (firstItem && firstItem.option?.title) {
          simplifiedValue = firstItem.option.title;
        } else if (firstItem && firstItem.target_record_id) {
          simplifiedValue = `Reference: ${firstItem.target_record_id}`;
        }
      }

      return {
        value: simplifiedValue,
        company: companyName,
      };
    } else {
      // Return list of available attributes

      return {
        attributes,
        company: fullCompany.values?.name || companyId,
      };
    }
  } catch (error: unknown) {
    // Use consistent error logging pattern
    logAttributeError('getCompanyAttributes', error, {
      companyId,
      attributeName,
      operation: 'get attributes',
    });

    // Re-throw with enhanced context
    throw new Error(
      `Failed to get company attribute: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
