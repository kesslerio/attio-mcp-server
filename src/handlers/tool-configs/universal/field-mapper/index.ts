/**
 * Field mapping orchestration layer with backward compatibility
 *
 * This module maintains the exact same public API as the original field-mapper.ts
 * file while delegating to the new modular architecture.
 *
 * Extracted during Issue #529 modular refactoring following Strangler Fig pattern.
 */

// Re-export types for backward compatibility
export type { FieldMapping } from './types.js';

// Re-export the main FIELD_MAPPINGS constant (now RESOURCE_TYPE_MAPPINGS)
export { RESOURCE_TYPE_MAPPINGS as FIELD_MAPPINGS } from './constants/index.js';

// Core transformation functions
export {
  mapFieldName,
  mapRecordFields,
  transformFieldValue,
  mapTaskFields,
} from './transformers/index.js';

// Validation functions
export {
  validateResourceType,
  validateFields,
  getFieldSuggestions,
  enhanceUniquenessError,
  detectFieldCollisions,
  validateCategories,
  processCategories,
  checkDomainConflict,
} from './validators/index.js';

// Utility functions
export {
  getValidResourceTypes,
  getValidFields,
  getValidCategories,
} from './validators/index.js';

// Configuration
export { strictModeFor } from './config.js';
