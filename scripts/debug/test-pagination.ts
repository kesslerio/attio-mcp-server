#!/usr/bin/env tsx
/**
 * Test the new offset-based pagination logic
 */

import 'dotenv/config';
import { initializeCleanupClient } from '../cleanup/core/client.js';
import { fetchAllResources } from '../cleanup/fetchers/generic.js';

async function testPagination() {
  console.log('🔍 Testing updated pagination logic...');
  
  const client = initializeCleanupClient();
  
  try {
    // Test with small page size to force multiple pages
    const result = await fetchAllResources(client, 'companies', {
      pageSize: 100, // Small page size to test pagination
      maxPages: 10,   // Limit to 10 pages for testing
      rateLimit: 100  // Faster rate limit for testing
    });
    
    console.log('\n📊 PAGINATION TEST RESULTS:');
    console.log(`   Total records fetched: ${result.records.length}`);
    console.log(`   Has more available: ${result.hasMore}`);
    console.log(`   Next cursor: ${result.nextCursor || 'none'}`);
    
    // Check if we got more than one page worth
    if (result.records.length > 100) {
      console.log('✅ SUCCESS: Pagination is working - got more than one page');
    } else {
      console.log('⚠️  WARNING: Only got one page worth of data');
    }
    
    // Test filtering on the results
    console.log('\n🔍 Testing filtering on paginated results...');
    const apiToken = process.env.WORKSPACE_API_UUID;
    if (!apiToken) {
      console.log('❌ No WORKSPACE_API_UUID set, skipping filter test');
      return;
    }
    
    let matchCount = 0;
    for (const record of result.records) {
      if (record.values?.created_by) {
        const createdByEntries = Array.isArray(record.values.created_by) 
          ? record.values.created_by 
          : [record.values.created_by];
        
        const matched = createdByEntries.some((entry: any) => 
          entry.referenced_actor_type === 'api-token' && 
          entry.referenced_actor_id === apiToken
        );
        
        if (matched) {
          matchCount++;
          console.log(`   Found match: ${record.id?.record_id} - ${record.values?.name?.[0]?.value}`);
        }
      }
    }
    
    console.log(`\n📋 Filtering results: ${matchCount} matches out of ${result.records.length} records`);
    
  } catch (error: any) {
    console.error('❌ Error testing pagination:', error.message);
  }
}

testPagination().catch(console.error);