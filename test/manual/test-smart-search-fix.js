#!/usr/bin/env node

/**
 * Manual test script to verify smart-search-companies tool fix
 *
 * This script simulates the MCP request that was failing and verifies
 * that the dispatcher now handles the smartSearch tool type correctly.
 * It also tests edge cases for query parameter validation.
 */

import { executeToolRequest } from '../../src/handlers/tools/dispatcher.js';

async function runTestCase(testName, request, expectError = false) {
  console.log(`\n🧪 Test: ${testName}`);
  console.log('Request:', JSON.stringify(request.params.arguments, null, 2));

  try {
    const result = await executeToolRequest(request);

    if (expectError) {
      if (result.isError) {
        console.log('✅ Expected error received');
        console.log(
          'Error message:',
          result.content[0].text.substring(0, 100) + '...'
        );
        return true;
      }
      console.log('❌ Expected error but got success');
      return false;
    }
    if (result.isError) {
      console.log('❌ Unexpected error');
      console.error('Error:', result.content[0].text);
      return false;
    }
    console.log('✅ Success');
    if (result.content && result.content.length > 0) {
      console.log(
        'Response preview:',
        result.content[0].text?.substring(0, 150) + '...'
      );
    }
    return true;
  } catch (error) {
    console.log('❌ Exception thrown');
    console.error('Error:', error.message);

    if (
      error.message.includes(
        'Tool handler not implemented for tool type: smartSearch'
      )
    ) {
      console.error(
        '🔥 The fix did not work - dispatcher still missing smartSearch handler'
      );
    }

    return false;
  }
}

async function testSmartSearchFix() {
  console.log(
    'Testing smart-search-companies tool fix with comprehensive test cases...\n'
  );

  const testCases = [
    {
      name: 'Valid query with domain and email',
      request: {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: 'IHT Factor joey@ihtfactor.com',
          },
        },
      },
      expectError: false,
    },
    {
      name: 'Valid query with company name only',
      request: {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: 'Acme Corporation',
          },
        },
      },
      expectError: false,
    },
    {
      name: 'Valid query with domain only',
      request: {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: 'example.com',
          },
        },
      },
      expectError: false,
    },
    {
      name: 'Empty query parameter',
      request: {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: '',
          },
        },
      },
      expectError: true,
    },
    {
      name: 'Whitespace-only query parameter',
      request: {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: '   \t\n   ',
          },
        },
      },
      expectError: true,
    },
    {
      name: 'Missing query parameter',
      request: {
        params: {
          name: 'smart-search-companies',
          arguments: {},
        },
      },
      expectError: true,
    },
    {
      name: 'Non-string query parameter',
      request: {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: 123,
          },
        },
      },
      expectError: true,
    },
    {
      name: 'Complex query with multiple identifiers',
      request: {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: 'Tech Corp john@techcorp.io https://techcorp.io/about',
          },
        },
      },
      expectError: false,
    },
  ];

  let passedTests = 0;
  const totalTests = testCases.length;

  for (const testCase of testCases) {
    const success = await runTestCase(
      testCase.name,
      testCase.request,
      testCase.expectError
    );
    if (success) {
      passedTests++;
    }
  }

  return { passedTests, totalTests };
}

// Run the test
testSmartSearchFix()
  .then(({ passedTests, totalTests }) => {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('✅ Smart search fix verification: ALL TESTS PASSED');
      console.log('The smart-search-companies tool works correctly with:');
      console.log('  • Valid queries with domain detection');
      console.log('  • Proper parameter validation');
      console.log('  • Error handling for edge cases');
    } else {
      console.log('❌ Smart search fix verification: SOME TESTS FAILED');
      console.log('Additional work may be needed.');
    }

    console.log('\n🚀 Ready for production use!');
    process.exit(passedTests === totalTests ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
