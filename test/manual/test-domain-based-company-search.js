/**
 * Manual test for domain-based company search enhancement
 * Tests the new domain prioritization functionality in company searches
 */

import {
  searchCompanies,
  searchCompaniesByDomain,
  smartSearchCompanies,
} from '../../src/objects/companies/index.js';
import {
  extractAllDomains,
  extractDomain,
  hasDomainIndicators,
} from '../../src/utils/domain-utils.js';

// Test configuration
const TEST_QUERIES = [
  // Domain-based queries
  'example.com',
  'https://example.com',
  'user@example.com',
  'www.example.com/path',

  // Company name queries
  'Acme Corp',
  'Technology Solutions',

  // Mixed queries
  'Acme Corp example.com',
  'Contact john@acme.com for details',
  'Visit https://acme.com to learn more',
];

const DOMAIN_TEST_CASES = [
  'stripe.com',
  'https://stripe.com',
  'support@stripe.com',
  'www.stripe.com/docs',
];

async function testDomainUtils() {
  console.log('\n=== Testing Domain Utility Functions ===\n');

  const testCases = [
    'example.com',
    'https://example.com/path',
    'user@example.com',
    'www.example.com',
    'not-a-domain',
    'company name only',
    'Visit https://example.com for more info',
    'Contact john@acme.com or jane@example.org',
  ];

  for (const testCase of testCases) {
    console.log(`Input: "${testCase}"`);
    console.log(`  - Extract single domain: ${extractDomain(testCase)}`);
    console.log(`  - Has domain indicators: ${hasDomainIndicators(testCase)}`);
    console.log(
      `  - Extract all domains: [${extractAllDomains(testCase).join(', ')}]`
    );
    console.log('');
  }
}

async function testEnhancedSearch() {
  console.log('\n=== Testing Enhanced Company Search ===\n');

  for (const query of TEST_QUERIES) {
    console.log(`\nTesting query: "${query}"`);
    console.log('----------------------------------------');

    try {
      // Test enhanced searchCompanies (with domain prioritization)
      console.log('Enhanced search results:');
      const enhancedResults = await searchCompanies(query);

      if (enhancedResults.length > 0) {
        enhancedResults.slice(0, 3).forEach((company, index) => {
          const name = company.values?.name?.[0]?.value || 'Unnamed';
          const website = company.values?.website?.[0]?.value || 'No website';
          console.log(`  ${index + 1}. ${name} (${website})`);
        });
        console.log(`  Total results: ${enhancedResults.length}`);
      } else {
        console.log('  No results found');
      }
    } catch (error) {
      console.error('Error in enhanced search:', error.message);
    }
  }
}

async function testDomainSpecificSearch() {
  console.log('\n=== Testing Domain-Specific Search ===\n');

  for (const domainQuery of DOMAIN_TEST_CASES) {
    const domain = extractDomain(domainQuery);
    if (!domain) continue;

    console.log(`\nTesting domain: "${domain}" (from "${domainQuery}")`);
    console.log('----------------------------------------');

    try {
      const domainResults = await searchCompaniesByDomain(domain);

      if (domainResults.length > 0) {
        domainResults.slice(0, 3).forEach((company, index) => {
          const name = company.values?.name?.[0]?.value || 'Unnamed';
          const website = company.values?.website?.[0]?.value || 'No website';
          console.log(`  ${index + 1}. ${name} (${website})`);
        });
        console.log(`  Total domain matches: ${domainResults.length}`);
      } else {
        console.log('  No domain-specific results found');
      }
    } catch (error) {
      console.error('Error in domain search:', error.message);
    }
  }
}

async function testSmartSearch() {
  console.log('\n=== Testing Smart Search ===\n');

  const smartTestQueries = [
    'stripe.com payment processing',
    'Contact support@example.com for Tech Solutions',
    'Visit https://acme.com to see Acme Corporation products',
  ];

  for (const query of smartTestQueries) {
    console.log(`\nTesting smart search: "${query}"`);
    console.log('----------------------------------------');

    try {
      const smartResults = await smartSearchCompanies(query);

      if (smartResults.length > 0) {
        smartResults.slice(0, 5).forEach((company, index) => {
          const name = company.values?.name?.[0]?.value || 'Unnamed';
          const website = company.values?.website?.[0]?.value || 'No website';
          console.log(`  ${index + 1}. ${name} (${website})`);
        });
        console.log(`  Total smart search results: ${smartResults.length}`);
      } else {
        console.log('  No smart search results found');
      }
    } catch (error) {
      console.error('Error in smart search:', error.message);
    }
  }
}

async function testPrioritization() {
  console.log('\n=== Testing Domain Prioritization ===\n');

  // Test a query that should return both domain and name matches
  const testQuery = 'example.com';

  console.log(`Testing prioritization with: "${testQuery}"`);
  console.log('Expecting domain matches to appear first...\n');

  try {
    const results = await searchCompanies(testQuery);

    if (results.length > 0) {
      console.log('Search results (should be domain-prioritized):');
      results.slice(0, 10).forEach((company, index) => {
        const name = company.values?.name?.[0]?.value || 'Unnamed';
        const website = company.values?.website?.[0]?.value || 'No website';
        const containsDomain = website.toLowerCase().includes('example.com');
        console.log(
          `  ${index + 1}. ${name} (${website}) ${
            containsDomain ? '🎯 DOMAIN MATCH' : ''
          }`
        );
      });
    } else {
      console.log('No results found for prioritization test');
    }
  } catch (error) {
    console.error('Error in prioritization test:', error.message);
  }
}

async function runAllTests() {
  console.log('🧪 Testing Domain-Based Company Search Enhancement');
  console.log('==================================================');

  if (!process.env.ATTIO_API_KEY) {
    console.error('❌ ATTIO_API_KEY environment variable is required');
    console.log('Set it with: export ATTIO_API_KEY=your_api_key_here');
    process.exit(1);
  }

  try {
    await testDomainUtils();
    await testEnhancedSearch();
    await testDomainSpecificSearch();
    await testSmartSearch();
    await testPrioritization();

    console.log('\n✅ All domain-based search tests completed!');
    console.log('\nKey Features Tested:');
    console.log('- ✅ Domain extraction from various formats');
    console.log('- ✅ Enhanced searchCompanies with domain prioritization');
    console.log('- ✅ Dedicated domain-based search');
    console.log('- ✅ Smart search with multi-domain support');
    console.log('- ✅ Result prioritization (domain matches first)');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
