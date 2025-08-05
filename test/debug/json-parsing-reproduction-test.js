#!/usr/bin/env node

/**
 * Test to reproduce JSON parsing errors causing MCP protocol breakdown
 * This test identifies common JSON serialization issues that can cause malformed responses
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test data that commonly causes JSON serialization issues
const problematicTestData = {
  // Circular reference test data
  circularRef: (() => {
    const obj = { name: 'test', data: {} };
    obj.data.parent = obj; // Creates circular reference
    return obj;
  })(),

  // Large nested object
  deepNesting: (() => {
    let obj = { level: 0 };
    for (let i = 1; i < 100; i++) {
      obj = { level: i, nested: obj };
    }
    return obj;
  })(),

  // Object with non-serializable functions
  withFunctions: {
    name: 'test',
    callback: () => console.log('test'),
    data: {
      process() {
        return 'result';
      },
    },
  },

  // Object with undefined values
  withUndefined: {
    name: 'test',
    value: undefined,
    data: { count: 5, status: undefined },
  },

  // Object with symbols
  withSymbols: {
    name: 'test',
    [Symbol('id')]: 'symbol-value',
    data: { type: Symbol('data-type') },
  },

  // Very large string that might cause buffer issues
  largeString: {
    name: 'test',
    content: 'x'.repeat(100_000), // 100KB string
    data: { description: 'Large content test' },
  },

  // Invalid date objects
  invalidDates: {
    name: 'test',
    created: new Date('invalid'),
    updated: new Date(Number.NaN),
  },

  // Mixed complex data
  complexMixed: {
    name: 'Complex Test',
    attributes: {
      value: undefined,
      callback: () => 'test',
      date: new Date('invalid'),
      symbol: Symbol('test'),
      nested: { level: 1, data: null },
    },
    records: [
      { id: 1, value: undefined },
      {
        id: 2,
        callback() {
          return 'test';
        },
      },
      { id: 3, date: new Date('2023-01-01') },
    ],
  },
};

/**
 * Test JSON.stringify behavior with various problematic inputs
 */
function testJsonStringify() {
  console.log('\n=== Testing JSON.stringify behavior ===');

  for (const [testName, testData] of Object.entries(problematicTestData)) {
    console.log(`\nTesting: ${testName}`);

    try {
      const result = JSON.stringify(testData);
      console.log(`✅ Success (length: ${result.length})`);

      // Test if the result can be parsed back
      try {
        JSON.parse(result);
        console.log('✅ Parse back successful');
      } catch (parseError) {
        console.log(`❌ Parse back failed: ${parseError.message}`);
      }
    } catch (stringifyError) {
      console.log(`❌ Stringify failed: ${stringifyError.message}`);

      // Test with replacer function
      try {
        const safeResult = JSON.stringify(testData, (key, value) => {
          if (typeof value === 'function') return '[Function]';
          if (typeof value === 'symbol') return '[Symbol]';
          if (value === undefined) return null;
          if (value instanceof Date && isNaN(value.getTime()))
            return '[Invalid Date]';
          return value;
        });
        console.log(
          `✅ Safe stringify succeeded (length: ${safeResult.length})`
        );
      } catch (safeError) {
        console.log(`❌ Safe stringify also failed: ${safeError.message}`);
      }
    }
  }
}

/**
 * Test the formatters from the actual codebase
 */
