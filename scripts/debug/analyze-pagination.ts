#!/usr/bin/env tsx
/**
 * Debug script to analyze pagination response structure
 */

import 'dotenv/config';
import { initializeCleanupClient } from '../cleanup/core/client.js';

async function analyzePagination() {
  const client = initializeCleanupClient();
  
  console.log('🔍 Analyzing pagination response structure...');
  
  try {
    const response = await client.post('/objects/companies/records/query', {
      limit: 5 // Small limit to see structure clearly
    });
    
    console.log('\n📋 Response Status:', response.status);
    console.log('📋 Response Structure:');
    console.log(JSON.stringify({
      data_count: response.data.data?.length,
      meta: response.data.meta,
      // Don't log full data, just count and structure
    }, null, 2));
    
    // Check if there's actually more data by requesting with an offset
    console.log('\n🔍 Checking if there are more records with different query...');
    
    const largeResponse = await client.post('/objects/companies/records/query', {
      limit: 1000 // Request more than 500 to see if API can return more
    });
    
    console.log('📋 Large query response:');
    console.log('   Records returned:', largeResponse.data.data?.length);
    console.log('   Meta:', JSON.stringify(largeResponse.data.meta, null, 2));
    
    // Try to check total count via a different method if available
    console.log('\n🔍 Checking company endpoint statistics...');
    
    // Get first few records to understand structure
    const sampleRecords = response.data.data.slice(0, 2);
    console.log('\n📝 Sample Records Structure:');
    sampleRecords.forEach((record: any, index: number) => {
      console.log(`\n   Record ${index + 1}:`);
      console.log(`     ID: ${record.id?.record_id || record.id}`);
      console.log(`     Name: ${record.values?.name?.[0]?.value || 'Unknown'}`);
      console.log(`     Created by type: ${record.values?.created_by?.[0]?.referenced_actor_type}`);
      console.log(`     Created by ID: ${record.values?.created_by?.[0]?.referenced_actor_id?.substring(0, 8)}...`);
    });
    
  } catch (error: any) {
    console.error('❌ Error analyzing pagination:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the analysis
analyzePagination().catch(console.error);