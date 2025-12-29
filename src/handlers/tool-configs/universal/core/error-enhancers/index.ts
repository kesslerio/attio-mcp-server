/**
 * Error Enhancers - Centralized Exports & Pipelines
 * Issue #1001 - Strategy Pattern for CRUD error handling
 */

import { requiredFieldsEnhancer } from './required-fields-enhancer.js';
import { uniquenessEnhancer } from './uniqueness-enhancer.js';
import { attributeNotFoundEnhancer } from './attribute-enhancer.js';
import { selectStatusEnhancer } from './select-status-enhancer.js';
import { complexTypeEnhancer } from './complex-type-enhancer.js';
import { recordReferenceEnhancer } from './record-reference-enhancer.js';

/**
 * Enhancer pipeline for CREATE operations
 * Order matters: more specific errors before generic ones
 */
export const CREATE_ERROR_ENHANCERS = [
  requiredFieldsEnhancer,
  uniquenessEnhancer,
  attributeNotFoundEnhancer,
  complexTypeEnhancer,
  selectStatusEnhancer,
  recordReferenceEnhancer,
] as const;

/**
 * Enhancer pipeline for UPDATE operations
 * Note: Required fields and uniqueness checks not needed for updates
 */
export const UPDATE_ERROR_ENHANCERS = [
  attributeNotFoundEnhancer,
  complexTypeEnhancer,
  selectStatusEnhancer,
  recordReferenceEnhancer,
] as const;

export {
  requiredFieldsEnhancer,
  uniquenessEnhancer,
  attributeNotFoundEnhancer,
  selectStatusEnhancer,
  complexTypeEnhancer,
  recordReferenceEnhancer,
};

export type {
  CrudErrorContext,
  ErrorEnhancer,
  ValidationMetadata,
  AxiosError,
  AxiosErrorResponse,
} from './types.js';

export { isAxiosError } from './types.js';
