#!/usr/bin/env node

import dotenv from 'dotenv';
import http from 'http';

// Load environment variables
dotenv.config();

console.log('🧪 Testing OpenAI Endpoints Integration...\n');

// Check API key
if (!process.env.ATTIO_API_KEY) {
  console.error('❌ ERROR: ATTIO_API_KEY not found in environment');
  process.exit(1);
}

console.log('✅ API Key loaded successfully');

// Test helper function
async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data),
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data,
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Test 1: Get OpenAI tools list
async function testToolsList() {
  console.log('\n📋 Test 1: Get OpenAI tools list');

  try {
    const response = await makeRequest('/openai/tools');

    if (response.status === 200) {
      console.log('✅ Tools list endpoint working');
      console.log(
        'Available tools:',
        response.data.tools.map((t) => t.name).join(', ')
      );
      return true;
    }
    console.error('❌ Failed to get tools list:', response.status);
    return false;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Test 2: Execute search tool
async function testSearchTool() {
  console.log('\n🔍 Test 2: Execute search tool');

  try {
    const response = await makeRequest('/openai/execute', 'POST', {
      tool: 'search',
      arguments: {
        query: 'test',
      },
    });

    if (response.status === 200) {
      console.log('✅ Search tool executed successfully');
      console.log(`Found ${response.data.result.length} results`);

      if (response.data.result.length > 0) {
        const firstResult = response.data.result[0];
        console.log('\nFirst result:', {
          id: firstResult.id,
          title: firstResult.title,
          text: firstResult.text.substring(0, 100) + '...',
        });
      }
      return true;
    }
    console.error('❌ Search failed:', response.status, response.data);
    return false;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Test 3: Execute fetch tool
async function testFetchTool(recordId = null) {
  console.log('\n📄 Test 3: Execute fetch tool');

  // If no record ID provided, get one from search
  if (!recordId) {
    console.log('Getting a record ID from search first...');
    try {
      const searchResponse = await makeRequest('/openai/execute', 'POST', {
        tool: 'search',
        arguments: { query: 'test' },
      });

      if (
        searchResponse.status === 200 &&
        searchResponse.data.result.length > 0
      ) {
        recordId = searchResponse.data.result[0].id;
        console.log(`Using record ID: ${recordId}`);
      } else {
        console.error('❌ Could not get a record ID from search');
        return false;
      }
    } catch (error) {
      console.error('❌ Error getting record ID:', error.message);
      return false;
    }
  }

  try {
    const response = await makeRequest('/openai/execute', 'POST', {
      tool: 'fetch',
      arguments: {
        id: recordId,
      },
    });

    if (response.status === 200) {
      console.log('✅ Fetch tool executed successfully');
      const result = response.data.result;
      console.log('\nFetched record:', {
        id: result.id,
        title: result.title,
        text: result.text.substring(0, 100) + '...',
        hasMetadata: !!result.metadata,
      });

      if (result.metadata) {
        console.log(
          'Metadata keys:',
          Object.keys(result.metadata).slice(0, 5).join(', ') + '...'
        );
      }
      return true;
    }
    console.error('❌ Fetch failed:', response.status, response.data);
    return false;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Test 4: Test error handling
async function testErrorHandling() {
  console.log('\n⚠️  Test 4: Error handling');

  // Test missing parameters
  try {
    const response = await makeRequest('/openai/execute', 'POST', {
      tool: 'search',
      arguments: {}, // Missing query
    });

    if (response.status === 400) {
      console.log('✅ Correctly handles missing parameters');
      console.log('Error response:', response.data.error);
    } else {
      console.error('❌ Should have returned 400 for missing parameters');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }

  // Test unknown tool
  try {
    const response = await makeRequest('/openai/execute', 'POST', {
      tool: 'unknown-tool',
      arguments: {},
    });

    if (response.status === 400) {
      console.log('✅ Correctly handles unknown tool');
      return true;
    }
    console.error('❌ Should have returned 400 for unknown tool');
    return false;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Test 5: CORS headers
async function testCorsHeaders() {
  console.log('\n🌐 Test 5: CORS headers');

  try {
    const response = await makeRequest('/openai/tools');

    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
    ];

    let allHeadersPresent = true;
    for (const header of corsHeaders) {
      if (response.headers[header]) {
        console.log(`✅ ${header}: ${response.headers[header]}`);
      } else {
        console.log(`❌ Missing ${header}`);
        allHeadersPresent = false;
      }
    }

    return allHeadersPresent;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting OpenAI endpoints integration tests...');
  console.log('Make sure the MCP server is running on port 3000\n');

  const results = {
    toolsList: await testToolsList(),
    search: await testSearchTool(),
    fetch: await testFetchTool(),
    errorHandling: await testErrorHandling(),
    cors: await testCorsHeaders(),
  };

  // Summary
  console.log('\n📊 Test Results Summary:');
  let passed = 0;
  let total = 0;

  for (const [test, result] of Object.entries(results)) {
    total++;
    if (result) passed++;
    console.log(`${result ? '✅' : '❌'} ${test}`);
  }

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All OpenAI endpoint tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

// Run the tests
runTests().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
