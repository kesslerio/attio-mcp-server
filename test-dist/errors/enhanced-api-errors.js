/**
 * Enhanced API Error System for Consolidated Issues #415, #416, #417
 *
 * This module provides comprehensive error messaging with contextual information
 * to address:
 * - Issue #415: Poor error message quality and user experience
 * - Issue #416: Misleading "Invalid format" vs "Not found" confusion
 * - Issue #417: Task-specific error guidance and field mapping help
 */
import { AttioApiError } from './api-errors.js';
import { isValidUUID } from '../utils/validation/uuid-validation.js';
/**
 * Enhanced API Error class that provides contextual error messages
 *
 * This class extends the base AttioApiError with rich context information
 * to provide actionable error messages that guide users toward solutions.
 */
export class EnhancedApiError extends AttioApiError {
    context;
    constructor(message, statusCode, endpoint, method, context) {
        super(message, statusCode, endpoint, method);
        this.context = context;
        this.name = 'EnhancedApiError';
    }
    /**
     * Check if this is a user error (400-level)
     */
    isUserError() {
        return this.statusCode >= 400 && this.statusCode < 500;
    }
    /**
     * Get error category for classification
     */
    getErrorCategory() {
        if ([401, 403].includes(this.statusCode))
            return 'auth';
        if ([400, 404, 422].includes(this.statusCode))
            return 'user';
        if ([500, 502, 503, 504].includes(this.statusCode))
            return 'system';
        if ([429, 408].includes(this.statusCode))
            return 'network';
        return 'unknown';
    }
    /**
     * Generate a contextual error message with actionable guidance
     *
     * This method analyzes the error context and constructs helpful messages
     * that address the specific issues identified in the consolidated issues.
     */
    getContextualMessage() {
        let msg = this.message;
        // Issue #416: Handle "Not Found" vs "Invalid Format" confusion
        const notFoundMessage = this.getNotFoundErrorMessage();
        if (notFoundMessage) {
            return notFoundMessage;
        }
        // Apply various enhancements to the message
        msg += this.getTaskErrorMessage();
        msg += this.getFieldValidationMessage();
        msg += this.getFieldSuggestions();
        msg += this.getGeneralGuidanceMessage();
        return msg;
    }
    /**
     * Generate "Record not found" error message for Issue #416
     */
    getNotFoundErrorMessage() {
        if (this.context?.httpStatus === 404 && this.context?.recordId) {
            let msg = `Record not found: No ${this.context.resourceType} with ID '${this.context.recordId}' exists.`;
            if (this.context.documentationHint) {
                msg += ` ${this.context.documentationHint}`;
            }
            return msg;
        }
        return null;
    }
    /**
     * Generate field suggestions for typos
     */
    getFieldSuggestions() {
        if (this.context?.suggestedFields &&
            this.context.suggestedFields.length > 0) {
            return `\n\nDid you mean: ${this.context.suggestedFields.join(', ')}?`;
        }
        return '';
    }
    /**
     * Generate task-specific error guidance for Issue #417
     */
    getTaskErrorMessage() {
        if (this.context?.resourceType === 'tasks' && this.context?.field) {
            return this.getTaskSpecificGuidance();
        }
        return '';
    }
    /**
     * Generate field validation error messages for Issue #415
     */
    getFieldValidationMessage() {
        let msg = '';
        // Enhanced select field validation errors
        if (this.context?.validValues?.length) {
            msg += ` Valid options for '${this.context.field}' are: [${this.context.validValues.join(', ')}].`;
        }
        // Field name suggestions for typos
        if (this.context?.suggestedFields?.length) {
            msg += ` Did you mean: ${this.context.suggestedFields.join(', ')}?`;
        }
        // Read-only field guidance
        if (this.context?.isReadOnly && this.context?.field) {
            msg += ` Field '${this.context.field}' is read-only and cannot be modified. This is a system-managed field.`;
            if (this.context.resourceType) {
                msg += ` Use get-attributes ${this.context.resourceType} --categories writable to see updatable fields.`;
            }
        }
        return msg;
    }
    /**
     * Generate general guidance messages
     */
    getGeneralGuidanceMessage() {
        let msg = '';
        // General documentation hints (avoid duplicating for 404 errors)
        // Only skip if it's a 404 error (already handled in getNotFoundErrorMessage)
        if (this.context?.documentationHint && this.context.httpStatus !== 404) {
            msg += ` ${this.context.documentationHint}`;
        }
        // Retry guidance for temporary issues
        if (this.context?.retryable) {
            msg += ' This error may be temporary - please try again in a moment.';
        }
        return msg;
    }
    /**
     * Generate task-specific error guidance
     *
     * Addresses Issue #417 by providing clear guidance for task field mappings
     * and common task-related errors.
     */
    getTaskSpecificGuidance() {
        const field = this.context?.field;
        if (!field)
            return '';
        // Task field mapping guidance
        const taskFieldMappings = {
            title: ' For tasks, use "content" instead of "title" for the main task text.',
            name: ' For tasks, use "content" instead of "name" for the main task text.',
            description: ' For tasks, use "content" instead of "description" for the main task text.',
            assignee: ' For tasks, use "assignee_id" with a workspace member ID, not "assignee".',
            due: ' For tasks, use "due_date" with ISO date format (YYYY-MM-DD), not "due".',
            record: ' For tasks, use "record_id" to link to a specific record, not "record".',
        };
        const guidance = taskFieldMappings[field.toLowerCase()];
        if (guidance) {
            return guidance;
        }
        // General task guidance
        return ` For tasks, valid fields are: content, status, due_date, assignee_id, record_id. Check task API documentation for field requirements.`;
    }
    /**
     * Check if this error is likely retryable
     */
    isRetryable() {
        if (this.context?.retryable !== undefined) {
            return this.context.retryable;
        }
        // 429 (rate limit), 5xx errors are generally retryable
        const retryableStatuses = [429, 500, 502, 503, 504];
        return retryableStatuses.includes(this.statusCode);
    }
}
/**
 * Factory function to create enhanced API errors with proper context
 */
