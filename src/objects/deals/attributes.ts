/**
 * Deals attributes and related operations
 * Contains functions for getting deal information with different levels of detail
 */
import { AttioRecord } from '../../types/attio.js';
import { getRecord } from '../../api/operations/crud.js';

// Standard fields that are NOT custom (based on actual Attio API)
const standardFields = new Set([
  'name',
  'stage', 
  'owner',
  'value',
  'associated_people',
  'associated_company',
  'created_at',
  'created_by'
]);

/**
 * Determines if a field is a standard Attio deal field or a custom field
 * 
 * @param fieldName - The field name to check
 * @returns True if it's a standard field, false if custom
 */
export function isStandardDealField(fieldName: string): boolean {
  return standardFields.has(fieldName);
}

/**
 * Gets a list of all standard deal field names
 * 
 * @returns Array of standard field names
 */
export function getStandardDealFields(): string[] {
  return Array.from(standardFields).sort();
}

/**
 * Checks if a field is custom (not in the standard Attio deal schema)
 *
 * @param fieldName - The name of the field to check
 * @returns True if the field is custom, false if it's a standard field
 */
export function isCustomDealField(fieldName: string): boolean {
  return !standardFields.has(fieldName);
}

/**
 * Gets deal fields with error handling and validation
 *
 * @param dealIdOrUri - The ID of the deal or its URI
 * @param fields - Array of field names to retrieve
 * @returns Deal data with specified fields
 */
export async function getDealFields(
  dealIdOrUri: string,
  fields: string[]
): Promise<Partial<AttioRecord>> {
  try {
    const deal = await getRecord('deals', dealIdOrUri, fields);
    return deal;
  } catch (error: unknown) {
    console.error('Error fetching deal fields:', error);
    throw error;
  }
}

/**
 * Gets basic deal information
 *
 * @param dealIdOrUri - The ID of the deal or its URI
 * @returns Basic deal information
 */
export async function getDealBasicInfo(
  dealIdOrUri: string
): Promise<Partial<AttioRecord>> {
  const basicFields = [
    'name',
    'stage',
    'owner',
    'value'
  ];

  return getDealFields(dealIdOrUri, basicFields);
}

/**
 * Gets deal sales information
 *
 * @param dealIdOrUri - The ID of the deal or its URI
 * @returns Deal sales pipeline information
 */
export async function getDealSalesInfo(
  dealIdOrUri: string
): Promise<Partial<AttioRecord>> {
  const salesFields = [
    'name',
    'stage',
    'value',
    'owner',
    'associated_company',
    'associated_people'
  ];

  return getDealFields(dealIdOrUri, salesFields);
}

/**
 * Gets deal relationship information
 *
 * @param dealIdOrUri - The ID of the deal or its URI
 * @returns Deal relationship information
 */
export async function getDealRelationshipInfo(
  dealIdOrUri: string
): Promise<Partial<AttioRecord>> {
  const relationshipFields = [
    'name',
    'associated_company',
    'associated_people',
    'owner'
  ];

  return getDealFields(dealIdOrUri, relationshipFields);
}

/**
 * Gets deal metadata information
 *
 * @param dealIdOrUri - The ID of the deal or its URI
 * @returns Deal metadata information  
 */
export async function getDealMetadataInfo(
  dealIdOrUri: string
): Promise<Partial<AttioRecord>> {
  const metadataFields = [
    'name',
    'created_at',
    'created_by',
    'owner'
  ];

  return getDealFields(dealIdOrUri, metadataFields);
}

/**
 * Validate and categorize deal fields
 *
 * @param fields - Array of field names to validate
 * @returns Object with categorized fields
 */
export function validateAndCategorizeDealFields(fields: string[]): {
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
    if (isStandardDealField(fieldName)) {
      result.standardFields.push(fieldName);
    } else {
      result.customFields.push(fieldName);
      
      // Generate warnings for fields that look like they might be standard but aren't
      if (fieldName.includes('stage') && fieldName !== 'stage') {
        result.warnings.push(
          `Field '${fieldName}' appears to be stage-related. The standard field is 'stage'.`
        );
      }
      if (fieldName.includes('value') && fieldName !== 'value') {
        result.warnings.push(
          `Field '${fieldName}' appears to be value-related. The standard field is 'value'.`
        );
      }
    }
  }

  return result;
}

/**
 * Get comprehensive deal attribute information with custom field detection
 *
 * @param dealIdOrUri - The ID of the deal or its URI
 * @param requestedFields - Optional array of specific fields to retrieve
 * @returns Deal with field categorization info
 */
export async function getDealWithFieldAnalysis(
  dealIdOrUri: string,
  requestedFields?: string[]
): Promise<{
  deal: Partial<AttioRecord>;
  fieldAnalysis: {
    standardFields: string[];
    customFields: string[];
    warnings: string[];
  };
}> {
  // If no specific fields requested, get all basic fields
  const fieldsToFetch = requestedFields || getStandardDealFields();
  
  const deal = await getDealFields(dealIdOrUri, fieldsToFetch);
  const fieldAnalysis = validateAndCategorizeDealFields(fieldsToFetch);

  return {
    deal,
    fieldAnalysis
  };
}