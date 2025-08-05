/**
 * Company module - Central export point
 * Re-exports all company-related functionality from modular files
 */

// Attribute management
export {
  discoverCompanyAttributes,
  getCompanyAttributes,
  getCompanyBasicInfo,
  getCompanyBusinessInfo,
  getCompanyContactInfo,
  getCompanyCustomFields,
  getCompanyFields,
  getCompanySocialInfo,
} from './attributes.js';
// Basic CRUD operations
export {
  createCompany,
  deleteCompany,
  extractCompanyId,
  getCompanyDetails,
  listCompanies,
  updateCompany,
  updateCompanyAttribute,
} from './basic.js';
// Batch operations (re-export from separate module)
export {
  batchCreateCompanies,
  batchDeleteCompanies,
  batchGetCompanyDetails,
  batchSearchCompanies,
  batchUpdateCompanies,
} from './batch.js';
// Note operations
export { createCompanyNote, getCompanyNotes } from './notes.js';
// Relationship-based queries
export {
  getCompanyLists,
  searchCompaniesByNotes,
  searchCompaniesByPeople,
  searchCompaniesByPeopleList,
} from './relationships.js';
// Search types
export type { CompanySearchOptions } from './search.js';
// Search functionality
export {
  advancedSearchCompanies,
  createDomainFilter,
  createIndustryFilter,
  createNameFilter,
  searchCompanies,
  searchCompaniesByDomain,
} from './search.js';

// Re-export types for convenience
export type {
  Company,
  CompanyAttributeUpdate,
  CompanyCreateInput,
  CompanyUpdateInput,
} from './types.js';
