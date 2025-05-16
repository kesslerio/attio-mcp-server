/**
 * Error for when a field value doesn't match any valid options
 * Includes suggestions for similar values
 */
import { AttioApiError } from './api-errors.js';
import { ValueMatchResult } from '../utils/value-matcher.js';
export declare class ValueMatchError extends AttioApiError {
    readonly fieldName: string;
    readonly searchValue: string;
    readonly suggestions: string[];
    readonly bestMatch?: string;
    readonly originalError?: Error;
    constructor(fieldName: string, searchValue: string, matchResult: ValueMatchResult, originalErrorParam?: Error);
}
//# sourceMappingURL=value-match-error.d.ts.map