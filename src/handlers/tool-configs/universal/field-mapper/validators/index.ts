/**
 * Field validation modules - centralized exports
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

// Resource validation
export { validateResourceType } from './resource-validator.js';

// Field validation
export {
  getFieldSuggestions,
  validateFields,
  getValidFields,
} from './field-validator.js';

// Collision detection
export { detectFieldCollisions } from './collision-detector.js';

// Uniqueness validation
export { enhanceUniquenessError } from './uniqueness-validator.js';

// Category validation
export {
  validateCategories,
  processCategories,
  getValidCategories,
} from './category-validator.js';

// Domain validation
export { checkDomainConflict } from './domain-validator.js';

// Helper utilities
export {
  attrHas,
  RESOURCE_TYPE_MAPPINGS,
  getValidResourceTypes,
} from './helpers.js';

// String similarity utilities
export {
  findSimilarStrings,
  calculateSimilarity,
  levenshteinDistance,
} from './similarity-utils.js';
