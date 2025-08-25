/**
 * People module - Central export point
 * Maintains backward compatibility while organizing people operations into focused modules
 */
// Export all types
export * from './types.js';
// Export basic CRUD operations
export { createPerson, updatePerson, updatePersonAttribute, deletePerson, getPersonDetails, listPeople, } from './basic.js';
// Export search functionality
export { searchPeople, searchPeopleByQuery, searchPeopleByEmail, searchPeopleByPhone, getPersonByEmail, advancedSearchPeople, searchPeopleByCreationDate, searchPeopleByModificationDate, searchPeopleByLastInteraction, searchPeopleByActivity, } from './search.js';
// Export relationship queries
export { searchPeopleByCompany, searchPeopleByCompanyList, searchPeopleByNotes, } from './relationships.js';
// Export batch operations
export { batchSearchPeople, batchGetPeopleDetails } from './batch.js';
// Export note operations
export { getPersonNotes, createPersonNote } from './notes.js';
