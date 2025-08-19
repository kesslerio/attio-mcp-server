/**
 * Email validation utilities for the Attio MCP Server
 *
 * Provides RFC 5322 compliant email validation that is consistent
 * across the application. This replaces the inconsistent simple regex
 * patterns that were scattered throughout the codebase.
 */

/**
 * Validates an email address according to RFC 5322 with practical limitations
 *
 * This validation is more comprehensive than the previous simple regex and handles:
 * - International domains
 * - Plus addressing (user+tag@domain.com)
 * - Multiple subdomains
 * - TLDs from 2 to 63 characters
 * - Proper length limits per RFC 5321
 *
 * @param email - The email address to validate
 * @returns true if the email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Trim whitespace
  email = email.trim();

  // Check for reasonable length limits (RFC 5321)
  if (email.length === 0 || email.length > 254) {
    return false;
  }

  // More comprehensive email validation regex based on RFC 5322
  // This handles international domains, plus addressing, multiple subdomains, etc.
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Additional validation for edge cases
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;

  // Check local part length (before @) - RFC 5321 limit
  if (localPart.length === 0 || localPart.length > 64) {
    return false;
  }

  // Check for consecutive dots in local part (not allowed per RFC 5322)
  if (localPart.includes('..')) {
    return false;
  }

  // Local part cannot start or end with dot
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return false;
  }

  // Check domain has at least one dot
  if (!domain.includes('.')) {
    return false;
  }

  // Check domain parts
  const domainParts = domain.split('.');
  for (const part of domainParts) {
    // Each domain part should not be empty and should not exceed 63 characters
    if (part.length === 0 || part.length > 63) {
      return false;
    }
    // Domain parts should not start or end with hyphen
    if (part.startsWith('-') || part.endsWith('-')) {
      return false;
    }
  }

  return true;
}

/**
 * Validates an array of email addresses
 *
 * @param emails - Array of email addresses to validate
 * @returns An object with valid and invalid email arrays
 */
export function validateEmails(emails: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const email of emails) {
    if (isValidEmail(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  }

  return { valid, invalid };
}

/**
 * Normalizes an email address to lowercase
 * Note: Only the domain part should be normalized to lowercase per RFC.
 * The local part (before @) is case-sensitive per spec, but most
 * email providers treat it as case-insensitive.
 *
 * @param email - Email address to normalize
 * @returns Normalized email address or null if invalid
 */
export function normalizeEmail(email: string): string | null {
  if (!isValidEmail(email)) {
    return null;
  }

  // For practical purposes, convert entire email to lowercase
  // as most email providers treat the local part as case-insensitive
  return email.trim().toLowerCase();
}

/**
 * Extracts the domain from an email address
 *
 * @param email - Email address to extract domain from
 * @returns Domain part of the email or null if invalid
 */
export function extractEmailDomain(email: string): string | null {
  if (!isValidEmail(email)) {
    return null;
  }

  const parts = email.split('@');
  return parts[1].toLowerCase();
}
