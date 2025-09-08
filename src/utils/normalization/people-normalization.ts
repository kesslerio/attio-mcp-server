/**
 * People Input Normalization
 *
 * Handles normalization of people data to support multiple input formats.
 * Converts various input shapes to the standard Attio API format.
 */

import { isValidEmail } from '../validation/email-validation.js';

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
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email_addresses?: Array<{
    email_address: string;
    email_type?: string;
  }>;
  phone_numbers?: Array<{
    phone_number: string;
    phone_type?: string;
  }>;
  [key: string]: unknown;
}

/**
 * Normalizes people input data to standard format
 */
export class PeopleDataNormalizer {
  /**
   * Normalize name input to standard format
   */
  static normalizeName(
    input: unknown,
    options?: { includeFullName?: boolean }
  ):
    | { first_name?: string; last_name?: string; full_name?: string }
    | undefined {
    if (!input) return undefined;

    // Handle string input
    if (typeof input === 'string') {
      if (!trimmed) return undefined;

      // Try to split into first and last name
      let result: {
        first_name?: string;
        last_name?: string;
        full_name?: string;
      };

      if (parts.length === 1) {
        result = { first_name: parts[0], full_name: trimmed };
      } else if (parts.length === 2) {
        result = {
          first_name: parts[0],
          last_name: parts[1],
          full_name: trimmed,
        };
      } else {
        // Multiple parts - take first as first name, last as last name
        result = {
          first_name: parts[0],
          last_name: parts[parts.length - 1],
          full_name: trimmed,
        };
      }

      // Filter out full_name if not explicitly requested
      if (!options?.includeFullName && result.full_name) {
        const { full_name, ...filtered } = result;
        return filtered;
      }

      return result;
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

      if (Object.keys(result).length === 0) return undefined;

      // Filter out full_name if not explicitly requested
      if (!options?.includeFullName && result.full_name) {
        const { full_name, ...filtered } = result;
        return Object.keys(filtered).length > 0 ? filtered : undefined;
      }

      return result;
    }

    return undefined;
  }

