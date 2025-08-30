/**
 * Validator for company data with dynamic field type detection
 * Enhanced with attribute type validation
 */
import { CachedTypeInfo } from './types.js';
import { extractDomain, normalizeDomain } from '../../utils/domain-utils.js';
import { InvalidRequestError } from '../../errors/api-errors.js';
import { processFieldValue } from './field_detector.js';
import { ResourceType } from '../../types/attio.js';
import { TypeCache } from './type_cache.js';

export class CompanyValidator {
  /**
   * Process all attributes in an object, converting values as needed
   *
   * @param attributes - Object containing attribute key-value pairs
   * @returns Processed attributes object with converted values
   */
  private static async processAttributeValues(
    attributes: Record<string, CompanyFieldValue>
  ): Promise<Record<string, ProcessedFieldValue>> {
    const processedAttributes: Record<string, ProcessedFieldValue> = {};

    for (const [field, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        await CompanyValidator.validateFieldType(field, value);
        processedAttributes[field] = await processFieldValue(field, value);
      } else {
        processedAttributes[field] = value;
      }
    }

    return processedAttributes;
  }

  /**
   * Automatically extracts domain from website URL if domains field is not provided
   */
  static extractDomainFromWebsite(
    attributes: Record<string, CompanyFieldValue>
  ): Record<string, CompanyFieldValue> {
    if (
      attributes.website &&
      !attributes.domains &&
      typeof attributes.website === 'string'
    ) {

      if (extractedDomain) {

        if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
          console.error(
            `[CompanyValidator] Auto-extracted domain "${normalizedDomain}" from website "${attributes.website}"`
          );
        }

        attributes.domains = [normalizedDomain];
        attributes._autoExtractedDomains = true;
      }
    }

