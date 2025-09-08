#!/usr/bin/env tsx
/**
 * Search thoroughly for the specific missing company IDs with improved pagination
 */

import 'dotenv/config';
import { initializeCleanupClient } from '../cleanup/core/client.js';
import { fetchAllResources } from '../cleanup/fetchers/generic.js';

const TARGET_COMPANY_IDS = [
  '371a36d2-7ccc-4919-8596-00f022be4334',
  '1cd9b0f2-47da-459f-8a19-9a8baadc589c'
];

async function findMissingCompanies() {
  console.log('🔍 Searching for missing companies with improved pagination...');
  console.log('Target IDs:', TARGET_COMPANY_IDS);
  
  const client = initializeCleanupClient();
  
  try {
    // Use improved pagination to search more thoroughly
    const result = await fetchAllResources(client, 'companies', {
      pageSize: 500,   // Standard page size
      maxPages: 100,   // Search up to 50,000 records  
      rateLimit: 200   // Reasonable rate limit
    });
    
    console.log(`\n📊 COMPREHENSIVE SEARCH RESULTS:`);
    console.log(`   Total records searched: ${result.records.length}`);
    console.log(`   Has more available: ${result.hasMore}`);
    
    // Search for target companies
    const foundCompanies: any[] = [];
    let totalChecked = 0;
    
    for (const record of result.records) {
      const recordId = record.id?.record_id || record.id;
      totalChecked++;
      
      if (TARGET_COMPANY_IDS.includes(recordId)) {
        foundCompanies.push({
          id: recordId,
          name: record.values?.name?.[0]?.value || 'Unknown',
          created_by: record.values?.created_by,
          position: totalChecked
        });
        
        console.log(`✅ FOUND TARGET: ${recordId} at position ${totalChecked}`);
        console.log(`   Name: ${record.values?.name?.[0]?.value || 'Unknown'}`);
        console.log(`   Created by: ${JSON.stringify(record.values?.created_by, null, 2)}`);
      }
    }
    
    console.log(`\n🎯 FINAL SEARCH SUMMARY:`);
    console.log(`   Records searched: ${totalChecked}`);
    console.log(`   Target companies found: ${foundCompanies.length}/${TARGET_COMPANY_IDS.length}`);
    
    if (foundCompanies.length === 0) {
      console.log('\n❌ NONE of the target companies were found!');
      console.log('   Possible explanations:');
      console.log('   1. They were already deleted');
      console.log('   2. They exist beyond the search limit');
      console.log('   3. They are in a different workspace');
      console.log('   4. The IDs are incorrect');
      
      if (result.hasMore) {
        console.log(`\n⚠️  There are more than ${totalChecked} companies in the system.`);
        console.log('   Consider increasing maxPages to search further.');
      }
    } else {
      console.log('\n🎉 SUCCESS! Found target companies:');
      foundCompanies.forEach((company, index) => {
        console.log(`\n   ${index + 1}. ${company.name} (${company.id})`);
        console.log(`      Position in search: ${company.position}`);
        console.log(`      API token match: ${JSON.stringify(company.created_by)}`);
      });
    }
    
    // Also check what API token filtering would return
    console.log('\n🔍 Checking API token filtering...');
    const apiToken = process.env.WORKSPACE_API_UUID;
    if (apiToken) {
      let apiTokenMatches = 0;
      
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
            apiTokenMatches++;
          }
        }
      }
      
      console.log(`   API token matches: ${apiTokenMatches} out of ${totalChecked} records`);
      console.log(`   This is what the cleanup script would find and process`);
    }
    
  } catch (error: any) {
    console.error('❌ Error searching for companies:', error.message);
  }
}

findMissingCompanies().catch(console.error);