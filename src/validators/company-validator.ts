/**
 * Validator for company data with dynamic field type detection
 * Enhanced with attribute type validation
 */
import { 
  MissingCompanyFieldError, 
  InvalidCompanyFieldTypeError,
  InvalidCompanyDataError 
} from '../errors/company-errors.js';
import { 
  CompanyCreateInput, 
  CompanyUpdateInput 
} from '../types/company-types.js';
import { 
  getAttributeTypeInfo, 
  getFieldValidationRules,
  detectFieldType
} from '../api/attribute-types.js';
import { ResourceType } from '../types/attio.js';
import { validateAttributeValue, ValidationResult, AttributeType } from './attribute-validator.js';
import { InvalidRequestError } from '../errors/api-errors.js';

/**
 * Interface for cached attribute type info
 */
interface CachedTypeInfo {
  fieldType: string;
  attioType: string;
  validatorType: AttributeType;
  timestamp: number;
}

export class CompanyValidator {
  // Cache for field types to avoid repeated API calls within a validation session
  private static fieldTypeCache = new Map<string, string>();
  
  // Enhanced cache for attribute type information with expiration
  private static attributeTypeCache = new Map<string, CachedTypeInfo>();
  
  // Cache expiry time in milliseconds (30 minutes)
  private static CACHE_TTL = 30 * 60 * 1000;
  
  /**
   * Validates data for creating a company using dynamic field type detection
   * 
   * @param attributes - Raw attributes for company creation
   * @returns Validated company create input
   * @throws MissingCompanyFieldError if required fields are missing
   * @throws InvalidCompanyFieldTypeError if field types are invalid
   */
  static async validateCreate(attributes: any): Promise<CompanyCreateInput> {
    // Check required fields
    if (!attributes.name) {
      throw new MissingCompanyFieldError('name');
    }

    // First apply traditional field validation
    for (const [field, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        await CompanyValidator.validateFieldType(field, value);
      }
    }
    
    // Special validation for specific field types
    await CompanyValidator.performSpecialValidation(attributes);
    
    // Then apply the new enhanced type validation and conversion
    try {
      attributes = await CompanyValidator.validateAttributeTypes(attributes);
    } catch (error) {
      // If it's already a structured error, rethrow it
      if (error instanceof InvalidRequestError) {
        throw error;
      }
      // Otherwise, convert to an appropriate error
      throw new InvalidCompanyDataError(`Attribute validation failed: ${(error as Error).message}`);
    }

    return attributes as CompanyCreateInput;
  }

  /**
   * Validates data for updating a company using dynamic field type detection
   * 
   * @param companyId - ID of the company to update
   * @param attributes - Raw attributes for company update
   * @returns Validated company update input
   * @throws InvalidCompanyDataError if company ID is invalid
   * @throws InvalidCompanyFieldTypeError if field types are invalid
   */
  static async validateUpdate(companyId: string, attributes: any): Promise<CompanyUpdateInput> {
    // Validate company ID
    if (!companyId || typeof companyId !== 'string') {
      throw new InvalidCompanyDataError('Company ID must be a non-empty string');
    }

    // First apply traditional field validation
    for (const [field, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        await CompanyValidator.validateFieldType(field, value);
      }
    }
    
    // Special validation for specific field types
    await CompanyValidator.performSpecialValidation(attributes);
    
    // Then apply the new enhanced type validation and conversion
    try {
      attributes = await CompanyValidator.validateAttributeTypes(attributes);
    } catch (error) {
      // If it's already a structured error, rethrow it
      if (error instanceof InvalidRequestError) {
        throw error;
      }
      // Otherwise, convert to an appropriate error
      throw new InvalidCompanyDataError(`Attribute validation failed: ${(error as Error).message}`);
    }

    return attributes as CompanyUpdateInput;
  }

