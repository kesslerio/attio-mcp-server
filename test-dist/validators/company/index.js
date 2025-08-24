/**
 * Validator for company data with dynamic field type detection
 * Enhanced with attribute type validation
 */
import { MissingCompanyFieldError, InvalidCompanyFieldTypeError, InvalidCompanyDataError, } from '../../errors/company-errors.js';
import { getAttributeTypeInfo, detectFieldType, } from '../../api/attribute-types.js';
import { ResourceType } from '../../types/attio.js';
import { validateAttributeValue, } from '../attribute-validator.js';
import { InvalidRequestError } from '../../errors/api-errors.js';
import { extractDomain, normalizeDomain } from '../../utils/domain-utils.js';
import { processFieldValue } from './field_detector.js';
import { TypeCache } from './type_cache.js';
export class CompanyValidator {
    /**
     * Process all attributes in an object, converting values as needed
     *
     * @param attributes - Object containing attribute key-value pairs
     * @returns Processed attributes object with converted values
     */
    static async processAttributeValues(attributes) {
        const processedAttributes = {};
        for (const [field, value] of Object.entries(attributes)) {
            if (value !== undefined && value !== null) {
                await CompanyValidator.validateFieldType(field, value);
                processedAttributes[field] = await processFieldValue(field, value);
            }
            else {
                processedAttributes[field] = value;
            }
        }
        return processedAttributes;
    }
    /**
     * Automatically extracts domain from website URL if domains field is not provided
     */
    static extractDomainFromWebsite(attributes) {
        if (attributes.website &&
            !attributes.domains &&
            typeof attributes.website === 'string') {
            const extractedDomain = extractDomain(attributes.website);
            if (extractedDomain) {
                const normalizedDomain = normalizeDomain(extractedDomain);
                if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
                    console.error(`[CompanyValidator] Auto-extracted domain "${normalizedDomain}" from website "${attributes.website}"`);
                }
                attributes.domains = [normalizedDomain];
                attributes._autoExtractedDomains = true;
            }
        }
        return attributes;
    }
    static async validateCreate(attributes) {
        if (!attributes.name) {
            throw new MissingCompanyFieldError('name');
        }
        const attributesWithDomain = CompanyValidator.extractDomainFromWebsite(attributes);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _autoExtractedDomains, ...cleanAttributes } = attributesWithDomain;
        const processedAttributes = await CompanyValidator.processAttributeValues(cleanAttributes);
        await CompanyValidator.performSpecialValidation(processedAttributes);
        try {
            const validatedAttributes = await CompanyValidator.validateAttributeTypes(processedAttributes);
            return validatedAttributes;
        }
        catch (error) {
            if (error instanceof InvalidRequestError) {
                throw error;
            }
            throw new InvalidCompanyDataError(`Attribute validation failed: ${error.message}`);
        }
    }
    static async validateUpdate(companyId, attributes) {
        if (!companyId || typeof companyId !== 'string') {
            throw new InvalidCompanyDataError('Company ID must be a non-empty string for update');
        }
        const attributesWithDomain = CompanyValidator.extractDomainFromWebsite(attributes);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _autoExtractedDomains, ...cleanAttributes } = attributesWithDomain;
        const processedAttributes = await CompanyValidator.processAttributeValues(cleanAttributes);
        await CompanyValidator.performSpecialValidation(processedAttributes);
        try {
            const validatedAttributes = await CompanyValidator.validateAttributeTypes(processedAttributes);
            return validatedAttributes;
        }
        catch (error) {
            if (error instanceof InvalidRequestError) {
                throw error;
            }
            throw new InvalidCompanyDataError(`Attribute validation failed: ${error.message}`);
        }
    }
    static async validateAttributeUpdate(companyId, attributeName, attributeValue) {
        if (!companyId || typeof companyId !== 'string') {
            throw new InvalidCompanyDataError('Company ID must be a non-empty string');
        }
        if (!attributeName || typeof attributeName !== 'string') {
            throw new InvalidCompanyDataError('Attribute name must be a non-empty string');
        }
        await CompanyValidator.validateFieldType(attributeName, attributeValue);
        const processedValue = await processFieldValue(attributeName, attributeValue);
        if (attributeName === 'name' &&
            (!processedValue || typeof processedValue !== 'string')) {
            throw new InvalidCompanyDataError('Company name must be a non-empty string');
        }
        if (attributeName === 'website' &&
            processedValue &&
            typeof processedValue === 'string') {
            try {
                new URL(processedValue);
            }
            catch {
                throw new InvalidCompanyDataError('Website must be a valid URL');
            }
        }
        if (attributeName === 'linkedin_url' &&
            processedValue &&
            typeof processedValue === 'string') {
            try {
                const url = new URL(processedValue);
                if (!url.hostname.includes('linkedin.com')) {
                    throw new InvalidCompanyDataError('LinkedIn URL must be a valid LinkedIn URL');
                }
            }
            catch {
                throw new InvalidCompanyDataError('LinkedIn URL must be a valid URL');
            }
        }
        const attributeObj = { [attributeName]: processedValue };
        try {
            const validatedObj = await CompanyValidator.validateAttributeTypes(attributeObj);
            return validatedObj[attributeName];
        }
        catch (error) {
            if (error instanceof InvalidRequestError) {
                throw error;
            }
            throw new InvalidCompanyDataError(`Attribute validation failed: ${error.message}`);
        }
    }
    static async validateFieldType(field, value) {
        if (value === null || value === undefined) {
            return;
        }
        if (field === 'domains') {
            return;
        }
        let expectedType;
        try {
            const cached = TypeCache.getFieldType(field);
            if (cached) {
                expectedType = cached;
            }
            else {
                expectedType = await detectFieldType(ResourceType.COMPANIES, field);
                TypeCache.setFieldType(field, expectedType);
            }
        }
        catch {
            console.warn(`Failed to detect field type for ${field}, using fallback`);
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
                            throw new InvalidCompanyFieldTypeError(field, 'number', actualType);
                        }
                        // String is convertible to number, allow it
                    }
                    else {
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
    static async performSpecialValidation(attributes) {
        if (attributes.services !== undefined && attributes.services !== null) {
            if (typeof attributes.services !== 'string') {
                throw new InvalidCompanyDataError('Services must be a string value (comma-separated for multiple services)');
            }
        }
        if (attributes.website && typeof attributes.website === 'string') {
            try {
                new URL(attributes.website);
            }
            catch {
                throw new InvalidCompanyDataError('Website must be a valid URL');
            }
        }
        if (attributes.linkedin_url &&
            typeof attributes.linkedin_url === 'string') {
            try {
                const url = new URL(attributes.linkedin_url);
                if (!url.hostname.includes('linkedin.com')) {
                    throw new InvalidCompanyDataError('LinkedIn URL must be a valid LinkedIn URL');
                }
            }
            catch {
                throw new InvalidCompanyDataError('LinkedIn URL must be a valid URL');
            }
        }
        if (attributes.location) {
            const locationType = await detectFieldType(ResourceType.COMPANIES, 'location');
            if (locationType === 'object' &&
                (typeof attributes.location !== 'object' ||
                    Array.isArray(attributes.location))) {
                throw new InvalidCompanyFieldTypeError('location', 'object', typeof attributes.location);
            }
        }
    }
    static inferFieldType(field) {
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
        if (booleanFieldPatterns.some((pattern) => lowerField.startsWith(pattern) || lowerField.includes(pattern))) {
            return 'boolean';
        }
        return 'string';
    }
    static validateDelete(companyId) {
        if (!companyId || typeof companyId !== 'string') {
            throw new InvalidCompanyDataError('Company ID must be a non-empty string');
        }
    }
    static clearFieldTypeCache() {
        TypeCache.clear();
    }
    static async getValidatorType(attributeName) {
        const now = Date.now();
        const cachedInfo = TypeCache.getAttributeType(attributeName);
        if (cachedInfo && TypeCache.isFresh(cachedInfo, now)) {
            return cachedInfo.validatorType;
        }
        try {
            const typeInfo = await getAttributeTypeInfo(ResourceType.COMPANIES, attributeName);
            let validatorType;
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
        }
        catch {
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
    static async validateAttributeTypes(attributes) {
        const validatedAttributes = {};
        const errors = {};
        let hasErrors = false;
        const attributesToValidate = {};
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
        const validatorTypes = new Map();
        try {
            await Promise.all(Object.keys(attributesToValidate).map(async (attributeName) => {
                try {
                    const validatorType = await this.getValidatorType(attributeName);
                    validatorTypes.set(attributeName, validatorType);
                }
                catch {
                    console.warn(`Could not determine type for attribute "${attributeName}". Using string as fallback.`);
                    validatorTypes.set(attributeName, 'string');
                }
            }));
            for (const [attributeName, value] of Object.entries(attributesToValidate)) {
                const validatorType = validatorTypes.get(attributeName) || 'string';
                const result = validateAttributeValue(attributeName, value, validatorType);
                if (result.valid) {
                    validatedAttributes[attributeName] = result.convertedValue;
                }
                else {
                    hasErrors = true;
                    errors[attributeName] =
                        result.error || `Invalid value for ${attributeName}`;
                }
            }
        }
        catch (error) {
            console.error('Unexpected error during batch validation:', error.message);
            for (const [attributeName, value] of Object.entries(attributesToValidate)) {
                try {
                    let validatorType;
                    try {
                        validatorType = await this.getValidatorType(attributeName);
                    }
                    catch {
                        validatorType = 'string';
                    }
                    const result = validateAttributeValue(attributeName, value, validatorType);
                    if (result.valid) {
                        validatedAttributes[attributeName] = result.convertedValue;
                    }
                    else {
                        hasErrors = true;
                        errors[attributeName] =
                            result.error || `Invalid value for ${attributeName}`;
                    }
                }
                catch {
                    console.warn(`Validation failed for attribute "${attributeName}", proceeding with original value`);
                    validatedAttributes[attributeName] = value;
                }
            }
        }
        if (hasErrors) {
            throw new InvalidRequestError(`Invalid attribute values: ${Object.values(errors).join(', ')}`, 'companies/update', 'POST', { validationErrors: errors });
        }
        return validatedAttributes;
    }
}
