/**
 * Email format strategies for person creation
 * Implements Strategy Pattern to handle different email format retry scenarios
 */

import type { JsonObject } from '@shared-types/attio.js';
import {
  normalizeEmailsToObjectFormat,
  normalizeEmailsToStringFormat,
} from '../data-normalizers.js';

/**
 * Interface for email format strategies
 */
export interface EmailFormatStrategy {
  /**
   * Determines if this strategy can handle the given email array format
   */
  canHandle(emails: unknown[]): boolean;

  /**
   * Converts the email array to the alternative format for retry
   */
  convertToAlternativeFormat(emails: unknown[]): unknown[];

  /**
   * Gets a description of the original format for logging
   */
  getOriginalFormatDescription(emails: unknown[]): string;

  /**
   * Gets a description of the alternative format for logging
   */
  getAlternativeFormatDescription(convertedEmails: unknown[]): string;
}

/**
 * Strategy for handling string-based email arrays
 * Converts string[] to object[] format
 */
export class StringEmailStrategy implements EmailFormatStrategy {
  canHandle(emails: unknown[]): boolean {
    return (
      Array.isArray(emails) &&
      emails.length > 0 &&
      typeof emails[0] === 'string'
    );
  }

  convertToAlternativeFormat(emails: unknown[]): unknown[] {
    return normalizeEmailsToObjectFormat(emails);
  }

  getOriginalFormatDescription(emails: unknown[]): string {
    return emails.length > 0 ? typeof emails[0] : 'undefined';
  }

  getAlternativeFormatDescription(convertedEmails: unknown[]): string {
    return Array.isArray(convertedEmails) && convertedEmails.length > 0
      ? typeof convertedEmails[0]
      : 'undefined';
  }
}

/**
 * Strategy for handling object-based email arrays
 * Converts object[] to string[] format
 */
export class ObjectEmailStrategy implements EmailFormatStrategy {
  canHandle(emails: unknown[]): boolean {
    return (
      Array.isArray(emails) &&
      emails.length > 0 &&
      emails[0] != null &&
      typeof emails[0] === 'object' &&
      !Array.isArray(emails[0]) &&
      'email_address' in emails[0]
    );
  }

  convertToAlternativeFormat(emails: unknown[]): unknown[] {
    return normalizeEmailsToStringFormat(emails);
  }

  getOriginalFormatDescription(emails: unknown[]): string {
    return emails.length > 0 ? typeof emails[0] : 'undefined';
  }

  getAlternativeFormatDescription(convertedEmails: unknown[]): string {
    return Array.isArray(convertedEmails) && convertedEmails.length > 0
      ? typeof convertedEmails[0]
      : 'undefined';
  }
}

/**
 * Email retry manager that uses strategy pattern
 */
export class EmailRetryManager {
  private strategies: EmailFormatStrategy[] = [
    new StringEmailStrategy(),
    new ObjectEmailStrategy(),
  ];

  /**
   * Attempts to convert email format for retry
   * Returns null if no strategy can handle the format
   */
  public tryConvertEmailFormat(personData: JsonObject): {
    convertedData: JsonObject;
    originalFormat: string;
    alternativeFormat: string;
  } | null {
    const emails = personData.email_addresses as unknown[] | undefined;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return null;
    }

    // Find a strategy that can handle this email format
    const strategy = this.strategies.find((s) => s.canHandle(emails));
    if (!strategy) {
      return null;
    }

    // Convert the emails using the strategy
    try {
      const convertedEmails = strategy.convertToAlternativeFormat(emails);
      const convertedData: JsonObject = {
        ...personData,
        email_addresses: convertedEmails,
      };

      return {
        convertedData,
        originalFormat: strategy.getOriginalFormatDescription(emails),
        alternativeFormat:
          strategy.getAlternativeFormatDescription(convertedEmails),
      };
    } catch (error) {
      // Return null if conversion fails for any reason
      return null;
    }
  }
}