async function testFormatters() {
  console.log('\n=== Testing actual formatters ===');

  try {
    // Import the actual formatter functions
    const formattersPath = path.join(
      __dirname,
      '../../src/handlers/tools/formatters.js'
    );

    if (!fs.existsSync(formattersPath)) {
      console.log('❌ Formatters file not found at expected path');
      return;
    }

    const { formatResponse, formatSearchResults, formatRecordDetails } =
      await import(formattersPath);

    // Test formatResponse with problematic data
    for (const [testName, testData] of Object.entries(problematicTestData)) {
      console.log(`\nTesting formatResponse with: ${testName}`);

      try {
        const result = formatResponse(testData);
        console.log('✅ formatResponse succeeded');

        // Try to stringify the result (simulating MCP protocol serialization)
        try {
          const jsonResult = JSON.stringify(result);
          console.log(
            `✅ MCP serialization succeeded (length: ${jsonResult.length})`
          );
        } catch (mcpError) {
          console.log(`❌ MCP serialization failed: ${mcpError.message}`);
        }
      } catch (formatError) {
        console.log(`❌ formatResponse failed: ${formatError.message}`);
      }
    }
  } catch (importError) {
    console.log(`❌ Failed to import formatters: ${importError.message}`);
  }
}

/**
 * Test error handling scenarios
 */
function testErrorScenarios() {
  console.log('\n=== Testing error handling scenarios ===');

  // Test various error objects
  const errorScenarios = [
    new Error('Simple error'),
    new Error('Error with circular reference'),
    { message: 'Plain object error', stack: 'fake stack trace' },
    { response: { data: problematicTestData.circularRef } },
    null,
    undefined,
    'String error',
    42,
    { complex: problematicTestData.complexMixed },
  ];

  errorScenarios.forEach((errorData, index) => {
    console.log(`\nTesting error scenario ${index + 1}: ${typeof errorData}`);

    try {
      const result = JSON.stringify(errorData);
      console.log(
        `✅ Error serialization succeeded (length: ${result.length})`
      );
    } catch (error) {
      console.log(`❌ Error serialization failed: ${error.message}`);

      // Test safe serialization
      try {
        const safeResult = JSON.stringify(errorData, (key, value) => {
          if (value === null || value === undefined) return null;
          if (typeof value === 'function') return '[Function]';
          if (typeof value === 'symbol') return '[Symbol]';
          if (value instanceof Error)
            return {
              name: value.name,
              message: value.message,
              stack: value.stack,
            };
          return value;
        });
        console.log('✅ Safe error serialization succeeded');
      } catch (safeError) {
        console.log(`❌ Safe error serialization failed: ${safeError.message}`);
      }
    }
  });
}

/**
 * Test stream/buffer simulation
 */
function testStreamBufferSimulation() {
  console.log('\n=== Testing stream/buffer simulation ===');

  // Simulate fragmented JSON transmission
  const testJson = JSON.stringify({
    content: [{ type: 'text', text: 'Test message' }],
    isError: false,
  });

  console.log(`Original JSON length: ${testJson.length}`);

  // Split into chunks to simulate streaming
  const chunkSize = 10;
  const chunks = [];
  for (let i = 0; i < testJson.length; i += chunkSize) {
    chunks.push(testJson.slice(i, i + chunkSize));
  }

  console.log(`Split into ${chunks.length} chunks`);

  // Test reassembly
  let reassembled = '';
  chunks.forEach((chunk, index) => {
    reassembled += chunk;

    // Try to parse at each step (simulating incremental parsing)
    try {
      JSON.parse(reassembled);
      console.log(`✅ Parse successful after chunk ${index + 1}`);
    } catch (parseError) {
      if (index === chunks.length - 1) {
        console.log(`❌ Final parse failed: ${parseError.message}`);
      }
      // Incomplete JSON is expected during streaming
    }
  });
}

/**
 * Main test runner
 */
async function main() {
  console.log('🔍 JSON Parsing Error Reproduction Test');
  console.log('======================================');

  testJsonStringify();
  await testFormatters();
  testErrorScenarios();
  testStreamBufferSimulation();

  console.log('\n✅ Test completed. Check output above for potential issues.');
  console.log('\n💡 Common fixes for identified issues:');
  console.log(
    '   - Use JSON.stringify replacer functions to handle non-serializable values'
  );
  console.log('   - Implement circular reference detection');
  console.log('   - Add validation before JSON serialization');
  console.log(
    '   - Handle streaming/buffering properly in MCP transport layer'
  );
}

// Run the test
main().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
