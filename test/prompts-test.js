#!/usr/bin/env node

/**
 * Test script for MCP prompts functionality
 * 
 * This script tests the prompts/list and prompts/get endpoints
 * by sending MCP requests to a running instance of the attio-mcp-server.
 */

import { spawn } from 'child_process';

// Set up test server connection
const serverProcess = spawn(
  'node',
  ['--experimental-specifier-resolution=node', '--experimental-modules', 'dist/index.js'],
  { stdio: ['pipe', 'pipe', 'pipe'] }
);

// Wait for server to start
setTimeout(() => {
  console.log('Sending prompts/list request...');
  
  // Test prompts/list endpoint
  const listRequest = {
    jsonrpc: '2.0',
    id: '1',
    method: 'prompts/list',
    params: {}
  };
  
  // Send request to the server
  serverProcess.stdin.write(JSON.stringify(listRequest) + '\n');
  
  // Listen for response
  serverProcess.stdout.on('data', (data) => {
    const responses = data.toString().trim().split('\n');
    
    for (const responseText of responses) {
      try {
        const response = JSON.parse(responseText);
        console.log('Response received:');
        console.log(JSON.stringify(response, null, 2));
        
        // If this was a successful prompts/list response, test prompts/get
        if (response.id === '1' && response.result && response.result.prompts) {
          const promptId = response.result.prompts[0]?.id;
          
          if (promptId) {
            console.log(`\nSending prompts/get request for prompt ${promptId}...`);
            const getRequest = {
              jsonrpc: '2.0',
              id: '2',
              method: 'prompts/get',
              params: {
                promptId
              }
            };
            
            serverProcess.stdin.write(JSON.stringify(getRequest) + '\n');
          }
        }
        
        // If this was the get response, we're done
        if (response.id === '2') {
          console.log('Test complete!');
          setTimeout(() => {
            serverProcess.kill();
            process.exit(0);
          }, 500);
        }
      } catch (e) {
        console.error('Error parsing response:', e);
        console.error('Raw response:', responseText);
      }
    }
  });
  
  // Handle errors
  serverProcess.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });
  
  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
}, 2000);

// Handle script termination
process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit(0);
});