export function createEnhancedApiError(message, statusCode, endpoint, method, context) {
    return new EnhancedApiError(message, statusCode, endpoint, method, context);
}
/**
 * Enhanced error templates for common scenarios
 *
 * These templates provide consistent, helpful error messages across the application
 */
export const ErrorTemplates = {
    /**
     * Issue #415: Invalid select option template
     */
    INVALID_SELECT_OPTION: (field, value, validOptions, resourceType) => createEnhancedApiError(`Invalid value '${value}' for field '${field}'`, 400, resourceType ? `/objects/${resourceType}` : '/unknown', 'POST', {
        field,
        validValues: validOptions,
        resourceType,
        documentationHint: `Use get-attributes${resourceType ? ` ${resourceType}` : ''} to see all available values.`,
    }),
    /**
     * Issue #415: Read-only field template
     */
    READ_ONLY_FIELD: (field, resourceType) => createEnhancedApiError(`Field '${field}' cannot be modified`, 400, `/objects/${resourceType}`, 'POST', {
        field,
        resourceType,
        isReadOnly: true,
        documentationHint: `Use get-attributes ${resourceType} --categories writable to see updatable fields.`,
    }),
    /**
     * Issue #415: Unknown field template
     */
    UNKNOWN_FIELD: (field, suggestions, resourceType) => createEnhancedApiError(`Unknown field '${field}' for resource type '${resourceType}'`, 400, `/objects/${resourceType}`, 'POST', {
        field,
        suggestedFields: suggestions,
        resourceType,
        documentationHint: `Use get-attributes ${resourceType} to see all available fields with their correct names.`,
    }),
    /**
     * Issue #416: Record not found template (vs invalid format)
     */
    RECORD_NOT_FOUND: (recordId, resourceType) => createEnhancedApiError(`Record not found`, 404, `/objects/${resourceType}/${recordId}`, 'GET', {
        recordId,
        resourceType,
        httpStatus: 404,
        documentationHint: `Use search-records to find valid ${resourceType} IDs.`,
    }),
    /**
     * Issue #416: Invalid UUID format template (vs not found)
     */
    INVALID_UUID_FORMAT: (recordId, resourceType) => createEnhancedApiError(`Invalid record identifier format: '${recordId}'`, 400, `/objects/${resourceType}`, 'GET', {
        field: 'record_id',
        resourceType,
        documentationHint: `Expected UUID format (e.g., 'a1b2c3d4-e5f6-7890-abcd-ef1234567890').`,
    }),
    /**
     * Issue #417: Task field mapping template
     */
    TASK_FIELD_MAPPING: (originalField, correctField) => createEnhancedApiError(`Unknown field '${originalField}' for resource type 'tasks'`, 400, '/objects/tasks', 'POST', {
        field: originalField,
        suggestedFields: [correctField],
        resourceType: 'tasks',
        documentationHint: `For tasks, use "${correctField}" instead of "${originalField}". Valid task fields: content, status, due_date, assignee_id, record_id.`,
    }),
    /**
     * Generic enhanced error template
     */
    GENERIC: (message, statusCode, endpoint, method, context) => createEnhancedApiError(message, statusCode, endpoint, method, context),
};
/**
 * Error enhancement utilities
 */
