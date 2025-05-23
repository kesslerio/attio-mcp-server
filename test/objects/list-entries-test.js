// Test script for manually verifying the getListEntries function
// This script must be run with the ES modules flag: node --experimental-modules test-list-entries.js

import { getListEntries } from './dist/api/attio-operations.js';

// The test list ID
const listId = 'f7622e9e-d302-4be6-bca5-d5a0d243e045';

// Set the environment to development to enable logging
process.env.NODE_ENV = 'development';

console.log('Test 1: getListEntries with no parameters');
// Test the function without parameters
getListEntries(listId)
  .then((entries) => {
    console.log('SUCCESS: List entries retrieved without parameters');
    console.log(`Found ${entries.length} entries`);
  })
  .catch((error) => {
    console.error('ERROR:', error.message);
  })
  .finally(() => {
    console.log('\nTest 2: getListEntries with limit parameter');
    // Test with limit parameter
    getListEntries(listId, 100)
      .then((entries) => {
        console.log('SUCCESS: List entries retrieved with limit parameter');
        console.log(`Found ${entries.length} entries`);
      })
      .catch((error) => {
        console.error('ERROR:', error.message);
      })
      .finally(() => {
        console.log(
          '\nTest 3: getListEntries with limit and offset parameters'
        );
        // Test with limit and offset parameters
        getListEntries(listId, 50, 20)
          .then((entries) => {
            console.log(
              'SUCCESS: List entries retrieved with limit and offset parameters'
            );
            console.log(`Found ${entries.length} entries`);
          })
          .catch((error) => {
            console.error('ERROR:', error.message);
          });
      });
  });
