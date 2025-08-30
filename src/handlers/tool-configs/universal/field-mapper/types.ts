/**
 * Shared types and interfaces for field-mapper modules
 * Extracted during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';

// Re-export UniversalResourceType for module-internal use
export { UniversalResourceType };

/**
 * Field mapping configuration for each resource type
 */
export interface FieldMapping {
  /** Maps incorrect field names to correct ones (null means invalid field) */
  fieldMappings: Record<string, string | null>;
  /** List of valid fields for this resource type */
  validFields: string[];
  /** Common mistakes and their explanations */
  commonMistakes: Record<string, string>;
  /** Required fields for creation */
  requiredFields?: string[];
  /** Fields that must be unique */
  uniqueFields?: string[];
}

/**
 * Result of field mapping operation
 */
export interface MappingResult {
  /** The mapped record data */
  mapped: Record<string, unknown>;
  /** Warnings about mappings that were applied */
  warnings: string[];
  /** Errors that occurred during mapping */
  errors?: string[];
}

/**
 * Result of field collision detection
 */
export interface CollisionResult {
  /** Whether collisions were detected */
  hasCollisions: boolean;
  /** Array of error messages */
  errors: string[];
  /** Map of target fields to arrays of input fields that collide */
  collisions: Record<string, string[]>;
}

/**
 * Result of resource type validation
 */
export interface ResourceValidationResult {
  /** Whether the resource type is valid */
  valid: boolean;
  /** Corrected resource type if invalid but mappable */
  corrected?: UniversalResourceType;
  /** Suggestion message for invalid types */
  suggestion?: string;
}

/**
 * Result of field validation
 */
export interface FieldValidationResult {
  /** Whether all fields are valid */
  valid: boolean;
  /** Array of validation errors */
  errors: string[];
  /** Array of validation warnings */
  warnings: string[];
  /** Array of suggestions for invalid fields */
  suggestions: string[];
}

/**
 * Result of category validation
 */
export interface CategoryValidationResult {
  /** Whether the categories are valid */
  isValid: boolean;
  /** Array of validation errors */
  errors: string[];
  /** Array of processed/corrected categories */
  categories?: string[];
}

/**
 * Result of domain conflict check
 */
export interface DomainConflictResult {
  /** Whether a conflict exists */
  exists: boolean;
  /** Information about existing company if conflict found */
  existingCompany?: {
    name: string;
    id: string;
  };
}

/**
 * Category object structure used in processing
 */
export interface CategoryObject {
  name: string;
  id?: string;
  [key: string]: unknown;
}

/**
 * Options for field transformation
 */
export interface TransformOptions {
  /** Skip domain preflight checks */
  skipDomainPreflight?: boolean;
  /** Additional context for transformation */
  context?: Record<string, unknown>;
}
