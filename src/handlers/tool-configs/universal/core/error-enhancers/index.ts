/**
 * Error Enhancers Index
 *
 * Exports all error enhancers and defines the enhancer pipelines
 * for different CRUD operations.
 */

export { attributeNotFoundEnhancer } from './attribute-enhancer.js';
export { uniquenessEnhancer } from './uniqueness-enhancer.js';
export { selectStatusEnhancer } from './select-status-enhancer.js';
export { complexTypeEnhancer } from './complex-type-enhancer.js';
export { recordReferenceEnhancer } from './record-reference-enhancer.js';
export { requiredFieldsEnhancer } from './required-fields-enhancer.js';

export type { ErrorEnhancer, CrudErrorContext } from './types.js';

import type { ErrorEnhancer } from './types.js';
import { attributeNotFoundEnhancer } from './attribute-enhancer.js';
import { complexTypeEnhancer } from './complex-type-enhancer.js';
import { recordReferenceEnhancer } from './record-reference-enhancer.js';
import { requiredFieldsEnhancer } from './required-fields-enhancer.js';
import { selectStatusEnhancer } from './select-status-enhancer.js';
import { uniquenessEnhancer } from './uniqueness-enhancer.js';

/**
 * Error enhancer pipeline for CREATE operations
 * Order matters: more specific enhancers should come first
 */
export const CREATE_ERROR_ENHANCERS: ErrorEnhancer[] = [
  requiredFieldsEnhancer,
  uniquenessEnhancer,
  attributeNotFoundEnhancer,
  complexTypeEnhancer,
  selectStatusEnhancer,
  recordReferenceEnhancer,
];

/**
 * Error enhancer pipeline for UPDATE operations
 * Order matters: more specific enhancers should come first
 */
export const UPDATE_ERROR_ENHANCERS: ErrorEnhancer[] = [
  attributeNotFoundEnhancer,
  complexTypeEnhancer,
  selectStatusEnhancer,
  recordReferenceEnhancer,
];