  /**
   * Validates a single attribute update using dynamic field type detection
   * 
   * @param companyId - ID of the company to update
   * @param attributeName - Name of the attribute to update
   * @param attributeValue - Value to set for the attribute
   * @throws InvalidCompanyDataError if validation fails
   */
  static async validateAttributeUpdate(companyId: string, attributeName: string, attributeValue: any): Promise<any> {
    // Validate company ID
    if (!companyId || typeof companyId !== 'string') {
      throw new InvalidCompanyDataError('Company ID must be a non-empty string');
    }

    // Validate attribute name
    if (!attributeName || typeof attributeName !== 'string') {
      throw new InvalidCompanyDataError('Attribute name must be a non-empty string');
    }

    // First run traditional validation
    await CompanyValidator.validateFieldType(attributeName, attributeValue);
    
    // Special validation for specific attributes
    if (attributeName === 'name' && (!attributeValue || typeof attributeValue !== 'string')) {
      throw new InvalidCompanyDataError('Company name must be a non-empty string');
    }

    if (attributeName === 'website' && attributeValue) {
      try {
        new URL(attributeValue);
      } catch {
        throw new InvalidCompanyDataError('Website must be a valid URL');
      }
    }

    if (attributeName === 'linkedin_url' && attributeValue) {
      try {
        const url = new URL(attributeValue);
        if (!url.hostname.includes('linkedin.com')) {
          throw new InvalidCompanyDataError('LinkedIn URL must be a valid LinkedIn URL');
        }
      } catch {
        throw new InvalidCompanyDataError('LinkedIn URL must be a valid URL');
      }
    }
    
    // Then apply enhanced type validation with automatic conversion
    // Create a single-attribute object for validation
    const attributeObj = { [attributeName]: attributeValue };
    
    try {
      const validatedObj = await CompanyValidator.validateAttributeTypes(attributeObj);
      // Return the converted value
      return validatedObj[attributeName];
    } catch (error) {
      // If it's already a structured error, rethrow it
      if (error instanceof InvalidRequestError) {
        throw error;
      }
      // Otherwise, convert to an appropriate error
      throw new InvalidCompanyDataError(`Attribute validation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Validates field type using dynamic detection
   * 
   * @param field - Field name
   * @param value - Field value
   * @throws InvalidCompanyFieldTypeError if type is invalid
   */
  private static async validateFieldType(field: string, value: any): Promise<void> {
    // Allow null/undefined values for any field
    if (value === null || value === undefined) {
      return;
    }
    
    // First, try to get the expected type from Attio metadata
    let expectedType: string;
    
    try {
      // Check cache first
      if (CompanyValidator.fieldTypeCache.has(field)) {
        expectedType = CompanyValidator.fieldTypeCache.get(field)!;
      } else {
        // Detect field type from API
        expectedType = await detectFieldType(ResourceType.COMPANIES, field);
        CompanyValidator.fieldTypeCache.set(field, expectedType);
      }
    } catch (error) {
      // If API call fails, fall back to basic type inference
      console.warn(`Failed to detect field type for ${field}, using fallback`);
      expectedType = CompanyValidator.inferFieldType(field);
    }

    // Validate based on detected type
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          throw new InvalidCompanyFieldTypeError(field, 'string', actualType);
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          throw new InvalidCompanyFieldTypeError(field, 'array', actualType);
        }
        break;
        
      case 'number':
        if (typeof value !== 'number') {
          throw new InvalidCompanyFieldTypeError(field, 'number', actualType);
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new InvalidCompanyFieldTypeError(field, 'boolean', actualType);
        }
        break;
        
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new InvalidCompanyFieldTypeError(field, 'object', actualType);
        }
        break;
    }
  }

  /**
   * Performs special validation for specific field types
   * 
   * @param attributes - Attributes to validate
   */
  private static async performSpecialValidation(attributes: any): Promise<void> {
    // Validate services field as string if provided
    if (attributes.services !== undefined && attributes.services !== null) {
      if (typeof attributes.services !== 'string') {
        throw new InvalidCompanyDataError('Services must be a string value (comma-separated for multiple services)');
      }
    }
    
    // Validate website URL if provided
    if (attributes.website) {
      try {
        new URL(attributes.website);
      } catch {
        throw new InvalidCompanyDataError('Website must be a valid URL');
      }
    }

    // Validate linkedin URL if provided
    if (attributes.linkedin_url) {
      try {
        const url = new URL(attributes.linkedin_url);
        if (!url.hostname.includes('linkedin.com')) {
          throw new InvalidCompanyDataError('LinkedIn URL must be a valid LinkedIn URL');
        }
      } catch {
        throw new InvalidCompanyDataError('LinkedIn URL must be a valid URL');
      }
    }

    // Validate location if provided (should be an object)
    if (attributes.location) {
      const locationType = await detectFieldType(ResourceType.COMPANIES, 'location');
      if (locationType === 'object' && (typeof attributes.location !== 'object' || Array.isArray(attributes.location))) {
        throw new InvalidCompanyFieldTypeError('location', 'object', typeof attributes.location);
      }
    }
  }

  /**
   * Fallback field type inference based on field name patterns
   * 
   * @param field - Field name
   * @returns Inferred field type
   */
  private static inferFieldType(field: string): string {
    // Special case for services field - it's a text field in Attio
    if (field.toLowerCase() === 'services') {
      return 'string';
    }
    
    // Known array fields
    // Note: 'services' is a text field in Attio, not an array
    const arrayFieldPatterns = [
      'products', 'categories', 'keywords', 'tags',
      'emails', 'phones', 'addresses', 'social_profiles'
    ];
    
    // Known object fields
    const objectFieldPatterns = [
      'location', 'address', 'metadata', 'settings', 'preferences'
    ];
    
    // Known number fields
    const numberFieldPatterns = [
      'count', 'amount', 'size', 'revenue', 'employees', 
      'funding', 'valuation', 'score', 'rating'
    ];
    
    // Known boolean fields
    const booleanFieldPatterns = [
      'is_', 'has_', 'enabled', 'active', 'verified', 'published'
    ];

    const lowerField = field.toLowerCase();
    
    // Check for array patterns
    if (arrayFieldPatterns.some(pattern => lowerField.includes(pattern))) {
      return 'array';
    }
    
    // Check for object patterns  
    if (objectFieldPatterns.some(pattern => lowerField.includes(pattern))) {
      return 'object';
    }
    
    // Check for number patterns
    if (numberFieldPatterns.some(pattern => lowerField.includes(pattern))) {
      return 'number';
    }
    
    // Check for boolean patterns
    if (booleanFieldPatterns.some(pattern => 
      lowerField.startsWith(pattern) || lowerField.includes(pattern)
    )) {
      return 'boolean';
    }
    
    // Default to string
    return 'string';
  }

  /**
   * Validates company ID for deletion
   * 
   * @param companyId - ID of the company to delete
   * @throws InvalidCompanyDataError if company ID is invalid
   */
  static validateDelete(companyId: string): void {
    if (!companyId || typeof companyId !== 'string') {
      throw new InvalidCompanyDataError('Company ID must be a non-empty string');
    }
  }
  
  /**
   * Clears the field type cache (useful for testing or when metadata changes)
   */
  static clearFieldTypeCache(): void {
    this.fieldTypeCache.clear();
    // Also clear the enhanced attribute type cache
    this.attributeTypeCache.clear();
  }
  
  /**
   * Gets attribute type information with caching
   * 
   * This method retrieves attribute type information from the cache if available,
   * or fetches it from the API if not cached or if the cache has expired.
   * 
   * @param attributeName - The name of the attribute
   * @returns Promise resolving to the validator type to use
   */
  private static async getValidatorType(attributeName: string): Promise<AttributeType> {
    // Check cache first
    const now = Date.now();
    const cacheKey = attributeName;
    const cachedInfo = this.attributeTypeCache.get(cacheKey);
    
    // Use cached value if it exists and hasn't expired
    if (cachedInfo && (now - cachedInfo.timestamp) < this.CACHE_TTL) {
      return cachedInfo.validatorType;
    }
    
    try {
      // Get attribute type information from Attio API
      const typeInfo = await getAttributeTypeInfo(ResourceType.COMPANIES, attributeName);
      
      // Map Attio type to our validator type
      let validatorType: AttributeType;
      switch (typeInfo.fieldType) {
        case 'string':
          validatorType = 'string';
          break;
        case 'number':
          validatorType = 'number';
          break;
        case 'boolean':
          validatorType = 'boolean';
          break;
        case 'array':
          validatorType = 'array';
          break;
        case 'object':
          if (typeInfo.attioType === 'record-reference') {
            validatorType = 'record-reference';
          } else {
            validatorType = 'object';
          }
          break;
        default:
          // For unknown types, default to string
          validatorType = 'string';
      }
      
      // Cache the result
      this.attributeTypeCache.set(cacheKey, {
        fieldType: typeInfo.fieldType,
        attioType: typeInfo.attioType,
        validatorType,
        timestamp: now
      });
      
      return validatorType;
    } catch (error) {
      // If API call fails, try to use the field type cache as fallback
      if (this.fieldTypeCache.has(attributeName)) {
        const fieldType = this.fieldTypeCache.get(attributeName)!;
        // Map field type to validator type
        return fieldType === 'number' ? 'number' :
               fieldType === 'boolean' ? 'boolean' :
               fieldType === 'array' ? 'array' :
               fieldType === 'object' ? 'object' : 'string';
      }
      
      // If all else fails, infer type from field name patterns
      const inferredType = this.inferFieldType(attributeName);
      return inferredType === 'number' ? 'number' :
             inferredType === 'boolean' ? 'boolean' :
             inferredType === 'array' ? 'array' :
             inferredType === 'object' ? 'object' : 'string';
    }
  }

  /**
   * Validates and converts attribute values based on their expected types in Attio
   * 
   * Uses caching and batch processing for optimal performance, reducing API calls
   * for repeated attribute validations.
   * 
   * @param attributes - Raw attributes to validate and convert
   * @returns Object with validated and converted attributes
   * @throws InvalidRequestError if validation fails with detailed error messages
   * 
   * @example
   * // Validate multiple attributes
   * const attrs = {
   *   name: 'Acme Corp',
   *   employees: '250',         // String that will be converted to number
   *   is_customer: 'yes'        // String that will be converted to boolean
   * };
   * const validated = await CompanyValidator.validateAttributeTypes(attrs);
   * // validated = { name: 'Acme Corp', employees: 250, is_customer: true }
   */
  static async validateAttributeTypes(attributes: Record<string, any>): Promise<Record<string, any>> {
    const validatedAttributes: Record<string, any> = {};
    const errors: Record<string, string> = {};
    let hasErrors = false;

    // First handle special cases: undefined and null values
    // Extract attributes that need validation
    const attributesToValidate: Record<string, any> = {};
    
    Object.entries(attributes).forEach(([attributeName, value]) => {
      if (value === undefined) {
        // Skip undefined values entirely
        return;
      }
      
      if (value === null) {
        // Null values are always valid (for clearing fields)
        validatedAttributes[attributeName] = null;
        return;
      }
      
      // Add to validation set
      attributesToValidate[attributeName] = value;
    });
    
    // If no attributes to validate, return early
    if (Object.keys(attributesToValidate).length === 0) {
      return validatedAttributes;
    }
    
    // Batch processing of type information
    const validatorTypes = new Map<string, AttributeType>();
    
    try {
      // Get validator types in parallel for all attributes
      await Promise.all(
        Object.keys(attributesToValidate).map(async (attributeName) => {
          try {
            const validatorType = await this.getValidatorType(attributeName);
            validatorTypes.set(attributeName, validatorType);
          } catch (error) {
            // If type lookup fails, default to 'string'
            console.warn(`Could not determine type for attribute "${attributeName}". Using string as fallback.`);
            validatorTypes.set(attributeName, 'string');
          }
        })
      );
      
      // Process each attribute with its known validator type
      for (const [attributeName, value] of Object.entries(attributesToValidate)) {
        const validatorType = validatorTypes.get(attributeName) || 'string';
        
        // Validate and convert the attribute value
        const result: ValidationResult = validateAttributeValue(attributeName, value, validatorType);
        
        if (result.valid) {
          // Use the converted value, which might be different from the input value
          validatedAttributes[attributeName] = result.convertedValue;
        } else {
          hasErrors = true;
          errors[attributeName] = result.error || `Invalid value for ${attributeName}`;
        }
      }
    } catch (error) {
      // Handle unexpected errors in the batch process
      console.error('Unexpected error during batch validation:', (error as Error).message);
      
      // Fall back to individual processing for robustness
      for (const [attributeName, value] of Object.entries(attributesToValidate)) {
        try {
          // Try to get validator type
          let validatorType: AttributeType;
          try {
            validatorType = await this.getValidatorType(attributeName);
          } catch {
            // Fallback to string if type detection fails
            validatorType = 'string';
          }
          
          // Validate
          const result = validateAttributeValue(attributeName, value, validatorType);
          
          if (result.valid) {
            validatedAttributes[attributeName] = result.convertedValue;
          } else {
            hasErrors = true;
            errors[attributeName] = result.error || `Invalid value for ${attributeName}`;
          }
        } catch (attrError) {
          // Last resort: use original value
          console.warn(`Validation failed for attribute "${attributeName}", proceeding with original value`);
          validatedAttributes[attributeName] = value;
        }
      }
    }
    
    // If validation failed, throw an error with details
    if (hasErrors) {
      throw new InvalidRequestError(
        `Invalid attribute values: ${Object.values(errors).join(', ')}`,
        'companies/update',
        'POST',
        { validationErrors: errors }
      );
    }
    
    return validatedAttributes;
  }
}