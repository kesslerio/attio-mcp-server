/**
 * People Input Normalization
 *
 * Handles normalization of people data to support multiple input formats.
 * Converts various input shapes to the standard Attio API format.
 */

import {
  SanitizedObject,
  InputSanitizer,
} from '../../handlers/tool-configs/universal/schemas.js';
import { isValidEmail } from '../validation/email-validation.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../../handlers/tool-configs/universal/schemas.js';
import {
  EmailValidationConfig,
  EmailValidationMode,
  getEmailValidationConfig,
  DEFAULT_EMAIL_VALIDATION_CONFIG,
} from './email-validation-config.js';

/**
 * People name input formats
 */
export interface NameStringInput {
  name: string;
}

export interface NameObjectInput {
  first_name?: string;
  last_name?: string;
  full_name?: string;
}

export type NameInput = string | NameStringInput | NameObjectInput;

/**
 * Email input formats
 */
export type EmailInput =
  | string
  | string[]
  | { email_address: string }
  | { email_addresses: string[] };

/**
 * Normalized people data
 */
export interface NormalizedPeopleData {
  name?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
  email_addresses?: Array<{
    email_address: string;
    email_type?: string;
  }>;
  [key: string]: any;
}

/**
 * Normalizes people input data to standard format
 */
export class PeopleDataNormalizer {
  /**
   * Normalize name input to standard format
   */
  static normalizeName(
    input: any
  ):
    | { first_name?: string; last_name?: string; full_name?: string }
    | undefined {
    if (!input) return undefined;

    // Handle string input
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) return undefined;

