/**
 * Simple debug script to trace attribute mapping
 */

// Import the mapping functions
const {
  getAttributeSlug,
} = require('../dist/utils/attribute-mapping/attribute-mappers.js');
const {
  translateAttributeNamesInFilters,
} = require('../dist/utils/attribute-mapping.js');

// Test cases
const testCases = ['B2B Segment', 'b2b_segment', 'b2b segment', 'B2B_Segment'];

console.log('Direct attribute slug lookup tests:');
testCases.forEach((testCase) => {
  const result = getAttributeSlug(testCase, 'companies');
  console.log(`  "${testCase}" -> "${result}"`);
});

console.log('\nFilter translation test:');
const filter = {
  filters: [
    {
      attribute: {
        slug: 'B2B Segment',
      },
      condition: 'equals',
      value: 'Enterprise',
    },
  ],
};

console.log('Original filter:', JSON.stringify(filter, null, 2));
const translated = translateAttributeNamesInFilters(filter, 'companies');
console.log('Translated filter:', JSON.stringify(translated, null, 2));