    return attributes;
  }

  static async validateCreate(
    attributes: Record<string, CompanyFieldValue>
  ): Promise<CompanyCreateInput> {
    if (!attributes.name) {
      throw new MissingCompanyFieldError('name');
    }

      CompanyValidator.extractDomainFromWebsite(attributes);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _autoExtractedDomains, ...cleanAttributes } = attributesWithDomain;

      await CompanyValidator.processAttributeValues(cleanAttributes);
    await CompanyValidator.performSpecialValidation(processedAttributes);

    try {
        await CompanyValidator.validateAttributeTypes(processedAttributes);
      return validatedAttributes as CompanyCreateInput;
    } catch (error: unknown) {
      if (error instanceof InvalidRequestError) {
        throw error;
      }
      throw new InvalidCompanyDataError(
        `Attribute validation failed: ${(error as Error).message}`
      );
    }
  }

  static async validateUpdate(
    companyId: string,
    attributes: Record<string, CompanyFieldValue>
  ): Promise<CompanyUpdateInput> {
    if (!companyId || typeof companyId !== 'string') {
      throw new InvalidCompanyDataError(
        'Company ID must be a non-empty string for update'
      );
    }

      CompanyValidator.extractDomainFromWebsite(attributes);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _autoExtractedDomains, ...cleanAttributes } = attributesWithDomain;

      await CompanyValidator.processAttributeValues(cleanAttributes);
    await CompanyValidator.performSpecialValidation(processedAttributes);

    try {
        await CompanyValidator.validateAttributeTypes(processedAttributes);
      return validatedAttributes as CompanyUpdateInput;
    } catch (error: unknown) {
      if (error instanceof InvalidRequestError) {
        throw error;
      }
      throw new InvalidCompanyDataError(
        `Attribute validation failed: ${(error as Error).message}`
      );
    }
  }

  static async validateAttributeUpdate(
    companyId: string,
    attributeName: string,
    attributeValue: CompanyFieldValue
  ): Promise<ProcessedFieldValue> {
    if (!companyId || typeof companyId !== 'string') {
      throw new InvalidCompanyDataError(
        'Company ID must be a non-empty string'
      );
    }

    if (!attributeName || typeof attributeName !== 'string') {
      throw new InvalidCompanyDataError(
        'Attribute name must be a non-empty string'
      );
    }

    await CompanyValidator.validateFieldType(attributeName, attributeValue);
      attributeName,
      attributeValue
    );

    if (
      attributeName === 'name' &&
      (!processedValue || typeof processedValue !== 'string')
    ) {
      throw new InvalidCompanyDataError(
        'Company name must be a non-empty string'
      );
    }

    if (
      attributeName === 'website' &&
      processedValue &&
      typeof processedValue === 'string'
    ) {
      try {
        new URL(processedValue);
      } catch {
        throw new InvalidCompanyDataError('Website must be a valid URL');
      }
    }

    if (
      attributeName === 'linkedin_url' &&
      processedValue &&
      typeof processedValue === 'string'
    ) {
      try {
        if (!url.hostname.includes('linkedin.com')) {
          throw new InvalidCompanyDataError(
            'LinkedIn URL must be a valid LinkedIn URL'
          );
        }
      } catch {
        throw new InvalidCompanyDataError('LinkedIn URL must be a valid URL');
      }
    }


    try {
        await CompanyValidator.validateAttributeTypes(attributeObj);
      return validatedObj[attributeName];
    } catch (error: unknown) {
      if (error instanceof InvalidRequestError) {
        throw error;
      }
      throw new InvalidCompanyDataError(
        `Attribute validation failed: ${(error as Error).message}`
      );
    }
  }

  private static async validateFieldType(
    field: string,
    value: CompanyFieldValue
  ): Promise<void> {
    if (value === null || value === undefined) {
      return;
    }

    if (field === 'domains') {
      return;
    }

    let expectedType: string;

    try {
      if (cached) {
        expectedType = cached;
      } else {
        expectedType = await detectFieldType(ResourceType.COMPANIES, field);
        TypeCache.setFieldType(field, expectedType);
      }
    } catch {
      console.warn(`Failed to detect field type for ${field}, using fallback`);
      expectedType = CompanyValidator.inferFieldType(field);
    }


    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          throw new InvalidCompanyFieldTypeError(field, 'string', actualType);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          if (typeof value === 'string') {
            return;
          }
          throw new InvalidCompanyFieldTypeError(field, 'array', actualType);
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          // Allow strings that can be converted to numbers
          if (typeof value === 'string') {
            if (isNaN(numValue)) {
              throw new InvalidCompanyFieldTypeError(
                field,
                'number',
                actualType
              );
            }
            // String is convertible to number, allow it
          } else {
            throw new InvalidCompanyFieldTypeError(field, 'number', actualType);
          }
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          if (typeof value === 'string' || typeof value === 'number') {
            return;
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

  private static async performSpecialValidation(
    attributes: Record<string, ProcessedFieldValue>
  ): Promise<void> {
    if (attributes.services !== undefined && attributes.services !== null) {
      if (typeof attributes.services !== 'string') {
        throw new InvalidCompanyDataError(
          'Services must be a string value (comma-separated for multiple services)'
        );
      }
    }

    if (attributes.website && typeof attributes.website === 'string') {
      try {
        new URL(attributes.website);
      } catch {
        throw new InvalidCompanyDataError('Website must be a valid URL');
      }
    }

    if (
      attributes.linkedin_url &&
      typeof attributes.linkedin_url === 'string'
    ) {
      try {
        if (!url.hostname.includes('linkedin.com')) {
          throw new InvalidCompanyDataError(
            'LinkedIn URL must be a valid LinkedIn URL'
          );
        }
      } catch {
        throw new InvalidCompanyDataError('LinkedIn URL must be a valid URL');
      }
    }

    if (attributes.location) {
        ResourceType.COMPANIES,
        'location'
      );
      if (
        locationType === 'object' &&
        (typeof attributes.location !== 'object' ||
          Array.isArray(attributes.location))
      ) {
        throw new InvalidCompanyFieldTypeError(
          'location',
          'object',
          typeof attributes.location
        );
      }
    }
  }

  private static inferFieldType(field: string): string {
    if (field.toLowerCase() === 'services') {
      return 'string';
    }

      'products',
      'categories',
      'keywords',
      'tags',
      'emails',
      'phones',
      'addresses',
      'social_profiles',
    ];

      'location',
      'address',
      'metadata',
      'settings',
      'preferences',
    ];

      'count',
      'amount',
      'size',
      'revenue',
      'employees',
      'funding',
      'valuation',
      'score',
      'rating',
    ];

      'is_',
      'has_',
      'enabled',
      'active',
      'verified',
      'published',
    ];

    if (arrayFieldPatterns.some((pattern) => lowerField.includes(pattern))) {
      return 'array';
    }

    if (objectFieldPatterns.some((pattern) => lowerField.includes(pattern))) {
      return 'object';
    }

    if (numberFieldPatterns.some((pattern) => lowerField.includes(pattern))) {
      return 'number';
    }

    if (
      booleanFieldPatterns.some(
        (pattern) =>
          lowerField.startsWith(pattern) || lowerField.includes(pattern)
      )
    ) {
      return 'boolean';
    }

    return 'string';
  }

  static validateDelete(companyId: string): void {
    if (!companyId || typeof companyId !== 'string') {
      throw new InvalidCompanyDataError(
        'Company ID must be a non-empty string'
      );
    }
  }

  static clearFieldTypeCache(): void {
    TypeCache.clear();
  }

  private static async getValidatorType(
    attributeName: string
  ): Promise<AttributeType> {

    if (cachedInfo && TypeCache.isFresh(cachedInfo as CachedTypeInfo, now)) {
      return cachedInfo.validatorType;
    }

    try {
        ResourceType.COMPANIES,
        attributeName
      );

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
          validatorType =
            typeInfo.attioType === 'record-reference'
              ? 'record-reference'
              : 'object';
          break;
        default:
          validatorType = 'string';
      }

      TypeCache.setAttributeType(attributeName, {
        fieldType: typeInfo.fieldType,
        attioType: typeInfo.attioType,
        validatorType,
        timestamp: now,
      });

      return validatorType;
    } catch {
      if (fieldType) {
        return fieldType === 'number'
          ? 'number'
          : fieldType === 'boolean'
            ? 'boolean'
            : fieldType === 'array'
              ? 'array'
              : fieldType === 'object'
                ? 'object'
                : 'string';
      }

      return inferredType === 'number'
        ? 'number'
        : inferredType === 'boolean'
          ? 'boolean'
          : inferredType === 'array'
            ? 'array'
            : inferredType === 'object'
              ? 'object'
              : 'string';
    }
  }

  static async validateAttributeTypes(
    attributes: Record<string, ProcessedFieldValue>
  ): Promise<Record<string, ProcessedFieldValue>> {
    const validatedAttributes: Record<string, ProcessedFieldValue> = {};
    const errors: Record<string, string> = {};
    let hasErrors = false;

    const attributesToValidate: Record<string, ProcessedFieldValue> = {};

    Object.entries(attributes).forEach(([attributeName, value]) => {
      if (value === undefined) {
        return;
      }

      if (value === null) {
        validatedAttributes[attributeName] = null;
        return;
      }

      attributesToValidate[attributeName] = value;
    });

    if (Object.keys(attributesToValidate).length === 0) {
      return validatedAttributes;
    }


    try {
      await Promise.all(
        Object.keys(attributesToValidate).map(async (attributeName) => {
          try {
            validatorTypes.set(attributeName, validatorType);
          } catch {
            console.warn(
              `Could not determine type for attribute "${attributeName}". Using string as fallback.`
            );
            validatorTypes.set(attributeName, 'string');
          }
        })
      );

      for (const [attributeName, value] of Object.entries(
        attributesToValidate
      )) {

        const result: ValidationResult = validateAttributeValue(
          attributeName,
          value,
          validatorType
        );

        if (result.valid) {
          validatedAttributes[attributeName] = result.convertedValue;
        } else {
          hasErrors = true;
          errors[attributeName] =
            result.error || `Invalid value for ${attributeName}`;
        }
      }
    } catch (error: unknown) {
      console.error(
        'Unexpected error during batch validation:',
        (error as Error).message
      );

      for (const [attributeName, value] of Object.entries(
        attributesToValidate
      )) {
        try {
          let validatorType: AttributeType;
          try {
            validatorType = await this.getValidatorType(attributeName);
          } catch {
            validatorType = 'string';
          }

            attributeName,
            value,
            validatorType
          );

          if (result.valid) {
            validatedAttributes[attributeName] = result.convertedValue;
          } else {
            hasErrors = true;
            errors[attributeName] =
              result.error || `Invalid value for ${attributeName}`;
          }
        } catch {
          console.warn(
            `Validation failed for attribute "${attributeName}", proceeding with original value`
          );
          validatedAttributes[attributeName] = value;
        }
      }
    }

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
