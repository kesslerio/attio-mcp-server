// ES module style import

import { FilterConditionType } from './dist/types/attio.js';
import { transformFiltersToApiFormat } from './dist/utils/filter-utils.js';

// Test filter for B2B Segment
const testFilter = {
  filters: [
    {
      attribute: {
        slug: 'type_persona', // This is what b2b_segment maps to
      },
      condition: FilterConditionType.EQUALS,
      value: 'Plastic Surgeon',
    },
  ],
  matchAny: false,
};

// Transform the filter
const apiFilter = transformFiltersToApiFormat(testFilter);

// Log the resulting filter
console.log('Input filter:', JSON.stringify(testFilter, null, 2));
console.log('API filter:', JSON.stringify(apiFilter, null, 2));

// Also try with a regular field for comparison
const regularFilter = {
  filters: [
    {
      attribute: {
        slug: 'name',
      },
      condition: FilterConditionType.CONTAINS,
      value: 'Acme',
    },
  ],
  matchAny: false,
};

const regularApiFilter = transformFiltersToApiFormat(regularFilter);
console.log('\nRegular field filter:');
console.log('Input:', JSON.stringify(regularFilter, null, 2));
console.log('Output:', JSON.stringify(regularApiFilter, null, 2));
