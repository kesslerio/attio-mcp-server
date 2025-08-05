/**
 * Final test to confirm B2B segment mapping is fixed
 */

import { FilterConditionType, ResourceType } from '../../dist/types/attio.js';
// Import the necessary modules
import {
  getAttributeSlug,
  translateAttributeNamesInFilters,
} from '../../dist/utils/attribute-mapping/index.js';

console.log('=== B2B Segment Mapping Test ===\n');

// Test 1: Direct attribute mapping
console.log('Test 1: Direct attribute mapping');
const b2bResult = getAttributeSlug('b2b_segment');
console.log(`getAttributeSlug('b2b_segment') = "${b2bResult}"`);
console.log(`Success: ${b2bResult === 'type_persona' ? '✅' : '❌'}\n`);

// Test 2: Filter translation
console.log('Test 2: Filter translation');
const originalFilter = {
  filters: [
    {
      attribute: { slug: 'b2b_segment' },
      condition: FilterConditionType.CONTAINS,
      value: 'Plastic Surgeon',
    },
  ],
};

console.log('Original filter:', JSON.stringify(originalFilter, null, 2));

const translatedFilter = translateAttributeNamesInFilters(
  originalFilter,
  ResourceType.COMPANIES
);
console.log('\nTranslated filter:', JSON.stringify(translatedFilter, null, 2));

const wasTranslated =
  JSON.stringify(translatedFilter).includes('type_persona') &&
  !JSON.stringify(translatedFilter).includes('b2b_segment');
console.log(`\nSuccess: ${wasTranslated ? '✅' : '❌'}`);

console.log('\n=== Summary ===');
console.log(
  `The B2B segment mapping issue has been ${
    wasTranslated ? 'FIXED' : 'NOT FIXED'
  }`
);
console.log(
  'The import path was corrected from "../utils/attribute-mapping.js" to "../utils/attribute-mapping/index.js"'
);