  /**
   * Extract email value from various input formats
   */
  private static extractEmailValue(emailField: unknown): string | null {
    if (typeof emailField === 'string') {
      return emailField;
    }
    if (typeof emailField === 'object' && emailField && 'value' in emailField) {
      if (typeof value === 'string') {
        return value;
      }
    }

    // Handle malformed inputs - don't try to convert objects, arrays, etc. to strings
    if (emailField === null || emailField === undefined) {
      return null;
    }
    if (typeof emailField === 'object' || Array.isArray(emailField)) {
      return null; // Don't convert objects/arrays to "[object object]" strings
    }
    if (typeof emailField === 'number' || typeof emailField === 'boolean') {
      return null; // Don't convert numbers/booleans to strings for email validation
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

    // Check if the normalized email is empty or invalid
    if (!normalized || !normalized.trim()) {
      if (config.mode === EmailValidationMode.STRICT) {
        throw new UniversalValidationError(
          `Invalid email format: "${emailValue}". Please provide a valid email address (e.g., user@example.com)`,
          ErrorType.USER_ERROR,
          {
            field: 'email_addresses',
            suggestion:
              'Ensure email addresses are in the format: user@domain.com',
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
    input: unknown,
    config: EmailValidationConfig = DEFAULT_EMAIL_VALIDATION_CONFIG
  ): Array<{ email_address: string; email_type?: string }> | undefined {
    if (input === null || input === undefined) return undefined;

    const emails: Array<{ email_address: string; email_type?: string }> = [];

    // Handle string input
    if (typeof input === 'string') {
      if (validatedEmail) {
        emails.push({ email_address: validatedEmail });
      }
    }
    // Handle array input
    else if (Array.isArray(input)) {
      for (const item of input) {
        if (typeof item === 'string') {
          if (validatedEmail) {
            emails.push({ email_address: validatedEmail });
          }
        } else if (typeof item === 'object' && item) {
          // ISSUE #518 FIX: Enhanced object email format support
          // Added support for multiple object formats: {email_address: "..."}, {value: "..."}, {email: "..."}
          // Handle objects with email_address field (official Attio API format)
          if (item.email_address) {
            if (emailValue) {
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
          // Handle objects with value field (alternative format)
          else if (item.value) {
            if (emailValue) {
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
          // Handle objects with email field (alternative format)
          else if (item.email) {
            if (emailValue) {
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
      }
    }
    // Handle object input
    else if (typeof input === 'object') {
      // Check for email_address field
      if (input.email_address) {
        if (emailValue) {
            emailValue,
            config
          );
          if (validatedEmail) {
            emails.push({
              email_address: validatedEmail,
              email_type: input.email_type || input.type,
            });
          }
        }
      }
      // Check for email_addresses field
      else if (input.email_addresses && Array.isArray(input.email_addresses)) {
        if (normalized) {
          emails.push(...normalized);
        }
      }
      // Check for email field (singular)
      else if (input.email) {
        if (emailValue) {
            emailValue,
            config
          );
          if (validatedEmail) {
            emails.push({ email_address: validatedEmail });
          }
        }
      }
      // Check for emails field (plural)
      else if (input.emails && Array.isArray(input.emails)) {
        if (normalized) {
          emails.push(...normalized);
        }
      }
    }

    if (emails.length === 0) return undefined;

    // Add default email_type: "primary" for single emails without a type
    if (emails.length === 1 && !emails[0].email_type) {
      emails[0].email_type = 'primary';
    }

    // For multiple emails, ensure first has primary if none specified
    if (emails.length > 1) {
      if (!hasTyped) {
        emails[0].email_type = 'primary';
        for (let i = 1; i < emails.length; i++) {
          emails[i].email_type = 'secondary';
        }
      }
    }

    return emails;
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
      if (normalized) {
        phones.push({ phone_number: normalized });
      }
    }
    // Handle array input
    else if (Array.isArray(input)) {
      for (const item of input) {
        if (typeof item === 'string') {
          if (normalized) {
            phones.push({ phone_number: normalized });
          }
        } else if (
          typeof item === 'object' &&
          (item.phone_number || item.number)
        ) {
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
        'phone_number',
        'phone',
        'phoneNumber',
        'mobile',
        'telephone',
      ];
      for (const field of phoneFields) {
        if (input[field]) {
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
    normalized = normalized.replace(/\D/g, '');

    // Re-add + if it was there
    if (hasPlus) {
      normalized = '+' + normalized;
    }

    // Basic validation - should have at least 7 digits
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
    data: unknown,
    emailConfig: EmailValidationConfig = DEFAULT_EMAIL_VALIDATION_CONFIG
  ): NormalizedPeopleData {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {};
    }

    const normalized: NormalizedPeopleData = {};

    // Normalize name
      'name',
      'first_name',
      'last_name',
      'full_name',
      'firstName',
      'lastName',
    ];

    if (hasNameField) {
      if (nameData) {
        // Create name array for Attio personal-name format
        normalized.name = [
          {
            first_name: nameData.first_name || '',
            last_name: nameData.last_name || '',
            full_name:
              nameData.full_name ||
              [nameData.first_name, nameData.last_name]
                .filter(Boolean)
                .join(' '),
          },
        ];

        // Also add flattened fields for backward compatibility with attribute-format-helpers
        if (nameData.first_name) {
          normalized.first_name = nameData.first_name;
        }
        if (nameData.last_name) {
          normalized.last_name = nameData.last_name;
        }
        if (nameData.full_name) {
          normalized.full_name = nameData.full_name;
        }
      }
    }

    // Normalize emails
      'email',
      'emails',
      'email_address',
      'email_addresses',
      'emailAddress',
    ];

    if (hasEmailField) {
      if (emailData) {
        normalized.email_addresses = emailData;
      }
    }

    // Normalize phones
      'phone',
      'phones',
      'phone_number',
      'phone_numbers',
      'phoneNumber',
      'mobile',
      'telephone',
    ];

    if (hasPhoneField) {
      if (phoneData) {
        normalized.phone_numbers = phoneData;
      }
    }

    // Copy over other fields that aren't being normalized
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
  static needsNormalization(data: unknown): boolean {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return false;
    }

    // Check for fields that indicate people data needing normalization
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
