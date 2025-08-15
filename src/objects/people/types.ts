/**
 * Shared types for people module
 */
import { isValidEmail } from '../../utils/validation/email-validation.js';
import { InvalidPersonDataError } from './errors.js';

/**
 * Interface for attributes when creating or updating a person
 */
export interface PersonAttributes {
  /** Person's full name */
  name?: string;

  /** Email addresses (array of strings) */
  email_addresses?: string[];

  /** Phone numbers (array of strings) */
  phone_numbers?: string[];

  /** Job title */
  job_title?: string;

  /** Associated company ID or company name to look up */
  company?: string | { record_id: string };

  /** Custom attributes */
  [key: string]:
    | string
    | string[]
    | number
    | boolean
    | { record_id: string }
    | undefined;
}

// Re-export error classes for backward compatibility
export { PersonOperationError, InvalidPersonDataError } from './errors.js';

// Validator for person data
export class PersonValidator {
  static async validateCreate(
    attributes: PersonAttributes
  ): Promise<PersonAttributes> {
    // Basic validation - ensure we have at least an email or name
    if (!attributes.email_addresses && !attributes.name) {
      throw new InvalidPersonDataError(
        'Must provide at least an email address or name'
      );
    }

    // Ensure email_addresses is an array if provided
    if (
      attributes.email_addresses &&
      !Array.isArray(attributes.email_addresses)
    ) {
      attributes.email_addresses = [attributes.email_addresses];
    }

    // Validate email format
    if (attributes.email_addresses) {
      for (const email of attributes.email_addresses) {
        if (!isValidEmail(email)) {
          throw new InvalidPersonDataError(`Invalid email format: ${email}`);
        }
      }
    }

    return attributes;
  }

  static async validateUpdate(
    personId: string,
    attributes: PersonAttributes
  ): Promise<PersonAttributes> {
    if (!personId || typeof personId !== 'string') {
      throw new InvalidPersonDataError('Person ID must be a non-empty string');
    }

    // Ensure at least one attribute is being updated
    if (!attributes || Object.keys(attributes).length === 0) {
      throw new InvalidPersonDataError(
        'Must provide at least one attribute to update'
      );
    }

    return attributes;
  }

  static async validateAttributeUpdate(
    personId: string,
    attributeName: string,
    attributeValue: string | string[] | { record_id: string } | undefined
  ): Promise<void> {
    if (!personId || typeof personId !== 'string') {
      throw new InvalidPersonDataError('Person ID must be a non-empty string');
    }

    if (!attributeName || typeof attributeName !== 'string') {
      throw new InvalidPersonDataError(
        'Attribute name must be a non-empty string'
      );
    }

    // Special validation for email_addresses
    if (attributeName === 'email_addresses' && attributeValue) {
      const emails = Array.isArray(attributeValue)
        ? attributeValue
        : [attributeValue];

      for (const email of emails) {
        if (typeof email === 'string' && !isValidEmail(email)) {
          throw new InvalidPersonDataError(`Invalid email format: ${email}`);
        } else if (typeof email !== 'string') {
          throw new InvalidPersonDataError(
            `Email must be a string, got: ${typeof email}`
          );
        }
      }
    }
  }

  static validateDelete(personId: string): void {
    if (!personId || typeof personId !== 'string') {
      throw new InvalidPersonDataError('Person ID must be a non-empty string');
    }
  }
}
