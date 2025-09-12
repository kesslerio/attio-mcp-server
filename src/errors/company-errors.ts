/**
 * Domain-specific error classes for company operations
 */

import { BaseWrappedError } from './BaseWrappedError.js';

/**
 * Base error class for company-related errors
 */
export class CompanyError extends BaseWrappedError {
  constructor(message: string, opts?: { cause?: unknown }) {
    super('CompanyError', message, opts);
  }
}

/**
 * Error thrown when a company is not found
 */
export class CompanyNotFoundError extends CompanyError {
  constructor(companyId: string, opts?: { cause?: unknown }) {
    super(`Company with ID ${companyId} not found`, opts);
    this.name = 'CompanyNotFoundError';
  }
}

/**
 * Error thrown when company data is invalid
 */
export class InvalidCompanyDataError extends CompanyError {
  constructor(message: string, opts?: { cause?: unknown }) {
    super(`Invalid company data: ${message}`, opts);
    this.name = 'InvalidCompanyDataError';
  }
}

/**
 * Error thrown when a company operation fails
 */
export class CompanyOperationError extends CompanyError {
  constructor(
    operation: string,
    companyId?: string,
    details?: string,
    opts?: { cause?: unknown }
  ) {
    const baseMessage = `Company ${operation} failed`;
    const fullMessage = companyId
      ? `${baseMessage} for company ${companyId}${
          details ? `: ${details}` : ''
        }`
      : `${baseMessage}${details ? `: ${details}` : ''}`;
    super(fullMessage, opts);
    this.name = 'CompanyOperationError';
  }
}

/**
 * Error thrown when a required company field is missing
 */
export class MissingCompanyFieldError extends InvalidCompanyDataError {
  constructor(fieldName: string, opts?: { cause?: unknown }) {
    super(`Required field '${fieldName}' is missing`, opts);
    this.name = 'MissingCompanyFieldError';
  }
}

/**
 * Error thrown when a company field has an invalid type
 */
export class InvalidCompanyFieldTypeError extends InvalidCompanyDataError {
  constructor(
    fieldName: string,
    expectedType: string,
    actualType: string,
    opts?: { cause?: unknown }
  ) {
    super(
      `Field '${fieldName}' must be of type ${expectedType}, but got ${actualType}`,
      opts
    );
    this.name = 'InvalidCompanyFieldTypeError';
  }
}
