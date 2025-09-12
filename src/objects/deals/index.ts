/**
 * Deal module - Central export point
 * Re-exports all deal-related functionality from modular files
 */

// Note operations
export { getDealNotes, createDealNote } from './notes.js';

// Relationship-based queries
export { searchDealsByCompany } from './relationships.js';

// Export attribute operations and field validation
export {
  isStandardDealField,
  getStandardDealFields,
  isCustomDealField,
  getDealFields,
  getDealBasicInfo,
  getDealSalesInfo,
  getDealRelationshipInfo,
  getDealMetadataInfo,
  validateAndCategorizeDealFields,
  getDealWithFieldAnalysis,
} from './attributes.js';
