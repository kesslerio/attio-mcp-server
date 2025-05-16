// Import using the correct paths and exports
import { getAttributeSlug, translateAttributeNamesInFilters } from './dist/utils/attribute-mapping/index.js';

console.log('\n=== Testing B2B Segment Attribute Mapping ===\n');

// Test 1: Direct getAttributeSlug calls
console.log('Test 1: Direct getAttributeSlug calls');
console.log('getAttributeSlug("b2b_segment"):', getAttributeSlug('b2b_segment'));
console.log('getAttributeSlug("B2B Segment"):', getAttributeSlug('B2B Segment'));
console.log('getAttributeSlug("b2b_segment", "companies"):', getAttributeSlug('b2b_segment', 'companies'));
console.log('getAttributeSlug("B2B Segment", "companies"):', getAttributeSlug('B2B Segment', 'companies'));

// Test 2: Test the full filter object as Claude sends it
console.log('\nTest 2: Claude filter structure test');
const claudeRequestFilter = {
  filters: [
    {
      value: 'Plastic Surgeon',
      attribute: {
        slug: 'b2b_segment'
      },
      condition: 'equals'
    }
  ],
  matchAny: false
};
const translatedClaudeFilter = translateAttributeNamesInFilters(claudeRequestFilter, 'companies');
console.log('Claude original filter:', JSON.stringify(claudeRequestFilter, null, 2));
console.log('Translated filter:', JSON.stringify(translatedClaudeFilter, null, 2));

// Test 3: Check various mapping formats
console.log('\nTest 3: Checking various input formats');
const formats = ['b2b_segment', 'B2B Segment', 'Type Persona', 'type_persona'];
for (const format of formats) {
  console.log(`"${format}" -> "${getAttributeSlug(format, 'companies')}"`);
}

// Test 4: Check if special case mapping exists
console.log('\nTest 4: Special case mapping check');
// The mapping should be b2b_segment -> type_persona
console.log('Expected result: b2b_segment should map to type_persona');
console.log('Actual mapping result for b2b_segment:', getAttributeSlug('b2b_segment', 'companies'));

// Test 5: Direct filter structure like what the API handler receives
console.log('\nTest 5: API handler filter translation');
const apiFilter = {
  filters: [{
    attribute: {
      slug: 'b2b_segment'
    },
    condition: 'equals', 
    value: 'Plastic Surgeon'
  }],
  matchAny: false
};
console.log('API filter before translation:', JSON.stringify(apiFilter, null, 2));
const apiTranslated = translateAttributeNamesInFilters(apiFilter, 'companies');
console.log('API filter after translation:', JSON.stringify(apiTranslated, null, 2));

console.log('\n=== Testing Complete ===\n');