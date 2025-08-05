/**
 * People module - Central export point
 * Maintains backward compatibility while organizing people operations into focused modules
 */

// Export basic CRUD operations
export {
  createPerson,
  deletePerson,
  getPersonDetails,
  listPeople,
  updatePerson,
  updatePersonAttribute,
} from './basic.js';
// Export batch operations
export { batchGetPeopleDetails, batchSearchPeople } from './batch.js';
// Export note operations
export { createPersonNote, getPersonNotes } from './notes.js';

// Export relationship queries
export {
  searchPeopleByCompany,
  searchPeopleByCompanyList,
  searchPeopleByNotes,
} from './relationships.js';
// Export search functionality
export {
  advancedSearchPeople,
  getPersonByEmail,
  searchPeople,
  searchPeopleByActivity,
  searchPeopleByCreationDate,
  searchPeopleByEmail,
  searchPeopleByLastInteraction,
  searchPeopleByModificationDate,
  searchPeopleByPhone,
  searchPeopleByQuery,
} from './search.js';
// Export all types
export * from './types.js';
