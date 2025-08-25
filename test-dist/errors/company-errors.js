/**
 * Domain-specific error classes for company operations
 */
/**
 * Base error class for company-related errors
 */
export class CompanyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CompanyError';
    }
}
/**
 * Error thrown when a company is not found
 */
export class CompanyNotFoundError extends CompanyError {
    constructor(companyId) {
        super(`Company with ID ${companyId} not found`);
        this.name = 'CompanyNotFoundError';
    }
}
/**
 * Error thrown when company data is invalid
 */
export class InvalidCompanyDataError extends CompanyError {
    constructor(message) {
        super(`Invalid company data: ${message}`);
        this.name = 'InvalidCompanyDataError';
    }
}
/**
 * Error thrown when a company operation fails
 */
export class CompanyOperationError extends CompanyError {
    constructor(operation, companyId, details) {
        const baseMessage = `Company ${operation} failed`;
        const fullMessage = companyId
            ? `${baseMessage} for company ${companyId}${details ? `: ${details}` : ''}`
            : `${baseMessage}${details ? `: ${details}` : ''}`;
        super(fullMessage);
        this.name = 'CompanyOperationError';
    }
}
/**
 * Error thrown when a required company field is missing
 */
export class MissingCompanyFieldError extends InvalidCompanyDataError {
    constructor(fieldName) {
        super(`Required field '${fieldName}' is missing`);
        this.name = 'MissingCompanyFieldError';
    }
}
/**
 * Error thrown when a company field has an invalid type
 */
export class InvalidCompanyFieldTypeError extends InvalidCompanyDataError {
    constructor(fieldName, expectedType, actualType) {
        super(`Field '${fieldName}' must be of type ${expectedType}, but got ${actualType}`);
        this.name = 'InvalidCompanyFieldTypeError';
    }
}
