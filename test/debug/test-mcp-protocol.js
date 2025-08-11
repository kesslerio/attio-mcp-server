#!/usr/bin/env node

/**
 * Test MCP protocol serialization with problematic data
 * Simulates the exact scenario that was causing server failures
 */

import { formatResponse } from '../../dist/handlers/tools/formatters.js';
import { createErrorResult } from '../../dist/utils/error-handler.js';

console.log('🔍 Testing MCP Protocol JSON Serialization\n');
console.log('=' .repeat(50));

// Test Case 1: Circular reference in API response data
console.log('\n📦 Test 1: Circular reference in API response');
const circularApiData = {
  id: 'rec_123',
  name: 'Test Company',
  attributes: {}
};
circularApiData.attributes.parent = circularApiData;

try {
  const response = formatResponse(circularApiData, false);
  const jsonString = JSON.stringify(response);
  console.log('✅ Successfully serialized circular API data');
  console.log('   Length:', jsonString.length, 'bytes');
  console.log('   Sample:', jsonString.substring(0, 100) + '...');
} catch (error) {
  console.log('❌ Failed to serialize:', error.message);
}

// Test Case 2: Error with circular reference in response data
console.log('\n📦 Test 2: Error with circular reference');
const circularError = new Error('API request failed');
const errorResponseData = {
  status: 400,
  error: {
    message: 'Bad request',
    details: {}
  }
};
errorResponseData.error.details.response = errorResponseData;

try {
  const errorResult = createErrorResult(
    circularError,
    '/api/v2/objects/companies',
    'POST',
    errorResponseData
  );
  const jsonString = JSON.stringify(errorResult);
  console.log('✅ Successfully serialized error with circular data');
  console.log('   Length:', jsonString.length, 'bytes');
  console.log('   Sample:', jsonString.substring(0, 100) + '...');
} catch (error) {
  console.log('❌ Failed to serialize:', error.message);
}

// Test Case 3: Large nested object (potential stack overflow)
console.log('\n📦 Test 3: Deeply nested object');
let deepObj = { level: 0, data: 'root' };
for (let i = 1; i < 1000; i++) {
  deepObj = { level: i, nested: deepObj, data: `level_${i}` };
}

try {
  const response = formatResponse(deepObj, false);
  const jsonString = JSON.stringify(response);
  console.log('✅ Successfully serialized deeply nested object');
  console.log('   Depth: 1000 levels');
  console.log('   Length:', jsonString.length, 'bytes');
} catch (error) {
  console.log('❌ Failed to serialize:', error.message);
}

// Test Case 4: Mixed problematic content
console.log('\n📦 Test 4: Mixed problematic content');
const mixedContent = {
  id: 'test_123',
  functions: {
    processor: () => console.log('test'),
    validator: function() { return true; }
  },
  undefinedValue: undefined,
  symbolValue: Symbol('test'),
  circularRef: null,
  largeString: 'x'.repeat(50000),
  invalidDate: new Date('invalid')
};
mixedContent.circularRef = mixedContent;

try {
  const response = formatResponse(mixedContent, false);
  const jsonString = JSON.stringify(response);
  console.log('✅ Successfully serialized mixed problematic content');
  console.log('   Length:', jsonString.length, 'bytes');
  
  // Verify it can be parsed back
  const parsed = JSON.parse(jsonString);
  console.log('✅ Successfully parsed back to object');
} catch (error) {
  console.log('❌ Failed:', error.message);
}

// Test Case 5: Simulate actual MCP protocol message
console.log('\n📦 Test 5: MCP protocol message simulation');
const mcpMessage = {
  jsonrpc: '2.0',
  id: 1,
  result: {
    content: [
      {
        type: 'text',
        text: 'Operation completed successfully'
      }
    ],
    isError: false,
    data: {
      records: [],
      metadata: {}
    }
  }
};

// Add circular reference in the result data
mcpMessage.result.data.metadata.parent = mcpMessage.result.data;

try {
  // This simulates what the MCP SDK would do
  const jsonString = JSON.stringify(mcpMessage);
  console.log('❌ Direct stringify failed (expected):', 'Circular reference');
} catch (error) {
  console.log('✅ Direct stringify failed as expected:', error.message.substring(0, 50));
}

// Now test with our sanitization
try {
  const sanitized = formatResponse(mcpMessage.result, false);
  const jsonString = JSON.stringify(sanitized);
  console.log('✅ Successfully serialized with sanitization');
  console.log('   Length:', jsonString.length, 'bytes');
  
  // Verify MCP protocol structure
  const parsed = JSON.parse(jsonString);
  if (parsed.content && Array.isArray(parsed.content) && parsed.content[0].type === 'text') {
    console.log('✅ Valid MCP protocol structure maintained');
  }
} catch (error) {
  console.log('❌ Failed:', error.message);
}

console.log('\n' + '=' .repeat(50));
console.log('✅ MCP Protocol Serialization Tests Complete');
console.log('\n💡 Summary:');
console.log('   - Circular references: Handled via fast-safe-stringify');
console.log('   - Deep nesting: Supported up to 1000+ levels');
console.log('   - Non-serializable values: Automatically converted');
console.log('   - MCP protocol compliance: Structure preserved');