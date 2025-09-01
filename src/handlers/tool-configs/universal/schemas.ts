// Aggregator module for universal schemas and validators (SRP refactor)
// Keeps backward-compatible exports at './schemas.js'

export { ErrorType, HttpStatusCode, UniversalValidationError } from './errors/validation-errors.js';
export type { SanitizedValue, SanitizedObject } from './schemas/common/types.js';
export { InputSanitizer, validateUniversalToolParams } from './validators/schema-validator.js';
export { CrossResourceValidator } from './validators/cross-resource-validator.js';

// Core CRUD schemas
export {
  searchRecordsSchema,
  getRecordDetailsSchema,
  createRecordSchema,
  updateRecordSchema,
  deleteRecordSchema,
} from './schemas/core-schemas.js';

// Validation-related schemas (attributes)
export { getAttributesSchema, discoverAttributesSchema } from './schemas/validation-schemas.js';

// Advanced and batch schemas
export {
  getDetailedInfoSchema,
  advancedSearchSchema,
  searchByRelationshipSchema,
  searchByContentSchema,
  searchByTimeframeSchema,
  batchOperationsSchema,
} from './schemas/advanced-schemas.js';

// Notes and utility schemas
export {
  createNoteSchema,
  getNotesSchema,
  updateNoteSchema,
  searchNotesSchema,
  deleteNoteSchema,
  listNotesSchema,
} from './schemas/utility-schemas.js';
