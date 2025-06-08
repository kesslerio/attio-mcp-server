/**
 * Manual test to verify domain search functionality
 * This tests the specific issue reported where domain search returns 0 results
 */

import { searchCompaniesByDomain } from '../../dist/objects/companies/search.js';

async function testDomainSearchIssue() {
  console.log('=== Testing Domain Search Issue ===');
  
  const testDomains = [
    'glomedspact.com',
    'example.com',
    'google.com',
    'microsoft.com'
  ];

  for (const domain of testDomains) {
    try {
      console.log(`\nTesting domain: ${domain}`);
      const results = await searchCompaniesByDomain(domain);
      console.log(`Results: ${results.length} companies found`);
      
      if (results.length > 0) {
        console.log('First result:', {
          id: results[0].id?.record_id,
          name: results[0].values?.name?.[0]?.value,
          domains: results[0].values?.domains,
          website: results[0].values?.website?.[0]?.value
        });
      }
    } catch (error) {
      console.error(`Error searching for ${domain}:`, error.message);
    }
  }
}

// Set up environment if API key exists
if (process.env.ATTIO_API_KEY) {
  testDomainSearchIssue().catch(console.error);
} else {
  console.log('ATTIO_API_KEY not set, skipping domain search test');
}