export class ErrorEnhancer {
    /**
     * Enhance a standard API error with context
     */
    static enhance(error, context) {
        if (error instanceof EnhancedApiError) {
            return error; // Already enhanced
        }
        if (error instanceof AttioApiError) {
            return new EnhancedApiError(error.message, error.statusCode, error.endpoint, error.method, context);
        }
        // Generic error - make reasonable assumptions
        return new EnhancedApiError(error.message, 500, '/unknown', 'UNKNOWN', {
            originalError: error,
            ...context,
        });
    }
    /**
     * Issue #425: Safe error message extraction utility
     * Extracts a contextual message from any error type safely
     * Handles: EnhancedApiError, AttioApiError, UniversalValidationError, and generic errors
     */
    static getErrorMessage(error) {
        // If it's an EnhancedApiError, use getContextualMessage
        if (error instanceof EnhancedApiError) {
            return error.getContextualMessage();
        }
        // If it's an AttioApiError, UniversalValidationError, or has a message property, use that
        if (error &&
            typeof error === 'object' &&
            'message' in error &&
            typeof error.message === 'string') {
            return error.message;
        }
        // Fallback to string representation
        return String(error);
    }
    /**
     * Issue #425: Convert any error to EnhancedApiError
     * Ensures all errors are properly enhanced for consistent handling
     */
    static ensureEnhanced(error, defaultContext) {
        if (error instanceof EnhancedApiError) {
            return error;
        }
        // Handle AttioApiError from axios interceptor
        if (error instanceof AttioApiError) {
            return new EnhancedApiError(error.message, error.statusCode, error.endpoint, error.method, defaultContext);
        }
        // Handle generic errors with status codes
        const errorObj = error;
        const statusCode = errorObj?.statusCode || errorObj?.status || 500;
        const endpoint = errorObj?.endpoint || errorObj?.path || '/unknown';
        const method = errorObj?.method || 'UNKNOWN';
        return new EnhancedApiError(errorObj?.message || 'An error occurred', statusCode, endpoint, method, {
            originalError: error && typeof error === 'object' ? error : undefined,
            ...defaultContext,
        });
    }
    /**
     * Auto-detect error type and apply appropriate enhancement
     */
    static autoEnhance(error, resourceType, operation, recordId) {
        const message = error.message.toLowerCase();
        // Issue #416: Detect "not found" vs "invalid format" scenarios
        if (message.includes('not found') && recordId && isValidUUID(recordId)) {
            return ErrorTemplates.RECORD_NOT_FOUND(recordId, resourceType || 'unknown');
        }
        if ((message.includes('invalid') || message.includes('format')) &&
            recordId &&
            !isValidUUID(recordId)) {
            return ErrorTemplates.INVALID_UUID_FORMAT(recordId, resourceType || 'unknown');
        }
        // Issue #417: Detect task field mapping issues
        if (resourceType === 'tasks') {
            const taskFieldMatch = message.match(/unknown field['\s]*([^']*)/i);
            if (taskFieldMatch) {
                const field = taskFieldMatch[1].replace(/['"]/g, '').trim();
                const correctField = this.getTaskFieldMapping(field);
                if (correctField) {
                    return ErrorTemplates.TASK_FIELD_MAPPING(field, correctField);
                }
            }
        }
        // Issue #415: Detect invalid select options
        const selectMatch = message.match(/invalid value['\s]*([^']*)['\s]*for field['\s]*([^']*)/i);
        if (selectMatch) {
            const [, value, field] = selectMatch;
            return ErrorTemplates.INVALID_SELECT_OPTION(field, value, [], resourceType);
        }
        // Generic enhancement
        return this.enhance(error, { resourceType, operation, recordId });
    }
    /**
     * Get correct task field mapping
     */
    static getTaskFieldMapping(field) {
        const mappings = {
            title: 'content',
            name: 'content',
            description: 'content',
            assignee: 'assignee_id',
            due: 'due_date',
            record: 'record_id',
        };
        return mappings[field.toLowerCase()] || null;
    }
}
