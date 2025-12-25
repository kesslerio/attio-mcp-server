/**
 * Error Enhancers - Centralized Exports
 * Issue #1001 - Strategy Pattern for CRUD error handling
 */

export { requiredFieldsEnhancer } from './required-fields-enhancer.js';
export { uniquenessEnhancer } from './uniqueness-enhancer.js';
export { attributeNotFoundEnhancer } from './attribute-enhancer.js';
export { selectStatusEnhancer } from './select-status-enhancer.js';
export { complexTypeEnhancer } from './complex-type-enhancer.js';
export { recordReferenceEnhancer } from './record-reference-enhancer.js';

export type {
  CrudErrorContext,
  ErrorEnhancer,
  ValidationMetadata,
} from './types.js';
