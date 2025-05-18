/**
 * Attribute management for companies
 */
import {
  ResourceType, 
  Company
} from "../../types/attio.js";
import { getCompanyDetails, extractCompanyId } from "./basic.js";
import { listCompanies } from "./basic.js";

/**
 * Gets specific company fields based on a field list
 * 
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param fields - Array of field names to retrieve
 * @returns Partial company data with only requested fields
 */
export async function getCompanyFields(companyIdOrUri: string, fields: string[]): Promise<Partial<Company>> {
  let companyId: string;
  
  try {
    // Extract company ID from URI if needed
    companyId = extractCompanyId(companyIdOrUri);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getCompanyFields] Fetching fields for company ${companyId}:`, fields);
    }
    
    // Fetch all company data first
    const fullCompany = await getCompanyDetails(companyIdOrUri);
    
    // Filter to only requested fields
    const filteredValues: Record<string, any> = {};
    const allValues = fullCompany.values || {};
    
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
      values: filteredValues
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getCompanyFields] Filtered to ${Object.keys(filteredValues).length} fields`);
    }
    
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Could not retrieve company fields: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Gets basic company information (limited fields for performance)
 * 
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Basic company information
 */
export async function getCompanyBasicInfo(companyIdOrUri: string): Promise<Partial<Company>> {
  const basicFields = [
    'name',
    'website', 
    'industry',
    'type',
    'type_persona',
    'employee_range',
    'foundation_date',
    'primary_location',
    'description',
    'logo_url'
  ];
  
  return getCompanyFields(companyIdOrUri, basicFields);
}

/**
 * Gets company contact information
 * 
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company contact information
 */
export async function getCompanyContactInfo(companyIdOrUri: string): Promise<Partial<Company>> {
  const contactFields = [
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
    'main_contact'
  ];
  
  return getCompanyFields(companyIdOrUri, contactFields);
}

/**
 * Gets company business information
 * 
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company business information
 */
export async function getCompanyBusinessInfo(companyIdOrUri: string): Promise<Partial<Company>> {
  const businessFields = [
    'name',
    'type',
    'type_persona',
    'services',
    'categories',
    'industry',
    'estimated_arr_usd',
    'funding_raised_usd',
    'employee_range',
    'foundation_date'
  ];
  
  return getCompanyFields(companyIdOrUri, businessFields);
}

/**
 * Gets company social media and online presence
 * 
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company social media information
 */
export async function getCompanySocialInfo(companyIdOrUri: string): Promise<Partial<Company>> {
  const socialFields = [
    'name',
    'website',
    'linkedin',
    'twitter',
    'facebook',
    'instagram',
    'angellist',
    'twitter_follower_count',
    'logo_url'
  ];
  
  return getCompanyFields(companyIdOrUri, socialFields);
}

/**
 * Gets custom fields for a company
 * 
 * @param companyIdOrUri - The ID of the company or its URI
 * @param customFieldNames - Optional array of specific custom field names to retrieve
 * @returns Company with custom fields
 */
export async function getCompanyCustomFields(
  companyIdOrUri: string, 
  customFieldNames?: string[]
): Promise<Partial<Company>> {
  // If specific custom fields are requested, fetch only those
  if (customFieldNames && customFieldNames.length > 0) {
    // Always include name for context
    const fieldsToFetch = ['name', ...customFieldNames];
    return getCompanyFields(companyIdOrUri, fieldsToFetch);
  }
  
  // Otherwise, we need to fetch all fields first to identify custom ones
  const allData = await getCompanyDetails(companyIdOrUri);
  
  // Standard fields that are NOT custom
  const standardFields = new Set([
    'name', 'website', 'industry', 'domains', 'description',
    'logo_url', 'primary_location', 'employee_range', 'foundation_date',
    'created_at', 'created_by', 'matching_id', 'record_id',
    'linkedin', 'twitter', 'facebook', 'instagram', 'angellist',
    'twitter_follower_count', 'estimated_arr_usd', 'funding_raised_usd',
    'categories', 'about', 'notes', 'team', 'main_contact',
    'street_address', 'street_address_2', 'city', 'state', 'postal_code', 'country',
    'first_interaction', 'last_interaction', 'next_interaction',
    'first_email_interaction', 'last_email_interaction',
    'first_calendar_interaction', 'last_calendar_interaction', 'next_calendar_interaction',
    'strongest_connection_strength', 'strongest_connection_user',
    'associated_deals', 'associated_workspaces'
  ]);
  
  // Extract custom fields
  const customFields: Record<string, any> = {};
  const values = allData.values || {};
  
  for (const [fieldName, fieldValue] of Object.entries(values)) {
    if (!standardFields.has(fieldName)) {
      customFields[fieldName] = fieldValue;
    }
  }
  
  return {
    id: allData.id,
    values: {
      name: values.name,
      ...customFields
    }
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
  
  try {
    // Get a sample company to see what fields are available
    const companies = await listCompanies(1);
    if (companies.length === 0) {
      throw new Error("No companies found to discover attributes");
    }
    
    const sampleCompany = await getCompanyDetails(companies[0].id?.record_id || '');
    const values = sampleCompany.values || {};
    
    const standardFields = new Set([
      'name', 'website', 'industry', 'domains', 'description',
      'logo_url', 'primary_location', 'employee_range', 'foundation_date',
      'created_at', 'created_by', 'matching_id', 'record_id',
      'linkedin', 'twitter', 'facebook', 'instagram', 'angellist',
      'twitter_follower_count', 'estimated_arr_usd', 'funding_raised_usd',
      'categories', 'about', 'notes', 'team', 'main_contact',
      'street_address', 'street_address_2', 'city', 'state', 'postal_code', 'country',
      'first_interaction', 'last_interaction', 'next_interaction',
      'first_email_interaction', 'last_email_interaction',
      'first_calendar_interaction', 'last_calendar_interaction', 'next_calendar_interaction',
      'strongest_connection_strength', 'strongest_connection_user',
      'associated_deals', 'associated_workspaces'
    ]);
    
    const standard: string[] = [];
    const custom: string[] = [];
    const all: Array<{ name: string; type: string; isCustom: boolean }> = [];
    
    for (const [fieldName, fieldValue] of Object.entries(values)) {
      const isCustom = !standardFields.has(fieldName);
      const fieldType = Array.isArray(fieldValue) && fieldValue.length > 0
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
        isCustom
      });
    }
    
    return {
      standard: standard.sort(),
      custom: custom.sort(),
      all: all.sort((a, b) => a.name.localeCompare(b.name))
    };
  } catch (error) {
    throw new Error(`Failed to discover company attributes: ${error}`);
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
  value?: any;
  company: string;
}> {
  const companyId = extractCompanyId(companyIdOrUri);
  const fullCompany = await getCompanyDetails(companyIdOrUri);
  
  if (attributeName) {
    // Return specific attribute value
    const values = fullCompany.values || {};
    const value = values[attributeName];
    
    if (value === undefined) {
      throw new Error(`Attribute '${attributeName}' not found for company ${fullCompany.values?.name?.[0]?.value || companyId}`);
    }
    
    // Extract simple value from array structure if applicable
    let simplifiedValue = value;
    if (Array.isArray(value) && value.length > 0) {
      const firstItem = value[0];
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
      company: fullCompany.values?.name?.[0]?.value || companyId
    };
  } else {
    // Return list of available attributes
    const values = fullCompany.values || {};
    const attributes = Object.keys(values).sort();
    
    return {
      attributes,
      company: fullCompany.values?.name?.[0]?.value || companyId
    };
  }
}