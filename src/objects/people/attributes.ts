/**
 * People attributes and related operations
 * Contains functions for getting people information with different levels of detail
 */
import { AttioRecord } from '../../types/attio.js';
import { getRecord } from '../../api/operations/crud.js';

// Standard fields that are NOT custom (based on actual Attio API)
const standardFields = new Set([
  'name',
  'description',
  'email_addresses',
  'job_title', 
  'company',
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'phone_numbers',
  'primary_location',
  'avatar_url',
  'angellist',
  'associated_deals',
  'associated_users'
]);

/**
 * Determines if a field is a standard Attio people field or a custom field
 * 
 * @param fieldName - The field name to check
 * @returns True if it's a standard field, false if custom
 */
export function isStandardPersonField(fieldName: string): boolean {
  return standardFields.has(fieldName);
}

/**
 * Gets a list of all standard people field names
 * 
 * @returns Array of standard field names
 */
export function getStandardPersonFields(): string[] {
  return Array.from(standardFields).sort();
}

/**
 * Checks if a field is custom (not in the standard Attio people schema)
 *
 * @param fieldName - The name of the field to check
 * @returns True if the field is custom, false if it's a standard field
 */
export function isCustomPersonField(fieldName: string): boolean {
  return !standardFields.has(fieldName);
}

/**
 * Gets person fields with error handling and validation
 *
 * @param personIdOrUri - The ID of the person or its URI
 * @param fields - Array of field names to retrieve
 * @returns Person data with specified fields
 */
export async function getPersonFields(
  personIdOrUri: string,
  fields: string[]
): Promise<Partial<AttioRecord>> {
  try {
    const person = await getRecord('people', personIdOrUri, fields);
    return person;
  } catch (error: unknown) {
    console.error('Error fetching person fields:', error);
    throw error;
  }
}

/**
 * Gets basic person information
 *
 * @param personIdOrUri - The ID of the person or its URI
 * @returns Basic person information
 */
export async function getPersonBasicInfo(
  personIdOrUri: string
): Promise<Partial<AttioRecord>> {
  const basicFields = [
    'name',
    'email_addresses',
    'job_title',
    'company',
    'phone_numbers'
  ];

  return getPersonFields(personIdOrUri, basicFields);
}

/**
 * Gets person contact information
 *
 * @param personIdOrUri - The ID of the person or its URI
 * @returns Person contact information
 */
export async function getPersonContactInfo(
  personIdOrUri: string
): Promise<Partial<AttioRecord>> {
  const contactFields = [
    'name',
    'email_addresses', 
    'phone_numbers',
    'primary_location',
    'linkedin',
    'twitter',
    'facebook',
    'instagram'
  ];

  return getPersonFields(personIdOrUri, contactFields);
}

/**
 * Gets person professional information
 *
 * @param personIdOrUri - The ID of the person or its URI
 * @returns Person professional information
 */
export async function getPersonProfessionalInfo(
  personIdOrUri: string
): Promise<Partial<AttioRecord>> {
  const professionalFields = [
    'name',
    'job_title',
    'company', 
    'linkedin',
    'associated_deals',
    'associated_users'
  ];

  return getPersonFields(personIdOrUri, professionalFields);
}

/**
 * Gets person social media and online presence
 *
 * @param personIdOrUri - The ID of the person or its URI  
 * @returns Person social media information
 */
export async function getPersonSocialInfo(
  personIdOrUri: string
): Promise<Partial<AttioRecord>> {
  const socialFields = [
    'name',
    'linkedin', 
    'twitter',
    'facebook',
    'instagram'
  ];

  return getPersonFields(personIdOrUri, socialFields);
}

/**
 * Validate and categorize person fields
 *
 * @param fields - Array of field names to validate
 * @returns Object with categorized fields
 */
export function validateAndCategorizePersonFields(fields: string[]): {
  standardFields: string[];
  customFields: string[];
  warnings: string[];
} {
  const result = {
    standardFields: [] as string[],
    customFields: [] as string[],
    warnings: [] as string[]
  };

  for (const fieldName of fields) {
    if (isStandardPersonField(fieldName)) {
      result.standardFields.push(fieldName);
    } else {
      result.customFields.push(fieldName);
      
      // Generate warnings for fields that look like they might be standard but aren't
      if (fieldName.includes('email') && fieldName !== 'email_addresses') {
        result.warnings.push(
          `Field '${fieldName}' appears to be email-related. The standard field is 'email_addresses'.`
        );
      }
    }
  }

  return result;
}

/**
 * Get comprehensive person attribute information with custom field detection
 *
 * @param personIdOrUri - The ID of the person or its URI
 * @param requestedFields - Optional array of specific fields to retrieve
 * @returns Person with field categorization info
 */
export async function getPersonWithFieldAnalysis(
  personIdOrUri: string,
  requestedFields?: string[]
): Promise<{
  person: Partial<AttioRecord>;
  fieldAnalysis: {
    standardFields: string[];
    customFields: string[];
    warnings: string[];
  };
}> {
  // If no specific fields requested, get all basic fields
  const fieldsToFetch = requestedFields || getStandardPersonFields();
  
  const person = await getPersonFields(personIdOrUri, fieldsToFetch);
  const fieldAnalysis = validateAndCategorizePersonFields(fieldsToFetch);

  return {
    person,
    fieldAnalysis
  };
}