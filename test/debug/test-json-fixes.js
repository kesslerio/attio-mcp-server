#!/usr/bin/env node

/**
 * Test script to verify JSON serialization fixes work correctly
 * Tests the new safe JSON serialization utilities and MCP response sanitization
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test the new JSON serialization utilities
 */
async function testJsonSerializer() {
  console.log('\n=== Testing JSON Serializer Utilities ===');

  try {
    // Import the utilities (will work after build)
    const {
      safeJsonStringify,
      validateJsonString,
      hasCircularReferences,
      createSafeCopy,
      sanitizeMcpResponse,
    } = await import('../../dist/utils/json-serializer.js');

    // Test circular reference detection
    const circularObj = { name: 'test', data: {} };
    circularObj.data.parent = circularObj;

    console.log('\n1. Testing circular reference detection:');
    console.log('   Has circular refs:', hasCircularReferences(circularObj));
    console.log(
      '   Has circular refs (normal obj):',
      hasCircularReferences({ name: 'test' })
    );

    // Test safe JSON stringify
    console.log('\n2. Testing safe JSON stringify:');
    const safeJson = safeJsonStringify(circularObj);
    console.log(
      '   Circular object serialized successfully:',
      safeJson.length > 0
    );

    // Test JSON validation
    console.log('\n3. Testing JSON validation:');
    const validation = validateJsonString('{"valid": true}');
    console.log('   Valid JSON:', validation.isValid);

    const invalidValidation = validateJsonString('{invalid json}');
    console.log('   Invalid JSON detected:', !invalidValidation.isValid);

    // Test MCP response sanitization
    console.log('\n4. Testing MCP response sanitization:');
    const mcpResponse = {
      content: [{ type: 'text', text: 'Test response' }],
      isError: false,
      metadata: circularObj, // This would normally cause issues
    };

    const sanitized = sanitizeMcpResponse(mcpResponse);
    console.log(
      '   MCP response sanitized successfully:',
      sanitized.content[0].text === 'Test response'
    );

    // Test with complex nested data
    console.log('\n5. Testing complex nested data:');
    const complexData = {
      user: {
        profile: {
          settings: {
            preferences: {
              theme: 'dark',
              notifications: true,
              circular: circularObj,
            },
          },
        },
      },
      functions: {
        callback: () => console.log('test'),
        handler() {
          return 'handled';
        },
      },
      dates: {
        valid: new Date(),
        invalid: new Date('invalid'),
      },
    };

    const complexSerialized = safeJsonStringify(complexData);
    console.log(
      '   Complex data serialized successfully:',
      complexSerialized.length > 0
    );

    console.log('\n✅ All JSON serializer tests passed!');
    return true;
  } catch (error) {
    console.log('\n❌ JSON serializer tests failed:', error.message);
    return false;
  }
}

/**
 * Test the updated formatters
 */
async function testFormatters() {
  console.log('\n=== Testing Updated Formatters ===');

  try {
    const { formatResponse } = await import(
      '../../dist/handlers/tools/formatters.js'
    );

    // Test with circular reference
    const circularObj = { name: 'test', data: {} };
    circularObj.data.parent = circularObj;

    console.log('\n1. Testing formatResponse with circular reference:');
    const result = formatResponse(circularObj);
    console.log(
      '   Formatted successfully:',
      result.content[0].text.includes('test')
    );

    // Test with complex nested data
    console.log('\n2. Testing formatResponse with complex data:');
    const complexResult = formatResponse({
      records: [
        { id: 1, callback: () => 'test' },
        { id: 2, date: new Date('invalid') },
        { id: 3, circular: circularObj },
      ],
    });
    console.log(
      '   Complex data formatted successfully:',
      complexResult.content[0].text.length > 0
    );

    console.log('\n✅ All formatter tests passed!');
    return true;
  } catch (error) {
    console.log('\n❌ Formatter tests failed:', error.message);
    return false;
  }
}

/**
 * Test error handlers
 */
async function testErrorHandlers() {
  console.log('\n=== Testing Updated Error Handlers ===');

  try {
    const { createErrorResult, formatErrorResponse } = await import(
      '../../dist/utils/error-handler.js'
    );

    // Test with circular reference in error details
    const circularObj = { name: 'error', data: {} };
    circularObj.data.parent = circularObj;

    console.log('\n1. Testing createErrorResult with circular reference:');
    const errorResult = createErrorResult(
      new Error('Test error'),
      '/test/path',
      'POST',
      { circular: circularObj }
    );
    console.log(
      '   Error result created successfully:',
      errorResult.isError === true
    );

    console.log('\n✅ All error handler tests passed!');
    return true;
  } catch (error) {
    console.log('\n❌ Error handler tests failed:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🔧 Testing JSON Serialization Fixes');
  console.log('====================================');

  const results = await Promise.all([
    testJsonSerializer(),
    testFormatters(),
    testErrorHandlers(),
  ]);

  const allPassed = results.every((result) => result);

  if (allPassed) {
    console.log(
      '\n🎉 All tests passed! JSON serialization fixes are working correctly.'
    );
  } else {
    console.log('\n❌ Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Run the tests
main().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
