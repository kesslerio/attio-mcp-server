#!/usr/bin/env node

/**
 * Direct test of json-serializer.ts to verify circular reference handling
 */

import { safeJsonStringify, sanitizeMcpResponse } from '../../dist/utils/json-serializer.js';

console.log('Testing JSON serializer with circular references...\n');

// Test 1: Simple circular reference
console.log('Test 1: Simple circular reference');
const obj1 = { name: 'test' };
obj1.self = obj1;

try {
  const result = safeJsonStringify(obj1);
  console.log('✅ Success:', result.substring(0, 100));
} catch (error) {
  console.log('❌ Failed:', error.message);
}

// Test 2: Nested circular reference
console.log('\nTest 2: Nested circular reference');
const obj2 = { 
  name: 'parent',
  data: { name: 'child' }
};
obj2.data.parent = obj2;

try {
  const result = safeJsonStringify(obj2);
  console.log('✅ Success:', result.substring(0, 100));
} catch (error) {
  console.log('❌ Failed:', error.message);
}

// Test 3: MCP response with circular reference
console.log('\nTest 3: MCP response with circular reference');
const circularData = { id: 1 };
circularData.ref = circularData;

const mcpResponse = {
  content: [
    {
      type: 'text',
      text: 'Test response'
    }
  ],
  isError: false,
  data: circularData
};

try {
  const result = sanitizeMcpResponse(mcpResponse);
  console.log('✅ Success:', JSON.stringify(result, null, 2).substring(0, 200));
} catch (error) {
  console.log('❌ Failed:', error.message);
}

// Test 4: Error object with circular reference
console.log('\nTest 4: Error with circular reference in details');
const errorObj = new Error('Test error');
const circularDetails = { error: errorObj };
circularDetails.self = circularDetails;

try {
  const result = safeJsonStringify({
    message: errorObj.message,
    details: circularDetails
  });
  console.log('✅ Success:', result.substring(0, 100));
} catch (error) {
  console.log('❌ Failed:', error.message);
}

console.log('\n✅ All tests completed');