/**
 * ValidationService - Centralized validation utilities for universal handlers
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 2.
 * Provides parameter validation, UUID validation, field validation, and email validation.
 */
import { performance } from 'perf_hooks';
import { isValidEmail } from '../utils/validation/email-validation.js';
import { isValidId } from '../utils/validation.js';
import { isValidUUID, createInvalidUUIDError, } from '../utils/validation/uuid-validation.js';
import { enhancedPerformanceTracker } from '../middleware/performance-enhanced.js';
import { UniversalValidationError, ErrorType, } from '../handlers/tool-configs/universal/schemas.js';
import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import { validateFields, FIELD_MAPPINGS, } from '../handlers/tool-configs/universal/field-mapper.js';
/**
 * ValidationService provides centralized validation functionality for universal handlers
 */
export class ValidationService {
    /**
     * Create a standardized validation error object
     *
     * @param message - Error message
     * @param resourceType - Type of resource being validated (default: 'resource')
     * @returns Validation error object with timestamp
     */
    static createValidationError(message, resourceType = 'resource') {
        return {
            error: true,
            message,
            details: `${resourceType} validation failed`,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Validate limit parameter for pagination
     *
     * @param limit - Limit value to validate
     * @param perfId - Performance tracking ID for error reporting
     * @param maxLimit - Maximum allowed limit (default: 100)
     * @throws Error if validation fails
     */
    static validateLimitParameter(limit, perfId, maxLimit = 100) {
        if (limit !== undefined) {
            if (!Number.isInteger(limit) || limit <= 0) {
                if (perfId) {
                    enhancedPerformanceTracker.endOperation(perfId, false, 'Invalid limit parameter', 400);
                }
                throw new Error('limit must be a positive integer greater than 0');
            }
            if (limit > maxLimit) {
                if (perfId) {
                    enhancedPerformanceTracker.endOperation(perfId, false, 'Limit exceeds maximum', 400);
                }
                throw new Error(`limit must not exceed ${maxLimit}`);
            }
        }
    }
    /**
     * Validate offset parameter for pagination
     *
     * @param offset - Offset value to validate
     * @param perfId - Performance tracking ID for error reporting
     * @param maxOffset - Maximum allowed offset (default: 10000)
     * @throws Error if validation fails
     */
    static validateOffsetParameter(offset, perfId, maxOffset = 10000) {
        if (offset !== undefined) {
            if (!Number.isInteger(offset) || offset < 0) {
                if (perfId) {
                    enhancedPerformanceTracker.endOperation(perfId, false, 'Invalid offset parameter', 400);
                }
                throw new Error('offset must be a non-negative integer');
            }
            if (offset > maxOffset) {
                if (perfId) {
                    enhancedPerformanceTracker.endOperation(perfId, false, 'Offset exceeds maximum', 400);
                }
                throw new Error(`offset must not exceed ${maxOffset}`);
            }
        }
    }
    /**
     * Validate pagination parameters (limit and offset together)
     *
     * @param params - Object containing limit and offset
     * @param perfId - Performance tracking ID for error reporting
     * @param maxLimit - Maximum allowed limit (default: 100)
     * @param maxOffset - Maximum allowed offset (default: 10000)
     */
    static validatePaginationParameters(params, perfId, maxLimit = 100, maxOffset = 10000) {
        this.validateLimitParameter(params.limit, perfId, maxLimit);
        this.validateOffsetParameter(params.offset, perfId, maxOffset);
    }
    /**
     * Validate UUID format for record IDs
     *
     * @param recordId - Record ID to validate
     * @param resourceType - Type of resource
     * @param operation - Operation being performed (for error context)
     * @param perfId - Performance tracking ID for error reporting
     * @throws Error if UUID validation fails
     */
    static validateUUID(recordId, resourceType, operation = 'operation', perfId) {
        const validationStart = performance.now();
        // Skip UUID validation for tasks as they may use different ID formats
        if (resourceType !== UniversalResourceType.TASKS &&
            !isValidUUID(recordId)) {
            if (perfId) {
                enhancedPerformanceTracker.markTiming(perfId, 'validation', performance.now() - validationStart);
                enhancedPerformanceTracker.endOperation(perfId, false, 'Invalid UUID format', 400);
            }
            throw createInvalidUUIDError(recordId, resourceType, operation);
        }
        if (perfId) {
            enhancedPerformanceTracker.markTiming(perfId, 'validation', performance.now() - validationStart);
        }
    }
    /**
     * Truncate suggestions to prevent buffer overflow in MCP protocol
     *
     * @param suggestions - Array of suggestion strings
     * @param maxCount - Maximum number of suggestions to return (default: 3)
     * @returns Truncated suggestions array
     */
    static truncateSuggestions(suggestions, maxCount = 3) {
        const limited = suggestions.slice(0, maxCount);
        if (suggestions.length > maxCount) {
            limited.push(`... and ${suggestions.length - maxCount} more suggestions`);
        }
        return limited;
    }
    /**
     * Validate fields for a resource and build comprehensive error messages
     *
     * @param resourceType - Type of resource being validated
     * @param recordData - Record data to validate
     * @param throwOnInvalid - Whether to throw error on validation failure (default: true)
     * @returns Validation result with formatted error message if invalid
     */
    static validateFieldsWithErrorHandling(resourceType, recordData, throwOnInvalid = true) {
        const fieldValidation = validateFields(resourceType, recordData);
        if (fieldValidation.warnings.length > 0) {
            console.error('Field validation warnings:', fieldValidation.warnings.join('\n'));
        }
        if (fieldValidation.suggestions.length > 0) {
            const truncated = this.truncateSuggestions(fieldValidation.suggestions);
            console.error('Field suggestions:', truncated.join('\n'));
        }
        if (!fieldValidation.valid) {
            // Build a clear, helpful error message
            let errorMessage = `Field validation failed for ${resourceType}:\n`;
            // Add each error on its own line for clarity
            if (fieldValidation.errors.length > 0) {
                errorMessage += fieldValidation.errors
                    .map((err) => `  ❌ ${err}`)
                    .join('\n');
            }
            // Add suggestions if available (truncated to prevent buffer overflow)
            if (fieldValidation.suggestions.length > 0) {
                const truncated = this.truncateSuggestions(fieldValidation.suggestions);
                errorMessage += '\n\n💡 Suggestions:\n';
                errorMessage += truncated.map((sug) => `  • ${sug}`).join('\n');
            }
            // List available fields for this resource type
            const mapping = FIELD_MAPPINGS[resourceType];
            if (mapping && mapping.validFields.length > 0) {
                errorMessage += `\n\n📋 Available fields for ${resourceType}:\n  ${mapping.validFields.join(', ')}`;
            }
            if (throwOnInvalid) {
                throw new UniversalValidationError(errorMessage, ErrorType.USER_ERROR, {
                    suggestion: this.truncateSuggestions(fieldValidation.suggestions).join('. '),
                    field: 'record_data',
                });
            }
            return { valid: false, errorMessage };
        }
        return { valid: true };
    }
    /**
     * Validate email addresses in record data for consistent validation across create/update
     *
     * @param recordData - Record data containing potential email fields
     * @throws UniversalValidationError if email validation fails
     */
    static validateEmailAddresses(recordData) {
        if (!recordData || typeof recordData !== 'object')
            return;
        // Handle various email field formats
        const emailFields = ['email_addresses', 'email', 'emails', 'emailAddress'];
        for (const field of emailFields) {
            if (field in recordData && recordData[field]) {
                const emails = Array.isArray(recordData[field])
                    ? recordData[field]
                    : [recordData[field]];
                for (const emailItem of emails) {
                    let emailAddress;
                    // Handle different email formats
                    if (typeof emailItem === 'string') {
                        emailAddress = emailItem;
                    }
                    else if (typeof emailItem === 'object' &&
                        emailItem &&
                        'email_address' in emailItem) {
                        const emailValue = emailItem
                            .email_address;
                        if (typeof emailValue === 'string') {
                            emailAddress = emailValue;
                        }
                        else {
                            throw new UniversalValidationError(`Invalid email format: email_address must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`, ErrorType.USER_ERROR, {
                                field: field,
                                suggestion: 'Ensure email_address field contains a string value',
                            });
                        }
                    }
                    else if (typeof emailItem === 'object' &&
                        emailItem &&
                        'email' in emailItem) {
                        const emailValue = emailItem.email;
                        if (typeof emailValue === 'string') {
                            emailAddress = emailValue;
                        }
                        else {
                            throw new UniversalValidationError(`Invalid email format: email must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`, ErrorType.USER_ERROR, {
                                field: field,
                                suggestion: 'Ensure email field contains a string value',
                            });
                        }
                    }
                    else if (typeof emailItem === 'object' &&
                        emailItem &&
                        'value' in emailItem) {
                        const emailValue = emailItem.value;
                        if (typeof emailValue === 'string') {
                            emailAddress = emailValue;
                        }
                        else {
                            throw new UniversalValidationError(`Invalid email format: value must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`, ErrorType.USER_ERROR, {
                                field: field,
                                suggestion: 'Ensure value field contains a string value',
                            });
                        }
                    }
                    else {
                        continue; // Skip invalid email formats
                    }
                    // Validate email format using the same function as PersonValidator
                    if (!isValidEmail(emailAddress)) {
                        throw new UniversalValidationError(`Invalid email format: "${emailAddress}". Please provide a valid email address (e.g., user@example.com)`, ErrorType.USER_ERROR, {
                            field: field,
                            suggestion: 'Ensure email addresses are in the format: user@domain.com',
                        });
                    }
                }
            }
        }
    }
    /**
     * Validate record ID using the appropriate validation method
     *
     * @param recordId - Record ID to validate
     * @param allowGeneric - Whether to allow generic ID validation (default: true)
     * @returns True if valid, false otherwise
     */
    static isValidRecordId(recordId, allowGeneric = true) {
        // Try UUID validation first
        if (isValidUUID(recordId)) {
            return true;
        }
        // Fall back to generic ID validation if allowed
        if (allowGeneric && isValidId(recordId)) {
            return true;
        }
        return false;
    }
    /**
     * Validate UUID for search operations with lenient validation
     * Returns false for invalid UUIDs instead of throwing (used for filters)
     *
     * @param uuid - UUID string to validate
     * @returns True if valid UUID, false otherwise
     */
    static validateUUIDForSearch(uuid) {
        try {
            return isValidUUID(uuid);
        }
        catch {
            return false;
        }
    }
    /**
     * Validate filter schema for search operations
     *
     * @param filters - Filter object to validate
     * @throws UniversalValidationError for malformed filter schemas
     */
    static validateFiltersSchema(filters) {
        if (filters == null)
            return;
        if (typeof filters !== 'object') {
            throw new UniversalValidationError('filters must be an object', ErrorType.USER_ERROR, { field: 'filters' });
        }
        const filtersObj = filters;
        if ('advanced' in filtersObj) {
            if (!Array.isArray(filtersObj.advanced)) {
                throw new UniversalValidationError('filters.advanced must be an array', ErrorType.USER_ERROR, { field: 'filters.advanced' });
            }
            filtersObj.advanced.forEach((filter, index) => {
                if (!filter || typeof filter !== 'object') {
                    throw new UniversalValidationError(`advanced[${index}] must be an object`, ErrorType.USER_ERROR, { field: `filters.advanced[${index}]` });
                }
                const filterObj = filter;
                if (!filterObj.op || !filterObj.field) {
                    throw new UniversalValidationError(`advanced[${index}] missing "op" or "field"`, ErrorType.USER_ERROR, {
                        field: `filters.advanced[${index}]`,
                        suggestion: 'Include both "op" and "field" properties',
                    });
                }
            });
        }
    }
    /**
     * Comprehensive validation for universal operations
     *
     * @param params - Validation parameters
     * @returns Validation result
     */
    static validateUniversalOperation(params) {
        const errors = [];
        try {
            // Validate pagination parameters if provided
            if (params.limit !== undefined || params.offset !== undefined) {
                this.validatePaginationParameters({ limit: params.limit, offset: params.offset }, params.perfId);
            }
            // Validate UUID if record ID is provided
            if (params.recordId) {
                this.validateUUID(params.recordId, params.resourceType, params.operation || 'operation', params.perfId);
            }
            // Validate fields if record data is provided
            if (params.recordData) {
                const fieldValidation = this.validateFieldsWithErrorHandling(params.resourceType, params.recordData, false // Don't throw, collect errors
                );
                if (!fieldValidation.valid && fieldValidation.errorMessage) {
                    errors.push(fieldValidation.errorMessage);
                }
                // Validate email addresses if present
                this.validateEmailAddresses(params.recordData);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                errors.push(error.message);
            }
            else {
                errors.push(String(error));
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
