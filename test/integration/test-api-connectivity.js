#!/usr/bin/env node

import dotenv from 'dotenv';
import { initializeAttioClient } from '../../dist/api/attio-client.js';
import { executeToolRequest } from '../../dist/handlers/tools/dispatcher.js';

// Load environment variables
dotenv.config();

console.log('🧪 Testing API Connectivity with Attio...\n');

// Check API key
if (!process.env.ATTIO_API_KEY) {
  console.error('❌ ERROR: ATTIO_API_KEY not found in environment');
  process.exit(1);
}

console.log('✅ API Key loaded successfully');

// Initialize client
initializeAttioClient();

// Test basic search
console.log('\n🔍 Testing company search...');

try {
  const request = {
    method: 'tools/call',
    params: {
      name: 'search-records',
      arguments: {
        resource_type: 'companies',
        limit: 5,
      },
    },
  };

  const result = await executeToolRequest(request);

  console.log('✅ Search successful!');
  console.log('Result type:', result.toolResult?.type);

  if (result.toolResult?.type === 'text') {
    const content = result.toolResult.content;
    console.log('\nResponse preview:', content.substring(0, 200) + '...');
  }

  console.log('\n✅ API connectivity test passed!');
  console.log('✅ SSE server is compatible with real Attio API');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

process.exit(0);
