/**
 * @module types
 *
 * Consolidated filter type definitions for Attio API
 * Central location for all filter-related interfaces, types, enums, and constants
 *
 * This module provides:
 * - Type definitions for filters and filter configurations
 * - Attribute constants for consistent field references
 * - Error types specific to filter operations
 * - Enums and interfaces from external dependencies
 */
import { FilterConditionType, DateRange, NumericRange, InteractionType, ActivityFilter, RelationshipType, ResourceType } from "../../types/attio.js";
import { ListEntryFilter, ListEntryFilters } from "../../api/attio-operations.js";
/**
 * Attribute constants for better code readability and consistency
 */
export declare const ATTRIBUTES: {
    CREATED_AT: string;
    UPDATED_AT: string;
    LAST_INTERACTION: string;
    INTERACTION_TYPE: string;
    EMAIL: string;
    PHONE: string;
    NAME: string;
    WEBSITE: string;
    INDUSTRY: string;
    REVENUE: string;
    EMPLOYEE_COUNT: string;
    LIST_ID: string;
    NOTE_CONTENT: string;
    RELATIONSHIP: string;
};
/**
 * Type for the Attio API filter object format
 * Represents the structure expected by Attio API endpoints
 */
export type AttioApiFilter = {
    [attributeSlug: string]: {
        [condition: string]: any;
    };
};
/**
 * Error type for rate-limiting on relationship queries
 */
export declare class RelationshipRateLimitError extends Error {
    readonly relationshipType: string;
    readonly resetTime: number;
    readonly msUntilReset: number;
    constructor(message: string, relationshipType: string, resetTime: number, msUntilReset: number);
}
/**
 * Configuration for a relationship-based filter
 */
export interface RelationshipFilterConfig {
    sourceType: ResourceType;
    targetType: ResourceType;
    relationshipType: RelationshipType;
    targetFilters: ListEntryFilters;
}
/**
 * Special case field-operator mappings and handling flags
 */
export declare const FIELD_SPECIAL_HANDLING: Record<string, any>;
/**
 * Valid interaction types for activity filtering
 */
export declare const VALID_INTERACTION_TYPES: Set<InteractionType>;
/**
 * Common filter operation types
 */
export type FilterOperation = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'greater_than_or_equals' | 'less_than_or_equals' | 'in' | 'not_in' | 'is_empty' | 'not_empty';
/**
 * Export reusable filter-related types from dependencies
 */
export { FilterConditionType, type DateRange, type NumericRange, InteractionType, type ActivityFilter, RelationshipType, ResourceType, type ListEntryFilter, type ListEntryFilters };
//# sourceMappingURL=types.d.ts.map