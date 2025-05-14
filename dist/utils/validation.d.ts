/**
 * Validation utility for validating input data against schemas
 */
import { ErrorType } from './error-handler.js';
/**
 * Result of a validation operation
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
/**
 * Schema definition for validation
 */
export interface ValidationSchema {
    type: string;
    required?: string[];
    properties?: Record<string, any>;
    items?: ValidationSchema;
    enum?: any[];
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    pattern?: string;
}
/**
 * Validates input data against a schema and returns the validation result
 *
 * @param input - Input data to validate
 * @param schema - Schema to validate against
 * @returns Validation result
 */
export declare function validateInput(input: any, schema: ValidationSchema): ValidationResult;
/**
 * Validates request parameters against a schema and returns a formatted error response if invalid
 *
 * @param input - Input data to validate
 * @param schema - Schema to validate against
 * @param errorFormatter - Function to format error response
 * @returns Error response if invalid, null if valid
 */
export declare function validateRequest(input: any, schema: ValidationSchema, errorFormatter: (error: Error, type: ErrorType, details: any) => any): any | null;
//# sourceMappingURL=validation.d.ts.map