/**
 * Validator for company data with dynamic field type detection
 * Enhanced with attribute type validation
 */
import {
  MissingCompanyFieldError,
  InvalidCompanyFieldTypeError,
  InvalidCompanyDataError,
} from '@/errors/company-errors.js';
import {
  CompanyCreateInput,
  CompanyUpdateInput,
} from '@/types/company-types.js';
import {
  getAttributeTypeInfo,
  detectFieldType,
} from '@/api/attribute-types.js';
import { ResourceType } from '@/types/attio.js';
import {
  validateAttributeValue,
  AttributeType,
} from '@/validators/attribute-validator.js';
import { InvalidRequestError } from '@/errors/api-errors.js';
import { extractDomain, normalizeDomain } from '@/utils/domain-utils.js';
import { CompanyFieldValue, ProcessedFieldValue } from '@/types/tool-types.js';
import { processFieldValue } from '@/validators/company/field_detector.js';
import { createScopedLogger } from '@/utils/logger.js';
import { TypeCache } from '@/validators/company/type_cache.js';
import { CachedTypeInfo } from '@/validators/company/types.js';
import { LinkedInUrlValidator } from '@/validators/url/linkedin-validator.js';
import { handleAttributeValidationError } from '@/validators/company/error-handler.js';

const extractDomainLogger = createScopedLogger(
  'CompanyValidator',
  'extractDomainFromWebsite'
);

const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:']);

const LINKEDIN_HOST = 'linkedin.com';

function isLinkedInHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === LINKEDIN_HOST || normalized.endsWith(`.${LINKEDIN_HOST}`)
  );
}

