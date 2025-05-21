/**
 * Validator for company data with dynamic field type detection
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
import { convertToBoolean } from '../utils/attribute-mapping/attribute-mappers.js';

export class CompanyValidator {
  // Cache for field types to avoid repeated API calls within a validation session
  private static fieldTypeCache = new Map<string, string>();
  
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

    // Process boolean fields and validate field types dynamically
    const processedAttributes = { ...attributes };
    for (const [field, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        // First validate the field type
        await CompanyValidator.validateFieldType(field, value);
        
        // Convert string values to boolean for boolean fields
        try {
          // Check if this is a boolean field
          const fieldType = CompanyValidator.fieldTypeCache.get(field) || 
            await detectFieldType(ResourceType.COMPANIES, field);
            
          if (fieldType === 'boolean' && (typeof value === 'string' || typeof value === 'number')) {
            processedAttributes[field] = convertToBoolean(value);
          }
        } catch (error) {
          // If field type detection fails, check if the field name suggests it's a boolean
          const fieldNameLower = field.toLowerCase();
          const isBooleanField = fieldNameLower.startsWith('is_') || 
                                fieldNameLower.startsWith('has_') || 
                                ['enabled', 'active', 'verified', 'published'].some(
                                  term => fieldNameLower.includes(term)
                                );
                                
          if (isBooleanField && (typeof value === 'string' || typeof value === 'number')) {
            processedAttributes[field] = convertToBoolean(value);
          }
        }
      }
    }
    
    // Special validation for specific field types
    await CompanyValidator.performSpecialValidation(processedAttributes);

    return processedAttributes as CompanyCreateInput;
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

    // Process boolean fields and validate field types dynamically
    const processedAttributes = { ...attributes };
    for (const [field, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        // First validate the field type
        await CompanyValidator.validateFieldType(field, value);
        
        // Convert string values to boolean for boolean fields
        try {
          // Check if this is a boolean field
          const fieldType = CompanyValidator.fieldTypeCache.get(field) || 
            await detectFieldType(ResourceType.COMPANIES, field);
            
          if (fieldType === 'boolean' && (typeof value === 'string' || typeof value === 'number')) {
            processedAttributes[field] = convertToBoolean(value);
          }
        } catch (error) {
          // If field type detection fails, check if the field name suggests it's a boolean
          const fieldNameLower = field.toLowerCase();
          const isBooleanField = fieldNameLower.startsWith('is_') || 
                                fieldNameLower.startsWith('has_') || 
                                ['enabled', 'active', 'verified', 'published'].some(
                                  term => fieldNameLower.includes(term)
                                );
                                
          if (isBooleanField && (typeof value === 'string' || typeof value === 'number')) {
            processedAttributes[field] = convertToBoolean(value);
          }
        }
      }
    }
    
    // Special validation for specific field types
    await CompanyValidator.performSpecialValidation(processedAttributes);

    return processedAttributes as CompanyUpdateInput;
  }

  /**
   * Validates a single attribute update using dynamic field type detection
   * 
   * @param companyId - ID of the company to update
   * @param attributeName - Name of the attribute to update
   * @param attributeValue - Value to set for the attribute
   * @throws InvalidCompanyDataError if validation fails
   * @returns The processed attribute value (converted if needed)
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

    // Validate the attribute value based on dynamic type detection
    await CompanyValidator.validateFieldType(attributeName, attributeValue);
    
    // Process the value if needed
    let processedValue = attributeValue;
    
    // Convert string values to boolean for boolean fields
    try {
      // Check if this is a boolean field
      const fieldType = CompanyValidator.fieldTypeCache.get(attributeName) || 
        await detectFieldType(ResourceType.COMPANIES, attributeName);
        
      if (fieldType === 'boolean' && (typeof attributeValue === 'string' || typeof attributeValue === 'number')) {
        processedValue = convertToBoolean(attributeValue);
      }
    } catch (error) {
      // If field type detection fails, check if the field name suggests it's a boolean
      const fieldNameLower = attributeName.toLowerCase();
      const isBooleanField = fieldNameLower.startsWith('is_') || 
                            fieldNameLower.startsWith('has_') || 
                            ['enabled', 'active', 'verified', 'published'].some(
                              term => fieldNameLower.includes(term)
                            );
                            
      if (isBooleanField && (typeof attributeValue === 'string' || typeof attributeValue === 'number')) {
        processedValue = convertToBoolean(attributeValue);
      }
    }
    
    // Special validation for specific attributes
    if (attributeName === 'name' && (!processedValue || typeof processedValue !== 'string')) {
      throw new InvalidCompanyDataError('Company name must be a non-empty string');
    }

    if (attributeName === 'website' && processedValue) {
      try {
        new URL(processedValue);
      } catch {
        throw new InvalidCompanyDataError('Website must be a valid URL');
      }
    }

    if (attributeName === 'linkedin_url' && processedValue) {
      try {
        const url = new URL(processedValue);
        if (!url.hostname.includes('linkedin.com')) {
          throw new InvalidCompanyDataError('LinkedIn URL must be a valid LinkedIn URL');
        }
      } catch {
        throw new InvalidCompanyDataError('LinkedIn URL must be a valid URL');
      }
    }
    
    return processedValue;
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
          // For boolean fields, try to convert string values to boolean
          if (typeof value === 'string' || typeof value === 'number') {
            return; // We'll handle conversion during the attribute processing
          }
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
  }
}