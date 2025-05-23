/**
 * Company module - Central export point
 * Re-exports all company-related functionality from modular files
 */

// Basic CRUD operations
export {
  listCompanies,
  getCompanyDetails,
  createCompany,
  updateCompany,
  updateCompanyAttribute,
  deleteCompany,
  extractCompanyId
} from "./basic.js";

// Search functionality
export {
  searchCompanies,
  searchCompaniesByDomain,
  searchCompaniesByName,
  smartSearchCompanies,
  advancedSearchCompanies,
  createNameFilter,
  createWebsiteFilter,
  createIndustryFilter,
  createDomainFilter
} from "./search.js";

// Search types
export type {
  CompanySearchOptions
} from "./search.js";

// Relationship-based queries
export {
  searchCompaniesByPeople,
  searchCompaniesByPeopleList,
  searchCompaniesByNotes,
  getCompanyLists
} from "./relationships.js";

// Note operations
export {
  getCompanyNotes,
  createCompanyNote
} from "./notes.js";

// Attribute management
export {
  getCompanyFields,
  getCompanyBasicInfo,
  getCompanyContactInfo,
  getCompanyBusinessInfo,
  getCompanySocialInfo,
  getCompanyCustomFields,
  discoverCompanyAttributes,
  getCompanyAttributes
} from "./attributes.js";

// Batch operations (re-export from separate module)
export {
  batchCreateCompanies,
  batchUpdateCompanies,
  batchDeleteCompanies,
  batchSearchCompanies,
  batchGetCompanyDetails
} from "./batch.js";

// Re-export types for convenience
export type {
  Company,
  CompanyCreateInput,
  CompanyUpdateInput,
  CompanyAttributeUpdate
} from "./types.js";
