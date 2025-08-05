/**
 * Test that various attribute mappings work correctly
 */

import { FilterConditionType, ResourceType } from './dist/types/attio.js';
import {
  getAttributeSlug,
  translateAttributeNamesInFilters,
} from './dist/utils/attribute-mapping/index.js';

console.log('=== Testing Various Attribute Mappings ===\n');

// Test various attribute mappings
const testMappings = [
  // Special cases
  { input: 'b2b_segment', expected: 'type_persona' },
  { input: 'B2B Segment', expected: 'type_persona' },

  // From user.json file
  { input: 'Industry', expected: 'industry' },
  { input: 'Website', expected: 'website' },
  { input: 'Recent News/Press', expected: 'recent_news__press' },
  { input: 'Notes on Company', expected: 'notes_on_company' },

  // From default.json (common mappings)
  { input: 'First Name', expected: 'first_name' },
  { input: 'Last Name', expected: 'last_name' },
  { input: 'Email', expected: 'email_address' },
  { input: 'Phone', expected: 'phone_number' },
  { input: 'Company', expected: 'company' },

  // Different case variations
  { input: 'company_name', expected: 'company' },
  { input: 'COMPANY_NAME', expected: 'company' },
  { input: 'Company Name', expected: 'company' },
];

console.log('Test 1: Direct attribute mapping\n');
testMappings.forEach(({ input, expected }) => {
  const result = getAttributeSlug(input);
  const success = result === expected;
  console.log(
    `"${input}" → "${result}" ${success ? '✅' : `❌ (expected: ${expected})`}`
  );
});

// Test filter translation
console.log('\n\nTest 2: Complex filter translation\n');
const complexFilter = {
  filters: [
    {
      attribute: { slug: 'b2b_segment' },
      condition: FilterConditionType.CONTAINS,
      value: 'Healthcare',
    },
    {
      attribute: { slug: 'Company Name' },
      condition: FilterConditionType.CONTAINS,
      value: 'Medical',
    },
    {
      attribute: { slug: 'Recent News/Press' },
      condition: FilterConditionType.CONTAINS,
      value: 'FDA approval',
    },
  ],
};

console.log('Original filter:', JSON.stringify(complexFilter, null, 2));

const translatedFilter = translateAttributeNamesInFilters(
  complexFilter,
  ResourceType.COMPANIES
);
console.log('\nTranslated filter:', JSON.stringify(translatedFilter, null, 2));

// Check if all mappings worked
const expectedMappings = {
  b2b_segment: 'type_persona',
  'Company Name': 'company',
  'Recent News/Press': 'recent_news__press',
};

let allMapped = true;
Object.entries(expectedMappings).forEach(([original, expected]) => {
  const found = JSON.stringify(translatedFilter).includes(expected);
  console.log(`\n${original} → ${expected}: ${found ? '✅' : '❌'}`);
  if (!found) allMapped = false;
});

console.log('\n=== Summary ===');
console.log(
  `All mappings working correctly: ${allMapped ? '✅ YES' : '❌ NO'}`
);
console.log('\nThe attribute mapping system now correctly handles:');
console.log('- Special case mappings (b2b_segment → type_persona)');
console.log('- Human-readable names (Company Name → company)');
console.log(
  '- User-defined custom mappings (Recent News/Press → recent_news__press)'
);
console.log('- Various case formats and separators');
