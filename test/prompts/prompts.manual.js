#!/usr/bin/env node

/**
 * Test script for MCP prompts functionality
 *
 * This script tests the prompts/list and prompts/get endpoints
 * by sending MCP requests to a running instance of the attio-mcp-server.
 */

const { spawn } = require('child_process');

/**
 * Waits for the server to be ready by watching for the health server startup message
 *
 * @param {import('child_process').ChildProcessWithoutNullStreams} serverProcess - Server process to monitor
 * @param {number} timeoutMs - Maximum time to wait for server to be ready
 * @returns {Promise<void>} Resolves when server is ready, rejects on timeout
 */
function waitForServerReady(serverProcess, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    // Set timeout for overall startup
    const timeout = setTimeout(() => {
      reject(new Error(`Server startup timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Listen for "ready" indicator in stderr
    serverProcess.stderr.on('data', (data) => {
      if (data.toString().includes('Health check server listening on port')) {
        clearTimeout(timeout);
        // Give it a small additional delay to ensure full readiness
        setTimeout(resolve, 500);
      }
    });
  });
}

/**
 * Sends a JSON-RPC request to the server
 *
 * @param {import('child_process').ChildProcessWithoutNullStreams} serverProcess - Server process
 * @param {object} request - Request object to send
 */
function sendRequest(serverProcess, request) {
  console.log(`Sending ${request.method} request...`);
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
}

/**
 * Validates response against expected schema
 *
 * @param {object} response - Response from the server
 * @param {string} requestId - Expected request ID in the response
 * @param {string} expectedType - Expected response type (list, get, error)
 * @returns {boolean} True if response is valid
 */
function validateResponse(response, requestId, expectedType) {
  if (response.id !== requestId) {
    console.error(`Expected response ID ${requestId}, got ${response.id}`);
    return false;
  }

  if (response.error) {
    if (expectedType === 'error') {
      return true;
    }
    console.error(`Received error response: ${response.error.message}`);
    return false;
  }

  if (!response.result) {
    console.error('Response missing result property');
    return false;
  }

  if (expectedType === 'list' && !Array.isArray(response.result.prompts)) {
    console.error('prompts/list response missing prompts array');
    return false;
  }

  if (expectedType === 'get' && !response.result.prompt) {
    console.error('prompts/get response missing prompt object');
    return false;
  }

  return true;
}

/**
 * Main test function - runs the test suite
 */
async function runTests() {
  console.log('Starting MCP prompts API tests...');

  // Set up test server connection
  const serverProcess = spawn(
    'node',
    [
      '--experimental-specifier-resolution=node',
      '--experimental-modules',
      'dist/index.js',
    ],
    { stdio: ['pipe', 'pipe', 'pipe'] }
  );

  // Setup error handling
  serverProcess.on('error', (err) => {
    console.error('Failed to start server process:', err);
    process.exit(1);
  });

  // Store test results
  const testResults = {
    listSuccess: false,
    getSuccess: false,
    errors: [],
  };

  try {
    // Wait for server to be ready
    await waitForServerReady(serverProcess);
    console.log('Server is ready, beginning tests...');

    // Test prompts/list endpoint
    const listRequest = {
      jsonrpc: '2.0',
      id: '1',
      method: 'prompts/list',
      params: {},
    };

    // Send the request
    sendRequest(serverProcess, listRequest);

    // Set up response processing
    return new Promise((resolve) => {
      // Listen for responses from server
      serverProcess.stdout.on('data', (data) => {
        const responses = data.toString().trim().split('\n');

        for (const responseText of responses) {
          try {
            const response = JSON.parse(responseText);
            console.log('Response received:');
            console.log(JSON.stringify(response, null, 2));

            // Check prompts/list response
            if (response.id === '1') {
              testResults.listSuccess = validateResponse(response, '1', 'list');

              // If prompts/list was successful, test prompts/get
              if (
                testResults.listSuccess &&
                response.result &&
                response.result.prompts
              ) {
                const promptId = response.result.prompts[0]?.id;

                if (promptId) {
                  console.log(
                    `\nSending prompts/get request for prompt ${promptId}...`
                  );
                  const getRequest = {
                    jsonrpc: '2.0',
                    id: '2',
                    method: 'prompts/get',
                    params: {
                      promptId,
                    },
                  };

                  sendRequest(serverProcess, getRequest);
                } else {
                  testResults.errors.push(
                    'No prompts returned from prompts/list'
                  );
                  finishTests();
                }
              }
            }

            // Check prompts/get response
            if (response.id === '2') {
              testResults.getSuccess = validateResponse(
                response,
                '2',
                response.error ? 'error' : 'get'
              );
              finishTests();
            }
          } catch (e) {
            console.error('Error parsing response:', e);
            console.error('Raw response:', responseText);
            testResults.errors.push(`JSON parse error: ${e.message}`);
          }
        }
      });

      // Log server errors to stderr but don't fail the test
      serverProcess.stderr.on('data', (data) => {
        console.error('Server log:', data.toString());
      });

      // Handle unexpected server exit
      serverProcess.on('close', (code) => {
        if (code !== 0) {
          testResults.errors.push(`Server exited with code ${code}`);
        }
        console.log(`Server process exited with code ${code}`);
        finishTests();
      });

      // Function to finish tests and report results
      function finishTests() {
        console.log('\n----- TEST RESULTS -----');
        console.log(
          `prompts/list: ${testResults.listSuccess ? '✅ PASS' : '❌ FAIL'}`
        );
        console.log(
          `prompts/get: ${testResults.getSuccess ? '✅ PASS' : '❌ FAIL'}`
        );

        if (testResults.errors.length > 0) {
          console.log('\nErrors:');
          testResults.errors.forEach((err, i) => {
            console.log(`  ${i + 1}. ${err}`);
          });
        }

        console.log('\nTest complete!');

        // Clean up server process
        serverProcess.kill();

        // Return results to the promise
        resolve({
          success: testResults.listSuccess && testResults.getSuccess,
          errors: testResults.errors,
        });
      }
    });
  } catch (error) {
    console.error('Test failed:', error);
    serverProcess.kill();
    return {
      success: false,
      errors: [error.message],
    };
  }
}

// Run tests and exit with appropriate code
runTests()
  .then((results) => {
    process.exit(results.success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Test runner error:', err);
    process.exit(1);
  });

// Handle script termination
process.on('SIGINT', () => {
  console.log('Tests interrupted by user');
  process.exit(2);
});
