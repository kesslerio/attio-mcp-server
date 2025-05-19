// Test the refactored people module
console.log('Testing people module refactoring...');

// Check that all exports are available
const peopleExports = [
  'createPerson',
  'updatePerson',
  'updatePersonAttribute',
  'deletePerson',
  'getPersonDetails',
  'listPeople',
  'searchPeople',
  'searchPeopleByQuery',
  'searchPeopleByEmail',
  'searchPeopleByPhone',
  'getPersonByEmail',
  'advancedSearchPeople',
  'searchPeopleByCreationDate',
  'searchPeopleByModificationDate',
  'searchPeopleByLastInteraction',
  'searchPeopleByActivity',
  'searchPeopleByCompany',
  'searchPeopleByCompanyList',
  'searchPeopleByNotes',
  'batchSearchPeople',
  'batchGetPeopleDetails',
  'getPersonNotes',
  'createPersonNote',
  'PersonOperationError',
  'InvalidPersonDataError',
  'PersonValidator'
];

try {
  // Check if we can import
  const peopleModule = require('./src/objects/people/index.js');
  
  console.log('Module imported successfully!');
  console.log('\nChecking exports:');
  
  let missingExports = [];
  for (const exportName of peopleExports) {
    if (peopleModule[exportName]) {
      console.log(`✓ ${exportName}`);
    } else {
      console.log(`✗ ${exportName} - MISSING`);
      missingExports.push(exportName);
    }
  }
  
  if (missingExports.length > 0) {
    console.log('\nMissing exports:', missingExports);
  } else {
    console.log('\nAll exports are available! Refactoring successful.');
  }
  
} catch (error) {
  console.error('Error testing module:', error.message);
}