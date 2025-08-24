/**
 * Type-safe error handling utilities
 * Created as part of TypeScript 'any' reduction initiative (Issue #502)
 */
/**
 * Type guard to check if an object has a response property with status
 */
export function hasResponseStatus(error) {
    return (isObject(error) &&
        hasProperty(error, 'response') &&
        isObject(error.response) &&
        hasProperty(error.response, 'status') &&
        typeof error.response.status === 'number');
}
/**
 * Type guard for standard API error structure
 */
export function isApiError(error) {
    return (isObject(error) &&
        hasProperty(error, 'message') &&
        typeof error.message === 'string');
}
/**
 * Type guard for Attio-specific API errors
 */
export function isAttioApiError(error) {
    return isApiError(error);
}
/**
 * Extract error details safely
 */
export function extractErrorDetails(error) {
    if (isAttioApiError(error)) {
        return {
            message: error.response?.data?.message || error.message || 'Unknown error',
            status: error.response?.status,
            code: error.code,
            details: error.response?.data?.details,
        };
    }
    if (error instanceof Error) {
        return { message: error.message };
    }
    if (typeof error === 'string') {
        return { message: error };
    }
    return { message: 'Unknown error' };
}
/**
 * Safely get a property from an unknown value
 */
export function safeGet(obj, path, defaultValue) {
    if (!isObject(obj)) {
        return defaultValue;
    }
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (!isObject(current) || !hasProperty(current, key)) {
            return defaultValue;
        }
        current = current[key];
    }
    return current;
}
/**
 * Type guard to check if a value is an object
 */
export function isObject(value) {
    return value !== null && typeof value === 'object';
}
/**
 * Type guard to check if an object has a property
 */
export function hasProperty(obj, key) {
    return isObject(obj) && key in obj;
}
/**
 * Safe property access with type assertion
 */
export function getProperty(obj, key, validator) {
    if (!isObject(obj) || !(key in obj)) {
        return undefined;
    }
    const value = obj[key];
    if (validator) {
        return validator(value) ? value : undefined;
    }
    return value;
}
