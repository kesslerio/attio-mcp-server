/**
 * Central export point for all filter-related functionality
 * Maintains backward compatibility while providing organized module structure
 */

// Export all types
export * from './types.js';

// Export all validators
export * from './validators.js';

// Export all builders
export * from './builders.js';

// Export all translators
export * from './translators.js';

// Export all operators
export * from './operators.js';

// Export all utilities
export * from './utils.js';

// Export cache utilities
export * from './cache.js';

// Export relationship utilities
export * from './relationship.js';

// Re-export namespaced Basic utilities for backward compatibility
import { transformFiltersToApiFormat, transformFiltersToQueryApiFormat } from './translators.js';
import { validateFilterStructure } from './validators.js';
import {
  createEqualsFilter,
  createContainsFilter,
  combineWithAnd,
  combineWithOr,
} from './builders.js';

export const Basic = {
  validateFilterStructure,
  transformFiltersToApiFormat,
  createEqualsFilter,
  createContainsFilter,
  combineWithAnd,
  combineWithOr,
};

// Re-export namespaced Range utilities for backward compatibility
import {
  createDateRangeFilter,
  createCreatedDateFilter,
  createModifiedDateFilter,
  createNumericFilter,
  createRevenueFilter,
  createEmployeeCountFilter,
} from './builders.js';

export const Range = {
  createDateRangeFilter,
  createCreatedDateFilter,
  createModifiedDateFilter,
  createNumericFilter,
  createRevenueFilter,
  createEmployeeCountFilter,
};

// Re-export namespaced Activity utilities for backward compatibility
import {
  createActivityFilter,
  createLastInteractionFilter,
} from './builders.js';

export const Activity = {
  createActivityFilter,
  createLastInteractionFilter,
};

// Re-export namespaced Relationship utilities for backward compatibility
import {
  applyRateLimit,
  createPeopleByCompanyFilter,
  createCompaniesByPeopleFilter,
  createRecordsByListFilter,
  createPeopleByCompanyListFilter,
  createCompaniesByPeopleListFilter,
  createRecordsByNotesFilter,
} from './relationship.js';

export const Relationship = {
  applyRateLimit,
  createPeopleByCompanyFilter,
  createCompaniesByPeopleFilter,
  createRecordsByListFilter,
  createPeopleByCompanyListFilter,
  createCompaniesByPeopleListFilter,
  createRecordsByNotesFilter,
};

// Legacy exports for backward compatibility
import { combineFiltersWithAnd, combineFiltersWithOr } from './builders.js';

// New Query API imports
import {
  createQueryApiFilter,
  createPathConstraint,
  createRelationshipQuery,
  createTimeframeQuery,
  createContentSearchQuery,
  createDateRangeQuery,
  combineQueryFiltersWithAnd,
  combineQueryFiltersWithOr,
} from './builders.js';

export {
  transformFiltersToApiFormat,
  transformFiltersToQueryApiFormat,
  createEqualsFilter,
  createContainsFilter,
  combineFiltersWithAnd,
  combineFiltersWithOr,
  createDateRangeFilter,
  createCreatedDateFilter,
  createModifiedDateFilter,
  createNumericFilter,
  createRevenueFilter,
  createEmployeeCountFilter,
  createLastInteractionFilter,
  createActivityFilter,
  // Relationship filters
  createPeopleByCompanyFilter,
  createCompaniesByPeopleFilter,
  createRecordsByListFilter,
  createPeopleByCompanyListFilter,
  createCompaniesByPeopleListFilter,
  createRecordsByNotesFilter,
  // New Query API functions
  createQueryApiFilter,
  createPathConstraint,
  createRelationshipQuery,
  createTimeframeQuery,
  createContentSearchQuery,
  createDateRangeQuery,
  combineQueryFiltersWithAnd,
  combineQueryFiltersWithOr,
};

// Re-export ATTRIBUTES as FILTER_ATTRIBUTES for backward compatibility
export { ATTRIBUTES as FILTER_ATTRIBUTES } from './types.js';