      // Try to split into first and last name
      const parts = trimmed.split(/\s+/);
      if (parts.length === 1) {
        return { first_name: parts[0], full_name: trimmed };
      } else if (parts.length === 2) {
        return {
          first_name: parts[0],
          last_name: parts[1],
          full_name: trimmed,
        };
      } else {
        // Multiple parts - take first as first name, rest as last name
        return {
          first_name: parts[0],
          last_name: parts.slice(1).join(' '),
          full_name: trimmed,
        };
      }
    }

    // Handle object input
    if (typeof input === 'object' && !Array.isArray(input)) {
      const result: {
        first_name?: string;
        last_name?: string;
        full_name?: string;
      } = {};

      // Check for name field (string)
      if (typeof input.name === 'string') {
        return this.normalizeName(input.name);
      }

      // Check for first_name and last_name
      if (input.first_name || input.last_name) {
        if (input.first_name) {
          result.first_name = String(input.first_name).trim();
        }
        if (input.last_name) {
          result.last_name = String(input.last_name).trim();
        }

        // Generate full_name if not provided
        if (!input.full_name && (result.first_name || result.last_name)) {
          result.full_name = [result.first_name, result.last_name]
            .filter(Boolean)
            .join(' ');
        }
      }

      // Check for full_name
      if (input.full_name) {
        result.full_name = String(input.full_name).trim();

        // If we don't have first/last name, try to extract from full name
        if (!result.first_name && !result.last_name) {
          const parts = result.full_name.split(/\s+/);
          if (parts.length >= 2) {
            result.first_name = parts[0];
            result.last_name = parts.slice(1).join(' ');
          } else if (parts.length === 1) {
            result.first_name = parts[0];
          }
        }
      }

      // Check for firstName/lastName (camelCase variants)
      if (input.firstName) {
        result.first_name = String(input.firstName).trim();
      }
      if (input.lastName) {
        result.last_name = String(input.lastName).trim();
      }

      return Object.keys(result).length > 0 ? result : undefined;
    }

    return undefined;
  }

  /**
   * Extract email value from various input formats
   */
  private static extractEmailValue(emailField: unknown): string {
    if (typeof emailField === 'string') {
      return emailField;
    }
    if (typeof emailField === 'object' && emailField && 'value' in emailField) {
      return String((emailField as any).value);
    }
    return String(emailField);
  }

  /**
   * Validate and process a single email based on configuration
   */
  private static validateAndProcessEmail(
    emailValue: string,
    config: EmailValidationConfig
  ): string | null {
    const normalized = InputSanitizer.normalizeEmail(emailValue);
    
    // Check if the normalized email is empty or invalid
    if (!normalized || !normalized.trim()) {
      if (config.mode === EmailValidationMode.STRICT) {
        throw new UniversalValidationError(
          `Invalid email format: "${emailValue}". Please provide a valid email address (e.g., user@example.com)`,
          ErrorType.USER_ERROR,
          {
            field: 'email_addresses',
            suggestion: 'Ensure email addresses are in the format: user@domain.com',
          }
        );
      }
      return null;
    }

    if (!isValidEmail(normalized)) {
      switch (config.mode) {
        case EmailValidationMode.STRICT:
          throw new UniversalValidationError(
            `Invalid email format: "${normalized}". Please provide a valid email address (e.g., user@example.com)`,
            ErrorType.USER_ERROR,
            {
              field: 'email_addresses',
              suggestion:
                'Ensure email addresses are in the format: user@domain.com',
            }
          );

        case EmailValidationMode.WARN:
          config.logger?.(
            `WARNING: Invalid email format "${normalized}" was skipped. Consider updating to a valid format.`,
            'warn'
          );
          return null;

        case EmailValidationMode.LEGACY:
          if (config.logDeprecationWarnings) {
            config.logger?.(
              'DEPRECATION WARNING: Invalid emails are being silently ignored. This behavior will change in a future version. Use EMAIL_VALIDATION_MODE=strict for new behavior.',
              'warn'
            );
          }
          return null;

        default:
          return null;
      }
    }

    return normalized;
  }

  /**
   * Normalize email input to standard format
   *
   * @param input - Email input in various formats
   * @param config - Email validation configuration (optional)
   */
  static normalizeEmails(
    input: any,
    config: EmailValidationConfig = DEFAULT_EMAIL_VALIDATION_CONFIG
  ): Array<{ email_address: string; email_type?: string }> | undefined {
    if (!input) return undefined;

    const emails: Array<{ email_address: string; email_type?: string }> = [];

    // Handle string input
    if (typeof input === 'string') {
      const validatedEmail = this.validateAndProcessEmail(input, config);
      if (validatedEmail) {
        emails.push({ email_address: validatedEmail });
      }
    }
    // Handle array input
    else if (Array.isArray(input)) {
      for (const item of input) {
        if (typeof item === 'string') {
          const validatedEmail = this.validateAndProcessEmail(item, config);
          if (validatedEmail) {
            emails.push({ email_address: validatedEmail });
          }
        } else if (typeof item === 'object' && item.email_address) {
          const emailValue = this.extractEmailValue(item.email_address);
          const validatedEmail = this.validateAndProcessEmail(
            emailValue,
            config
          );
          if (validatedEmail) {
            emails.push({
              email_address: validatedEmail,
              email_type: item.email_type || item.type,
            });
          }
        }
      }
    }
    // Handle object input
    else if (typeof input === 'object') {
      // Check for email_address field
      if (input.email_address) {
        const emailValue = this.extractEmailValue(input.email_address);
        const validatedEmail = this.validateAndProcessEmail(emailValue, config);
        if (validatedEmail) {
          emails.push({
            email_address: validatedEmail,
            email_type: input.email_type || input.type,
          });
        }
      }
      // Check for email_addresses field
      else if (input.email_addresses) {
        const normalized = this.normalizeEmails(input.email_addresses, config);
        if (normalized) {
          emails.push(...normalized);
        }
      }
      // Check for email field (singular)
      else if (input.email) {
        const emailValue = this.extractEmailValue(input.email);
        const validatedEmail = this.validateAndProcessEmail(emailValue, config);
        if (validatedEmail) {
          emails.push({ email_address: validatedEmail });
        }
      }
      // Check for emails field (plural)
      else if (input.emails) {
        const normalized = this.normalizeEmails(input.emails, config);
        if (normalized) {
          emails.push(...normalized);
        }
      }
    }

    return emails.length > 0 ? emails : undefined;
  }

  /**
   * Normalize phone number input
   */
  static normalizePhones(
    input: any
  ): Array<{ phone_number: string; phone_type?: string }> | undefined {
    if (!input) return undefined;

    const phones: Array<{ phone_number: string; phone_type?: string }> = [];

    // Handle string input
    if (typeof input === 'string') {
      const normalized = this.normalizePhoneNumber(input);
      if (normalized) {
        phones.push({ phone_number: normalized });
      }
    }
    // Handle array input
    else if (Array.isArray(input)) {
      for (const item of input) {
        if (typeof item === 'string') {
          const normalized = this.normalizePhoneNumber(item);
          if (normalized) {
            phones.push({ phone_number: normalized });
          }
        } else if (
          typeof item === 'object' &&
          (item.phone_number || item.number)
        ) {
          const normalized = this.normalizePhoneNumber(
            item.phone_number || item.number
          );
          if (normalized) {
            phones.push({
              phone_number: normalized,
              phone_type: item.phone_type || item.type,
            });
          }
        }
      }
    }
    // Handle object input
    else if (typeof input === 'object') {
      // Check various phone field names
      const phoneFields = [
        'phone_number',
        'phone',
        'phoneNumber',
        'mobile',
        'telephone',
      ];
      for (const field of phoneFields) {
        if (input[field]) {
          const normalized = this.normalizePhoneNumber(input[field]);
          if (normalized) {
            phones.push({
              phone_number: normalized,
              phone_type: input.phone_type || input.type,
            });
            break;
          }
        }
      }

      // Check for phone_numbers array
      if (input.phone_numbers || input.phones) {
        const normalized = this.normalizePhones(
          input.phone_numbers || input.phones
        );
        if (normalized) {
          phones.push(...normalized);
        }
      }
    }

    return phones.length > 0 ? phones : undefined;
  }

  /**
   * Normalize a single phone number
   */
  private static normalizePhoneNumber(phone: string): string | undefined {
    if (!phone || typeof phone !== 'string') return undefined;

    // Remove all non-digit characters except + at the beginning
    let normalized = phone.trim();
    const hasPlus = normalized.startsWith('+');
    normalized = normalized.replace(/\D/g, '');

    // Re-add + if it was there
    if (hasPlus) {
      normalized = '+' + normalized;
    }

    // Basic validation - should have at least 7 digits
    const digitCount = normalized.replace(/\D/g, '').length;
    if (digitCount < 7 || digitCount > 15) {
      return undefined;
    }

    return normalized;
  }

  /**
   * Normalize complete people record data
   *
   * @param data - People data to normalize
   * @param emailConfig - Email validation configuration (optional)
   */
  static normalizePeopleData(
    data: any,
    emailConfig: EmailValidationConfig = DEFAULT_EMAIL_VALIDATION_CONFIG
  ): NormalizedPeopleData {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {};
    }

    const sanitized = InputSanitizer.sanitizeObject(data) as SanitizedObject;
    const normalized: NormalizedPeopleData = {};

    // Normalize name
    const nameFields = [
      'name',
      'first_name',
      'last_name',
      'full_name',
      'firstName',
      'lastName',
    ];
    const hasNameField = nameFields.some((field) => field in sanitized);

    if (hasNameField) {
      const nameData = this.normalizeName(sanitized);
      if (nameData) {
        normalized.name = nameData;
      }
    }

    // Normalize emails
    const emailFields = [
      'email',
      'emails',
      'email_address',
      'email_addresses',
      'emailAddress',
    ];
    const hasEmailField = emailFields.some((field) => field in sanitized);

    if (hasEmailField) {
      const emailData = this.normalizeEmails(sanitized, emailConfig);
      if (emailData) {
        normalized.email_addresses = emailData;
      }
    }

    // Normalize phones
    const phoneFields = [
      'phone',
      'phones',
      'phone_number',
      'phone_numbers',
      'phoneNumber',
      'mobile',
      'telephone',
    ];
    const hasPhoneField = phoneFields.some((field) => field in sanitized);

    if (hasPhoneField) {
      const phoneData = this.normalizePhones(sanitized);
      if (phoneData) {
        normalized.phone_numbers = phoneData;
      }
    }

    // Copy over other fields that aren't being normalized
    const normalizedFields = new Set([
      ...nameFields,
      ...emailFields,
      ...phoneFields,
    ]);

    for (const [key, value] of Object.entries(sanitized)) {
      if (!normalizedFields.has(key)) {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Check if data needs people normalization
   */
  static needsNormalization(data: any): boolean {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return false;
    }

    // Check for fields that indicate people data needing normalization
    const peopleFields = [
      'name', // String name instead of object
      'email', // Singular email
      'email_address', // Singular email address
      'phone', // Singular phone
      'phone_number', // Singular phone number
      'firstName', // CamelCase variants
      'lastName',
      'emailAddress',
      'phoneNumber',
    ];

    return peopleFields.some((field) => field in data);
  }
}
