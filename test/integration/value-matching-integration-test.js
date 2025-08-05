/**
 * Test the integrated value matching with error enhancement
 */

import { ValueMatchError } from './dist/errors/value-match-error.js';
import { enhanceApiError } from './dist/utils/error-enhancer.js';

// Mock API error responses
const mockErrors = [
  {
    name: 'Aesthetics error',
    error: {
      message:
        'Unknown select option name for option field constraint: Aesthetics',
      response: {
        status: 400,
        data: {
          message:
            'Unknown select option name for option field constraint: Aesthetics',
          path: ['type_persona'],
        },
      },
    },
  },
  {
    name: 'Surgeon error',
    error: {
      message:
        'Unknown select option name for option field constraint: Surgeon',
      response: {
        status: 400,
        data: {
          message:
            'Unknown select option name for option field constraint: Surgeon',
          path: ['type_persona'],
        },
      },
    },
  },
  {
    name: 'Tech error',
    error: {
      message: 'Unknown select option name for option field constraint: Tech',
      response: {
        status: 400,
        data: {
          message:
            'Unknown select option name for option field constraint: Tech',
          path: ['industry'],
        },
      },
    },
  },
  {
    name: 'Random error',
    error: {
      message: 'Some other API error',
      response: {
        status: 500,
        data: {
          message: 'Internal server error',
        },
      },
    },
  },
];

console.log('=== Testing Error Enhancement ===\n');

mockErrors.forEach(({ name, error }) => {
  console.log(`Test: ${name}`);
  console.log('Original error:', error.message);

  try {
    const enhanced = enhanceApiError(error);

    if (enhanced instanceof ValueMatchError) {
      console.log('✅ Enhanced with suggestions!');
      console.log('Message:', enhanced.message);
      console.log('Suggestions:', enhanced.suggestions);
      console.log('Best match:', enhanced.bestMatch);
    } else {
      console.log('❌ Not enhanced (as expected for non-value errors)');
      console.log('Message:', enhanced.message);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('\n---\n');
});

// Test the actual error format we'd show to users
console.log('=== User-Friendly Error Messages ===\n');

const aestheticsError = mockErrors[0].error;
const enhanced = enhanceApiError(aestheticsError);

if (enhanced instanceof ValueMatchError) {
  console.log('Error Response to User:');
  console.log(enhanced.message);
  console.log('\nDetails for logging:');
  console.log(JSON.stringify(enhanced.details, null, 2));
}
