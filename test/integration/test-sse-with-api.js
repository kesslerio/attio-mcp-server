#!/usr/bin/env node

import { spawn } from 'child_process';
import dotenv from 'dotenv';
import http from 'http';

// Load environment variables
dotenv.config();

console.log('🧪 Testing SSE Server with Real API Integration...\n');

// Check API key
if (!process.env.ATTIO_API_KEY) {
  console.error('❌ ERROR: ATTIO_API_KEY not found in environment');
  process.exit(1);
}

console.log('✅ API Key loaded successfully');
console.log('✅ SSE Transport enabled:', process.env.ENABLE_SSE_TRANSPORT);

// Start the MCP server
console.log('\n📡 Starting MCP server with SSE transport...');
const server = spawn('node', ['dist/index.js'], {
  env: { ...process.env },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('Server:', output.trim());
  if (
    output.includes('Health server listening') ||
    output.includes('SSE transport enabled')
  ) {
    serverReady = true;
  }
});

server.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

// Wait for server to start
setTimeout(async () => {
  if (!serverReady) {
    console.log('\n⏳ Waiting for server to be ready...');
  }

  console.log('\n🔍 Testing SSE endpoint...');

  // Test SSE endpoint
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/sse/',
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
    },
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);

    if (res.statusCode === 200) {
      console.log('\n✅ SSE endpoint is responding!');

      res.on('data', (chunk) => {
        console.log('SSE Data:', chunk.toString());
      });

      // Close after 5 seconds
      setTimeout(() => {
        console.log('\n✅ Test completed successfully!');
        server.kill();
        process.exit(0);
      }, 5000);
    } else {
      console.error(`\n❌ Unexpected status code: ${res.statusCode}`);
      server.kill();
      process.exit(1);
    }
  });

  req.on('error', (e) => {
    console.error(`\n❌ Request error: ${e.message}`);
    server.kill();
    process.exit(1);
  });

  req.end();
}, 3000);

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  server.kill();
  process.exit(0);
});
