/**
 * Enhance an API error with value suggestions if applicable
 */
export declare function enhanceApiError(error: any): Error;
/**
 * Check if an error is a value mismatch that we can enhance
 */
export declare function isValueMismatchError(error: any): {
    isMismatch: boolean;
    fieldSlug?: string;
    searchValue?: string;
    errorMessage?: string;
};
/**
 * Get valid values for a field (if known)
 */
export declare function getKnownFieldValues(fieldSlug: string): string[] | null;
/**
 * Add or update known field values
 * This could be populated from Attio API discovery
 */
export declare function updateKnownFieldValues(fieldSlug: string, values: string[]): void;
//# sourceMappingURL=error-enhancer.d.ts.map