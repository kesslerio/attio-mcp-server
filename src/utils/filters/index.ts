/**
 * Central export point for all filter-related functionality
 * Maintains backward compatibility while providing organized module structure
 */

// Export all builders
export * from './builders.js';
// Export cache utilities
export * from './cache.js';
// Export all operators
export * from './operators.js';
// Export relationship utilities
export * from './relationship.js';
// Export all translators
export * from './translators.js';
// Export all types
export * from './types.js';
// Export all utilities
export * from './utils.js';
// Export all validators
export * from './validators.js';

import {
  combineWithAnd,
  combineWithOr,
  createContainsFilter,
  createEqualsFilter,
} from './builders.js';
// Re-export namespaced Basic utilities for backward compatibility
import { transformFiltersToApiFormat } from './translators.js';
import { validateFilterStructure } from './validators.js';

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
  createCreatedDateFilter,
  createDateRangeFilter,
  createEmployeeCountFilter,
  createModifiedDateFilter,
  createNumericFilter,
  createRevenueFilter,
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
  createCompaniesByPeopleFilter,
  createCompaniesByPeopleListFilter,
  createPeopleByCompanyFilter,
  createPeopleByCompanyListFilter,
  createRecordsByListFilter,
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

export {
  transformFiltersToApiFormat,
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
};

// Re-export ATTRIBUTES as FILTER_ATTRIBUTES for backward compatibility
export { ATTRIBUTES as FILTER_ATTRIBUTES } from './types.js';
