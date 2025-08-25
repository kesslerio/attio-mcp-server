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
import { FilterConditionType, InteractionType, RelationshipType, ResourceType, } from '../../types/attio.js';
/**
 * Attribute constants for better code readability and consistency
 */
export const ATTRIBUTES = {
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
    LAST_INTERACTION: 'last_interaction',
    INTERACTION_TYPE: 'interaction_type',
    EMAIL: 'email',
    PHONE: 'phone',
    NAME: 'name',
    WEBSITE: 'website',
    INDUSTRY: 'industry',
    REVENUE: 'annual_revenue',
    EMPLOYEE_COUNT: 'employee_count',
    LIST_ID: 'list_id',
    NOTE_CONTENT: 'note_content',
    RELATIONSHIP: '$relationship',
};
/**
 * Error type for rate-limiting on relationship queries
 */
export class RelationshipRateLimitError extends Error {
    relationshipType;
    resetTime;
    msUntilReset;
    constructor(message, relationshipType, resetTime, msUntilReset) {
        super(message);
        this.relationshipType = relationshipType;
        this.resetTime = resetTime;
        this.msUntilReset = msUntilReset;
        this.name = 'RelationshipRateLimitError';
        // This line is needed to properly capture the stack trace
        Object.setPrototypeOf(this, RelationshipRateLimitError.prototype);
    }
}
/**
 * Special case field-operator mappings and handling flags
 */
export const FIELD_SPECIAL_HANDLING = {
    // Special handling for B2B Segment field (type_persona)
    type_persona: {
        in: 'contains_any',
        contains_any: 'contains_any',
        not_empty: 'not_empty',
        operators: ['in', 'contains_any', 'not_empty'],
        allowStringValue: true,
        disableDebugLogging: true,
    },
    // Other fields can be added here as needed
    segment: {
        in: 'contains_any',
        contains_any: 'contains_any',
        operators: ['in', 'contains_any'],
    },
};
/**
 * Valid interaction types for activity filtering
 */
export const VALID_INTERACTION_TYPES = new Set([
    InteractionType.EMAIL,
    InteractionType.CALENDAR,
    InteractionType.PHONE,
    InteractionType.MEETING,
    InteractionType.CUSTOM,
    InteractionType.ANY,
]);
/**
 * Export reusable filter-related types from dependencies
 */
export { FilterConditionType, InteractionType, RelationshipType, ResourceType, };
