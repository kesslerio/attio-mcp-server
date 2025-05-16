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
/**
 * Validates that an ID string is valid and secure to use
 *
 * @param id - The ID to validate
 * @returns True if the ID is valid, false otherwise
 */
export declare function isValidId(id: string): boolean;
/**
 * Validates that a list ID is valid and safe to use
 * Contains additional validation specific to Attio list IDs
 *
 * @param listId - The list ID to validate
 * @returns True if the list ID is valid, false otherwise
 */
export declare function isValidListId(listId: string): boolean;
//# sourceMappingURL=validation.d.ts.map