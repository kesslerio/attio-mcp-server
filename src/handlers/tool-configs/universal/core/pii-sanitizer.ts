/**
 * PII Sanitization for Validation Metadata
 *
 * Ensures that validation messages and metadata do not expose
 * personally identifiable information (PII) in logs or user-facing messages.
 */

import { createScopedLogger } from '../../../../utils/logger.js';
import { extractDisplayValue } from './value-extractors.js';

/**
 * Check if debug logging is enabled in current environment
 */
const isDebugEnabled = (): boolean => {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.DEBUG_DISABLE === 'true') return false;
  return (
    process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development'
  );
};

const logger = createScopedLogger('pii-sanitizer');

/**
 * PII patterns to detect and sanitize
 */
const PII_PATTERNS = {
  // Email addresses
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL]',
  },
  // Phone numbers (various formats)
  phone: {
    pattern:
      /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}/g,
    replacement: '[PHONE]',
  },
  // Social Security Numbers
  ssn: {
    pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    replacement: '[SSN]',
  },
  // Credit Card Numbers (basic pattern)
  creditCard: {
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '[CARD]',
  },
  // IP Addresses
  ipAddress: {
    pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    replacement: '[IP]',
  },
  // Generic sensitive number patterns (long sequences)
  sensitiveNumbers: {
    pattern: /\b\d{9,}\b/g,
    replacement: '[NUMBER]',
  },
};

/**
 * Fields that commonly contain PII and should be sanitized
 */
const PII_FIELD_NAMES = new Set([
  'email',
  'email_address',
  'personal_email',
  'work_email',
  'phone',
  'phone_number',
  'mobile',
  'mobile_phone',
  'personal_phone',
  'work_phone',
  'ssn',
  'social_security_number',
  'tax_id',
  'credit_card',
  'credit_card_number',
  'card_number',
  'address',
  'home_address',
  'billing_address',
  'street_address',
  'first_name',
  'last_name',
  'full_name',
  'date_of_birth',
  'dob',
  'birth_date',
  'passport',
  'passport_number',
  'driver_license',
  'drivers_license_number',
]);

/**
 * Check if a field name indicates it might contain PII
 */
export const isPotentialPIIField = (fieldName: string): boolean => {
  const normalizedFieldName = fieldName.toLowerCase().replace(/[-_\s]/g, '');

  // Check exact matches
  if (PII_FIELD_NAMES.has(fieldName.toLowerCase())) {
    return true;
  }

  // Check for partial matches
  const piiKeywords = [
    'email',
    'phone',
    'ssn',
    'address',
    'name',
    'birth',
    'card',
  ];
  return piiKeywords.some((keyword) => normalizedFieldName.includes(keyword));
};

/**
 * Sanitize a string value for PII
 */
export const sanitizeStringValue = (value: string): string => {
  if (typeof value !== 'string' || !value) return value;

  let sanitized = value;

  // Apply all PII patterns
  for (const [patternName, config] of Object.entries(PII_PATTERNS)) {
    const before = sanitized;
    sanitized = sanitized.replace(config.pattern, config.replacement);

    if (before !== sanitized && isDebugEnabled()) {
      logger.debug('PII pattern detected and sanitized', {
        pattern: patternName,
        originalLength: before.length,
        sanitizedLength: sanitized.length,
      });
    }
  }

  return sanitized;
};

/**
 * Sanitize any value (string, object, array) for PII
 */
export const sanitizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeStringValue(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object') {
    const sanitizedObject: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Check if the field name suggests it contains PII
      if (isPotentialPIIField(key)) {
        if (typeof val === 'string') {
          sanitizedObject[key] = '[REDACTED]';
          if (isDebugEnabled()) {
            logger.debug('PII field redacted', { fieldName: key });
          }
        } else {
          sanitizedObject[key] = sanitizeValue(val);
        }
      } else {
        sanitizedObject[key] = sanitizeValue(val);
      }
    }

    return sanitizedObject;
  }

  return value;
};

/**
 * Sanitize validation metadata to remove PII
 */
export interface SanitizedValidationMetadata {
  warnings?: string[];
  suggestions?: string[];
  actualValues?: Record<string, unknown>;
}

export const sanitizeValidationMetadata = (metadata?: {
  warnings?: string[];
  suggestions?: string[];
  actualValues?: Record<string, unknown>;
}): SanitizedValidationMetadata | undefined => {
  if (!metadata) return undefined;

  const sanitized: SanitizedValidationMetadata = {};

  // Sanitize warnings
  if (metadata.warnings?.length) {
    sanitized.warnings = metadata.warnings.map((warning) =>
      sanitizeStringValue(warning)
    );
  }

  // Sanitize suggestions
  if (metadata.suggestions?.length) {
    sanitized.suggestions = metadata.suggestions.map((suggestion) =>
      sanitizeStringValue(suggestion)
    );
  }

  // Sanitize actual values
  if (metadata.actualValues && Object.keys(metadata.actualValues).length > 0) {
    const sanitizedValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata.actualValues)) {
      if (isPotentialPIIField(key)) {
        sanitizedValues[key] = '[REDACTED]';
        if (isDebugEnabled()) {
          logger.info('PII field redacted in validation metadata', {
            fieldName: key,
            valueType: typeof value,
          });
        }
      } else {
        sanitizedValues[key] = sanitizeValue(value);
      }
    }

    sanitized.actualValues = sanitizedValues;
  }

  return sanitized;
};

/**
 * Enhanced format function with PII sanitization
 */
export const formatSanitizedActualValue = (value: unknown): string => {
  const sanitized = sanitizeValue(value);

  const displayValue = extractDisplayValue(sanitized);
  if (displayValue) {
    return sanitizeStringValue(displayValue);
  }

  if (typeof sanitized === 'string' && sanitized.trim().length > 0) {
    return sanitized.trim();
  }

  if (
    Array.isArray(sanitized) ||
    (sanitized && typeof sanitized === 'object')
  ) {
    return JSON.stringify(sanitized);
  }

  return String(sanitized);
};

/**
 * Safe logging function that sanitizes messages before logging
 */
export const sanitizedLog = (
  logger: ReturnType<typeof createScopedLogger>,
  level: 'error' | 'warn' | 'info' | 'debug',
  message: string,
  data?: Record<string, unknown>
): void => {
  // Skip debug logging in production unless explicitly enabled
  if (level === 'debug' && !isDebugEnabled()) return;

  const sanitizedMessage = sanitizeStringValue(message);
  const sanitizedData = data
    ? (sanitizeValue(data) as Record<string, unknown>)
    : undefined;

  logger[level](sanitizedMessage, sanitizedData);
};
