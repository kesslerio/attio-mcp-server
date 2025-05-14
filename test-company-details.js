// Test script for manually verifying the getCompanyDetails function
// This script must be run with the ES modules flag: node --experimental-modules test-company-details.js

import { getCompanyDetails } from './dist/objects/companies.js';

// The problematic company ID from the bug report
const companyId = '128193fa-b9d5-4485-b5e0-5cef3e8129be';

console.log(`Testing getCompanyDetails with ID: ${companyId}`);

// Set the environment to development to enable logging
process.env.NODE_ENV = 'development';

// Test the function
getCompanyDetails(companyId)
  .then(result => {
    console.log('SUCCESS: Company details retrieved successfully');
    console.log('Company ID:', result.id);
    console.log('Company Name:', result.values?.name?.[0]?.value || 'Unknown');
  })
  .catch(error => {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
  });