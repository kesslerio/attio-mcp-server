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
  
  // Additional boolean field name patterns for heuristic detection
  private static booleanFieldPatterns = [
    // Prefixes that strongly indicate boolean fields
    'is_', 'has_', 'can_', 'should_', 'will_', 'was_', 'does_',
    // Common terms that suggest boolean flags
    'enabled', 'active', 'verified', 'published', 'approved', 'confirmed', 
    'suspended', 'locked', 'flagged', 'premium', 'featured', 'hidden',
    'allow', 'accept', 'available', 'eligible', 'complete', 'valid'
  ];
  
  /**
   * Determines if a field is likely to be a boolean based on its name
   * 
   * @param fieldName - Name of the field to check
   * @returns True if the field name suggests it's a boolean
   */
  private static isBooleanFieldByName(fieldName: string): boolean {
    const fieldNameLower = fieldName.toLowerCase();
    
    // Check prefixes (is_, has_, etc.)
    for (const pattern of CompanyValidator.booleanFieldPatterns) {
      if (fieldNameLower.startsWith(pattern) || fieldNameLower.includes('_' + pattern) || 
          fieldNameLower === pattern || fieldNameLower.includes(pattern + '_')) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Processes and converts a value for a specific field based on field type
   * 
   * @param fieldName - Name of the field
   * @param value - Value to process
   * @returns Processed value (converted if needed)
   */
  private static async processFieldValue(fieldName: string, value: any): Promise<any> {
    // Skip processing for null/undefined values
    if (value === null || value === undefined) {
      return value;
    }
    
    // Look for boolean fields and convert string/number values to boolean
    try {
      // Check if this is a boolean field using API type detection or cached type
      const fieldType = CompanyValidator.fieldTypeCache.get(fieldName) || 
        await detectFieldType(ResourceType.COMPANIES, fieldName);
        
      // Store in cache for future use
      if (!CompanyValidator.fieldTypeCache.has(fieldName)) {
        CompanyValidator.fieldTypeCache.set(fieldName, fieldType);
      }
        
      // Convert value if it's a boolean field but the value is a string or number
      if (fieldType === 'boolean' && (typeof value === 'string' || typeof value === 'number')) {
        return convertToBoolean(value);
      }
    } catch (error) {
      // If field type detection fails, try a heuristic approach based on field naming
      if (CompanyValidator.isBooleanFieldByName(fieldName) && 
          (typeof value === 'string' || typeof value === 'number')) {
        try {
          return convertToBoolean(value);
        } catch (conversionError) {
          console.warn(`Failed to convert potential boolean value for field '${fieldName}':`, 
            conversionError instanceof Error ? conversionError.message : String(conversionError));
          // Return the original value if conversion fails
        }
      }
    }
    
    // If we get here, return the original value (no conversion needed)
    return value;
  }
  
  /**
   * Process all attributes in an object, converting values as needed
   * 
   * @param attributes - Object containing attribute key-value pairs
   * @returns Processed attributes object with converted values
   */
  private static async processAttributeValues(attributes: Record<string, any>): Promise<Record<string, any>> {
    const processedAttributes = { ...attributes };
    
    for (const [field, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        // First validate the field type
        await CompanyValidator.validateFieldType(field, value);
        
        // Then process the value (convert if needed)
        processedAttributes[field] = await CompanyValidator.processFieldValue(field, value);
      }
    }
    
    return processedAttributes;
  }
  
  /**
   * Validates data for creating a company using dynamic field type detection
   * 
   * @param attributes - Raw attributes for company creation
   * @returns Validated company create input with processed values
   * @throws MissingCompanyFieldError if required fields are missing
   * @throws InvalidCompanyFieldTypeError if field types are invalid
   */
  static async validateCreate(attributes: any): Promise<CompanyCreateInput> {
    // Check required fields
    if (!attributes.name) {
      throw new MissingCompanyFieldError('name');
    }

    // Process all field values, including boolean conversion
    const processedAttributes = await CompanyValidator.processAttributeValues(attributes);
    
    // Special validation for specific field types
    await CompanyValidator.performSpecialValidation(processedAttributes);

    return processedAttributes as CompanyCreateInput;
  }

  /**
   * Validates data for updating a company using dynamic field type detection
   * 
   * @param companyId - ID of the company to update
   * @param attributes - Raw attributes for company update
   * @returns Validated company update input with processed values
   * @throws InvalidCompanyDataError if company ID is invalid
   * @throws InvalidCompanyFieldTypeError if field types are invalid
   */
  static async validateUpdate(companyId: string, attributes: any): Promise<CompanyUpdateInput> {
    // Validate company ID
    if (!companyId || typeof companyId !== 'string') {
      throw new InvalidCompanyDataError('Company ID must be a non-empty string');
    }

    // Process all field values, including boolean conversion
    const processedAttributes = await CompanyValidator.processAttributeValues(attributes);
    
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
    
    // Process the value (convert if needed)
    const processedValue = await CompanyValidator.processFieldValue(attributeName, attributeValue);
    
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