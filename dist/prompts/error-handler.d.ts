/**
 * Error handling utilities for the prompts module
 */
import { ErrorType } from '../utils/error-handler.js';
interface PromptErrorResponse {
    error: {
        code: string | number;
        message: string;
        type: ErrorType;
        details?: any;
    };
    content: Array<{
        type: string;
        text: string;
    }>;
    isError: boolean;
}
/**
 * Creates a standardized error response for prompt-related errors
 *
 * @param error - The error object
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @returns Formatted error result
 */
export declare function createErrorResult(error: Error, message: string, statusCode: number): PromptErrorResponse;
export {};
//# sourceMappingURL=error-handler.d.ts.map