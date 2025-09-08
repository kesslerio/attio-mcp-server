#!/usr/bin/env tsx
/**
 * Debug script to check the full response structure
 */

import 'dotenv/config';
import { initializeCleanupClient } from '../cleanup/core/client.js';

async function checkFullResponse() {
  const client = initializeCleanupClient();
  
  console.log('🔍 Checking full response structure...');
  
  try {
    const response = await client.post('/objects/companies/records/query', {
      limit: 2
    });
    
    console.log('\n📋 Full Response Structure:');
    console.log('Status:', response.status);
    console.log('Headers:', Object.keys(response.headers));
    console.log('Data keys:', Object.keys(response.data));
    console.log('Full response.data:', JSON.stringify(response.data, null, 2));
    
    console.log('\n🔍 Trying a larger request to see pagination...');
    const largeResponse = await client.post('/objects/companies/records/query', {
      limit: 600 // More than the 500 we were getting
    });
    
    console.log('Large response data keys:', Object.keys(largeResponse.data));
    console.log('Large response record count:', largeResponse.data.data?.length);
    console.log('Large response meta:', JSON.stringify(largeResponse.data.meta, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkFullResponse().catch(console.error);