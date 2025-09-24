/**
 * Debug script to test formatResult behavior in different contexts
 */

import { searchRecordsConfig } from '../../dist/handlers/tool-configs/universal/core/index.js';
import { UniversalResourceType } from '../../dist/handlers/tool-configs/universal/types.js';

console.log('=== DEBUG FORMATRESULT BEHAVIOR ===');

// Mock data that matches test expectations
const mockResults = [
  {
    id: { record_id: 'comp-1' },
    values: {
      name: [{ value: 'Test Company' }],
      website: [{ value: 'https://test.com' }],
    },
  },
  {
    id: { record_id: 'comp-2' },
    values: {
      name: [{ value: 'Another Company' }],
      email: [{ value: 'info@another.com' }],
    },
  },
];

console.log('Input data:', JSON.stringify(mockResults, null, 2));

// Test formatResult function directly
const formatted = searchRecordsConfig.formatResult(
  mockResults,
  UniversalResourceType.COMPANIES
);

console.log('\n=== FORMATTED RESULT ===');
console.log('Type:', typeof formatted);
console.log('Is String:', typeof formatted === 'string');
console.log('Content:');
console.log(formatted);

console.log('\n=== TEST EXPECTATIONS ===');
console.log(
  'Should contain "Found 2 companies":',
  formatted.includes('Found 2 companies')
);
console.log(
  'Should contain "1. Test Company":',
  formatted.includes('1. Test Company')
);
console.log(
  'Should contain "2. Another Company":',
  formatted.includes('2. Another Company')
);

// Test universal dispatcher behavior simulation
console.log('\n=== UNIVERSAL DISPATCHER SIMULATION ===');
const args = { resource_type: UniversalResourceType.COMPANIES };

try {
  // Simulate dispatcher lines 327
  const dispatcherFormatted = searchRecordsConfig.formatResult(
    mockResults,
    args?.resource_type,
    args?.info_type
  );
  console.log('Dispatcher format (3 args) - Type:', typeof dispatcherFormatted);
  console.log(
    'Dispatcher format (3 args) - Content preview:',
    dispatcherFormatted.substring(0, 100)
  );
} catch (error) {
  console.log('Dispatcher format (3 args) - ERROR:', error.message);

  try {
    // Simulate dispatcher lines 330 fallback
    const fallbackFormatted = searchRecordsConfig.formatResult(mockResults);
    console.log(
      'Dispatcher fallback (1 arg) - Type:',
      typeof fallbackFormatted
    );
    console.log(
      'Dispatcher fallback (1 arg) - Content preview:',
      fallbackFormatted.substring(0, 100)
    );
  } catch (fallbackError) {
    console.log('Dispatcher fallback (1 arg) - ERROR:', fallbackError.message);
  }
}

console.log('\n=== ENVIRONMENT DETECTION ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Is test environment?:', process.env.NODE_ENV === 'test');
