/**
 * Domain-specific error classes for company operations
 */
/**
 * Base error class for company-related errors
 */
export declare class CompanyError extends Error {
    constructor(message: string);
}
/**
 * Error thrown when a company is not found
 */
export declare class CompanyNotFoundError extends CompanyError {
    constructor(companyId: string);
}
/**
 * Error thrown when company data is invalid
 */
export declare class InvalidCompanyDataError extends CompanyError {
    constructor(message: string);
}
/**
 * Error thrown when a company operation fails
 */
export declare class CompanyOperationError extends CompanyError {
    constructor(operation: string, companyId?: string, details?: string);
}
/**
 * Error thrown when a required company field is missing
 */
export declare class MissingCompanyFieldError extends InvalidCompanyDataError {
    constructor(fieldName: string);
}
/**
 * Error thrown when a company field has an invalid type
 */
export declare class InvalidCompanyFieldTypeError extends InvalidCompanyDataError {
    constructor(fieldName: string, expectedType: string, actualType: string);
}
//# sourceMappingURL=company-errors.d.ts.map