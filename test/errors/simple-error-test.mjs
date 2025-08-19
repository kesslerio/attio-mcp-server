// Simple test to verify error enhancement
import {
  isValueMismatchError,
  enhanceApiError,
} from './dist/utils/error-enhancer.js';
import { interceptAndEnhanceError } from './dist/handlers/error-interceptor.js';

// Create a mock error similar to what Attio returns
const mockError = {
  message: 'Unknown select option name for option field constraint: Aesthetics',
  response: {
    data: {
      status_code: 400,
      type: 'invalid_request_error',
      code: 'unknown_filter_select_option_slug',
      message:
        'Unknown select option name for option field constraint: Aesthetics',
      path: ['type_persona'],
    },
  },
};

console.error('Testing with mock error:', mockError.message);
console.error(
  'Response data:',
  JSON.stringify(mockError.response.data, null, 2)
);

// Test if it's recognized as a value mismatch error
console.error('\n=== isValueMismatchError test ===');
const isMatch = isValueMismatchError(mockError);
console.error('Is value mismatch error?', isMatch);

// Test error enhancement directly
console.error('\n=== enhanceApiError test ===');
const enhancedError = enhanceApiError(mockError);
console.error('Enhanced error type:', enhancedError.constructor.name);
console.error('Enhanced error message:', enhancedError.message);

// Test full error interception
console.error('\n=== interceptAndEnhanceError test ===');
const enhancedResult = interceptAndEnhanceError(
  mockError,
  '/objects/people/records/query',
  'POST'
);

console.error('Enhanced result:', JSON.stringify(enhancedResult, null, 2));
