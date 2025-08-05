/**
 * Benchmark comparison of JSON serialization libraries
 *
 * This script compares the performance of:
 * - Native JSON.stringify
 * - Our custom safeJsonStringify
 * - fast-safe-stringify
 * - safe-stable-stringify
 *
 * Run with: node test/utils/json-stringify-benchmark.js
 */

import fastSafeStringify from 'fast-safe-stringify';
import safeStableStringify from 'safe-stable-stringify';
import { safeJsonStringify } from '../../dist/utils/json-serializer.js';

function createTestCase(name, obj) {
  return { name, obj };
}

// Test cases that represent real-world scenarios we need to handle
const testCases = [
  createTestCase('Simple object', { a: 1, b: 'string', c: true }),

  createTestCase(
    'Circular reference - direct',
    (() => {
      const obj = { a: 1, b: 'string' };
      obj.circular = obj;
      return obj;
    })()
  ),

  createTestCase(
    'Circular reference - nested',
    (() => {
      const obj = { a: 1, b: { c: 2 } };
      obj.b.parent = obj;
      return obj;
    })()
  ),

  createTestCase('Functions', {
    a: 1,
    fn() {
      return 'test';
    },
    arrow: () => 'arrow',
  }),

  createTestCase('Non-serializable values', {
    a: 1,
    b: undefined,
    c: Symbol('test'),
    d: new Map([['key', 'value']]),
    e: new Set([1, 2, 3]),
  }),

  createTestCase('Error object', {
    error: new Error('Test error with stack trace'),
  }),

  createTestCase(
    'Deep object',
    (() => {
      const deepObj = { value: 1 };
      let current = deepObj;

      // Create an object that's 100 levels deep
      for (let i = 0; i < 100; i++) {
        current.next = { value: i + 2 };
        current = current.next;
      }
      return deepObj;
    })()
  ),

  createTestCase('Large array', {
    array: Array.from({ length: 10_000 }, (_, i) => ({
      id: i,
      value: `Item ${i}`,
    })),
  }),

  createTestCase('MCP response', {
    content: [
      {
        type: 'text',
        text: 'This is a test response with some "quotes" and \\backslashes\\',
      },
    ],
    metadata: {
      timing: {
        start: new Date(),
        end: new Date(),
      },
      source: {
        api: 'Attio',
        details: { response: 'very long response data...'.repeat(100) },
      },
    },
  }),

  createTestCase('Company record', {
    id: 'company_1234567890',
    values: {
      name: [{ value: 'Test Company' }],
      description: [{ value: 'This is a test company' }],
      website: [{ value: 'https://example.com' }],
      industry: [{ value: 'Technology' }],
      type_persona: [{ option: { title: 'Plastic Surgeon' } }],
      services: [
        { option: { title: 'Service 1' } },
        { option: { title: 'Service 2' } },
      ],
      employees: [{ value: 100 }],
      primary_location: [
        {
          locality: 'San Francisco',
          region: 'CA',
          country_code: 'US',
        },
      ],
    },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
  }),
];

// Warm up the engines
for (const testCase of testCases) {
  try {
    JSON.stringify(testCase.obj);
  } catch (e) {
    // Ignore errors in warmup
  }

  try {
    safeJsonStringify(testCase.obj);
  } catch (e) {
    // Ignore errors in warmup
  }

  try {
    fastSafeStringify(testCase.obj);
  } catch (e) {
    // Ignore errors in warmup
  }

  try {
    safeStableStringify(testCase.obj);
  } catch (e) {
    // Ignore errors in warmup
  }
}

// Run the benchmark
console.log('=== JSON Stringification Performance Benchmark ===');
console.log('Each test case runs 1000 iterations for each library');
console.log(
  'Results show: success/failure rate and average time in microseconds (μs)\n'
);

console.log(
  '| Test Case | Native JSON | Our Implementation | fast-safe-stringify | safe-stable-stringify |'
);
console.log(
  '|-----------|-------------|-------------------|---------------------|----------------------|'
);

for (const testCase of testCases) {
  const results = {
    native: { success: 0, time: 0 },
    custom: { success: 0, time: 0 },
    fast: { success: 0, time: 0 },
    stable: { success: 0, time: 0 },
  };

  // Test native JSON.stringify
  for (let i = 0; i < 1000; i++) {
    const start = process.hrtime.bigint();
    try {
      JSON.stringify(testCase.obj);
      results.native.success++;
      results.native.time += Number(process.hrtime.bigint() - start);
    } catch (e) {
      results.native.time += Number(process.hrtime.bigint() - start);
    }
  }

  // Test our custom implementation
  for (let i = 0; i < 1000; i++) {
    const start = process.hrtime.bigint();
    try {
      safeJsonStringify(testCase.obj);
      results.custom.success++;
      results.custom.time += Number(process.hrtime.bigint() - start);
    } catch (e) {
      results.custom.time += Number(process.hrtime.bigint() - start);
    }
  }

  // Test fast-safe-stringify
  for (let i = 0; i < 1000; i++) {
    const start = process.hrtime.bigint();
    try {
      fastSafeStringify(testCase.obj);
      results.fast.success++;
      results.fast.time += Number(process.hrtime.bigint() - start);
    } catch (e) {
      results.fast.time += Number(process.hrtime.bigint() - start);
    }
  }

  // Test safe-stable-stringify
  for (let i = 0; i < 1000; i++) {
    const start = process.hrtime.bigint();
    try {
      safeStableStringify(testCase.obj);
      results.stable.success++;
      results.stable.time += Number(process.hrtime.bigint() - start);
    } catch (e) {
      results.stable.time += Number(process.hrtime.bigint() - start);
    }
  }

  // Calculate averages in microseconds
  const nativeAvg = Math.round(results.native.time / 1000 / 1000);
  const customAvg = Math.round(results.custom.time / 1000 / 1000);
  const fastAvg = Math.round(results.fast.time / 1000 / 1000);
  const stableAvg = Math.round(results.stable.time / 1000 / 1000);

  console.log(
    `| ${testCase.name.padEnd(9)} | ${
      results.native.success
    }/1000 (${nativeAvg}μs) | ${
      results.custom.success
    }/1000 (${customAvg}μs) | ${results.fast.success}/1000 (${fastAvg}μs) | ${
      results.stable.success
    }/1000 (${stableAvg}μs) |`
  );
}

// Test serialization correctness
console.log('\n=== Serialization Correctness Test ===');
console.log('Testing if the serialized output can be parsed back to JSON\n');

for (const testCase of testCases) {
  console.log(`Test case: ${testCase.name}`);

  try {
    const nativeResult = JSON.stringify(testCase.obj);
    console.log('  Native JSON: ' + (nativeResult ? '✓' : '✗'));
  } catch (e) {
    console.log(`  Native JSON: ✗ (${e.message})`);
  }

  try {
    const customResult = safeJsonStringify(testCase.obj);
    const parsedCustom = JSON.parse(customResult);
    console.log('  Our Implementation: ✓');
  } catch (e) {
    console.log(`  Our Implementation: ✗ (${e.message})`);
  }

  try {
    const fastResult = fastSafeStringify(testCase.obj);
    const parsedFast = JSON.parse(fastResult);
    console.log('  fast-safe-stringify: ✓');
  } catch (e) {
    console.log(`  fast-safe-stringify: ✗ (${e.message})`);
  }

  try {
    const stableResult = safeStableStringify(testCase.obj);
    const parsedStable = JSON.parse(stableResult);
    console.log('  safe-stable-stringify: ✓');
  } catch (e) {
    console.log(`  safe-stable-stringify: ✗ (${e.message})`);
  }

  console.log('');
}