function ensureSafeUrl(value: string, fieldLabel: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new InvalidCompanyDataError(`${fieldLabel} must be a valid URL`);
  }

  if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
    throw new InvalidCompanyDataError(
      `${fieldLabel} must use http or https protocol`
    );
  }

  return parsed;
}

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
        processedAttributes[field] = value as ProcessedFieldValue;
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
      const extractedDomain = extractDomain(attributes.website);

      if (extractedDomain) {
        const normalizedDomain = normalizeDomain(extractedDomain);
        extractDomainLogger.debug('Auto-extracted domain from website', {
          normalizedDomain,
          website: attributes.website,
          toolName: 'company-validator',
          userId: 'n/a',
          requestId: 'n/a',
        });
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

    const attributesWithDomain =
      CompanyValidator.extractDomainFromWebsite(attributes);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _autoExtractedDomains, ...cleanAttributes } = attributesWithDomain;

    const processedAttributes =
      await CompanyValidator.processAttributeValues(cleanAttributes);
    await CompanyValidator.performSpecialValidation(processedAttributes);

    try {
      const validatedAttributes =
        await CompanyValidator.validateAttributeTypes(processedAttributes);
      return validatedAttributes as CompanyCreateInput;
    } catch (error: unknown) {
      handleAttributeValidationError(error);
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

    const attributesWithDomain =
      CompanyValidator.extractDomainFromWebsite(attributes);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _autoExtractedDomains, ...cleanAttributes } = attributesWithDomain;

    const processedAttributes =
      await CompanyValidator.processAttributeValues(cleanAttributes);
    await CompanyValidator.performSpecialValidation(processedAttributes);

    try {
      const validatedAttributes =
        await CompanyValidator.validateAttributeTypes(processedAttributes);
      return validatedAttributes as CompanyUpdateInput;
    } catch (error: unknown) {
      handleAttributeValidationError(error);
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
    const processedValue = await processFieldValue(
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
      ensureSafeUrl(processedValue, 'Website');
    }

    if (
      attributeName === 'linkedin_url' &&
      processedValue &&
      typeof processedValue === 'string'
    ) {
      LinkedInUrlValidator.validate(processedValue);
      const url = ensureSafeUrl(processedValue, 'LinkedIn URL');
      if (!isLinkedInHostname(url.hostname)) {
        throw new InvalidCompanyDataError(
          'LinkedIn URL must be a valid LinkedIn URL'
        );
      }
    }

    const attributeObj = { [attributeName]: processedValue };

    try {
      const validatedObj =
        await CompanyValidator.validateAttributeTypes(attributeObj);
      return validatedObj[attributeName];
    } catch (error: unknown) {
      handleAttributeValidationError(error);
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
      const cached = TypeCache.getFieldType(field);
      if (cached) {
        expectedType = cached;
      } else {
        expectedType = await detectFieldType(ResourceType.COMPANIES, field);
        TypeCache.setFieldType(field, expectedType);
      }
    } catch {
      const log = createScopedLogger('CompanyValidator', 'validateFieldType');
      log.warn('Failed to detect field type; using fallback', { field });
      expectedType = CompanyValidator.inferFieldType(field);
    }

    const actualType = Array.isArray(value) ? 'array' : typeof value;

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
            const numValue = Number(value);
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
      ensureSafeUrl(attributes.website, 'Website');
    }

    if (
      attributes.linkedin_url &&
      typeof attributes.linkedin_url === 'string'
    ) {
      LinkedInUrlValidator.validate(attributes.linkedin_url);
      const url = ensureSafeUrl(attributes.linkedin_url, 'LinkedIn URL');
      if (!isLinkedInHostname(url.hostname)) {
        throw new InvalidCompanyDataError(
          'LinkedIn URL must be a valid LinkedIn URL'
        );
      }
    }

    if (attributes.location) {
      const locationType = await detectFieldType(
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

    const arrayFieldPatterns = [
      'products',
      'categories',
      'keywords',
      'tags',
      'emails',
      'phones',
      'addresses',
      'social_profiles',
    ];

    const objectFieldPatterns = [
      'location',
      'address',
      'metadata',
      'settings',
      'preferences',
    ];

    const numberFieldPatterns = [
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

    const booleanFieldPatterns = [
      'is_',
      'has_',
      'enabled',
      'active',
      'verified',
      'published',
    ];
    const lowerField = field.toLowerCase();

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
    const now = Date.now();
    const cachedInfo = TypeCache.getAttributeType(attributeName);

    if (cachedInfo && TypeCache.isFresh(cachedInfo as CachedTypeInfo, now)) {
      return cachedInfo.validatorType;
    }

    try {
      const typeInfo = await getAttributeTypeInfo(
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
      const fieldType = TypeCache.getFieldType(attributeName);
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

      const inferredType = this.inferFieldType(attributeName);
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

    const validatorTypes = new Map<string, AttributeType>();

    try {
      await Promise.all(
        Object.keys(attributesToValidate).map(async (attributeName) => {
          try {
            const validatorType = await this.getValidatorType(attributeName);
            validatorTypes.set(attributeName, validatorType);
          } catch {
            const log = createScopedLogger(
              'CompanyValidator',
              'validateAttributeTypes'
            );
            log.warn(
              'Could not determine type for attribute; using string as fallback',
              { attributeName }
            );
            validatorTypes.set(attributeName, 'string');
          }
        })
      );

      for (const [attributeName, value] of Object.entries(
        attributesToValidate
      )) {
        const validatorType = validatorTypes.get(attributeName) || 'string';

        const result = validateAttributeValue(
          attributeName,
          value,
          validatorType
        );

        if (result.valid) {
          validatedAttributes[attributeName] =
            result.convertedValue as unknown as ProcessedFieldValue;
        } else {
          hasErrors = true;
          errors[attributeName] =
            result.error || `Invalid value for ${attributeName}`;
        }
      }
    } catch (error: unknown) {
      const log = createScopedLogger(
        'CompanyValidator',
        'validateAttributeTypes'
      );
      log.error('Unexpected error during batch validation', error);

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

          const result = validateAttributeValue(
            attributeName,
            value,
            validatorType
          );

          if (result.valid) {
            validatedAttributes[attributeName] =
              result.convertedValue as unknown as ProcessedFieldValue;
          } else {
            hasErrors = true;
            errors[attributeName] =
              result.error || `Invalid value for ${attributeName}`;
          }
        } catch {
          const log2 = createScopedLogger(
            'CompanyValidator',
            'validateAttributeTypes'
          );
          log2.warn(
            'Validation failed for attribute; proceeding with original value',
            { attributeName }
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
