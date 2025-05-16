/**
 * Validator for company data
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

export class CompanyValidator {
  /**
   * Validates data for creating a company
   * 
   * @param attributes - Raw attributes for company creation
   * @returns Validated company create input
   * @throws MissingCompanyFieldError if required fields are missing
   * @throws InvalidCompanyFieldTypeError if field types are invalid
   */
  static validateCreate(attributes: any): CompanyCreateInput {
    // Check required fields
    if (!attributes.name) {
      throw new MissingCompanyFieldError('name');
    }

    // Validate field types
    if (typeof attributes.name !== 'string') {
      throw new InvalidCompanyFieldTypeError('name', 'string', typeof attributes.name);
    }

    // Validate optional string fields
    const optionalStringFields = ['website', 'industry', 'description', 'domain', 'size', 'linkedin_url'];
    for (const field of optionalStringFields) {
      if (attributes[field] !== undefined && typeof attributes[field] !== 'string') {
        throw new InvalidCompanyFieldTypeError(field, 'string', typeof attributes[field]);
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

    // Validate location if provided
    if (attributes.location) {
      if (typeof attributes.location !== 'object' || Array.isArray(attributes.location)) {
        throw new InvalidCompanyFieldTypeError('location', 'object', typeof attributes.location);
      }
    }

    return attributes as CompanyCreateInput;
  }

  /**
   * Validates data for updating a company
   * 
   * @param companyId - ID of the company to update
   * @param attributes - Raw attributes for company update
   * @returns Validated company update input
   * @throws InvalidCompanyDataError if company ID is invalid
   * @throws InvalidCompanyFieldTypeError if field types are invalid
   */
  static validateUpdate(companyId: string, attributes: any): CompanyUpdateInput {
    // Validate company ID
    if (!companyId || typeof companyId !== 'string') {
      throw new InvalidCompanyDataError('Company ID must be a non-empty string');
    }

    // Validate field types (same as create but all optional)
    const optionalStringFields = ['name', 'website', 'industry', 'description', 'domain', 'size', 'linkedin_url'];
    for (const field of optionalStringFields) {
      if (attributes[field] !== undefined && typeof attributes[field] !== 'string') {
        throw new InvalidCompanyFieldTypeError(field, 'string', typeof attributes[field]);
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

    // Validate location if provided
    if (attributes.location) {
      if (typeof attributes.location !== 'object' || Array.isArray(attributes.location)) {
        throw new InvalidCompanyFieldTypeError('location', 'object', typeof attributes.location);
      }
    }

    return attributes as CompanyUpdateInput;
  }

  /**
   * Validates a single attribute update
   * 
   * @param companyId - ID of the company to update
   * @param attributeName - Name of the attribute to update
   * @param attributeValue - Value to set for the attribute
   * @throws InvalidCompanyDataError if validation fails
   */
  static validateAttributeUpdate(companyId: string, attributeName: string, attributeValue: any): void {
    // Validate company ID
    if (!companyId || typeof companyId !== 'string') {
      throw new InvalidCompanyDataError('Company ID must be a non-empty string');
    }

    // Validate attribute name
    if (!attributeName || typeof attributeName !== 'string') {
      throw new InvalidCompanyDataError('Attribute name must be a non-empty string');
    }

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
}