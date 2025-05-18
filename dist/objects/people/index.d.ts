/**
 * People module - Central export point
 * Maintains backward compatibility while organizing people operations into focused modules
 */
export * from './types.js';
export { createPerson, updatePerson, updatePersonAttribute, deletePerson, getPersonDetails, listPeople } from './basic.js';
export { searchPeople, searchPeopleByQuery, searchPeopleByEmail, searchPeopleByPhone, getPersonByEmail, advancedSearchPeople, searchPeopleByCreationDate, searchPeopleByModificationDate, searchPeopleByLastInteraction, searchPeopleByActivity } from './search.js';
export { searchPeopleByCompany, searchPeopleByCompanyList, searchPeopleByNotes } from './relationships.js';
export { batchSearchPeople, batchGetPeopleDetails } from './batch.js';
export { getPersonNotes, createPersonNote } from './notes.js';
//# sourceMappingURL=index.d.ts.map