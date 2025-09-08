#!/usr/bin/env tsx
/**
 * Debug script to check for specific company IDs
 */

import 'dotenv/config';
import { initializeCleanupClient } from '../cleanup/core/client.js';

const TARGET_COMPANY_IDS = [
  '371a36d2-7ccc-4919-8596-00f022be4334',
  '1cd9b0f2-47da-459f-8a19-9a8baadc589c'
];

async function checkSpecificCompanies() {
  const client = initializeCleanupClient();
  
  console.log('🔍 Checking for specific company IDs...');
  console.log('Target IDs:', TARGET_COMPANY_IDS);
  
  try {
    // Search through multiple pages to find these specific companies
    let page = 0;
    let hasMore = true;
    let foundCompanies: any[] = [];
    
    while (hasMore && page < 20) { // Check up to 10,000 records (20 * 500)
      console.log(`\n📄 Fetching page ${page + 1}...`);
      
      const response = await client.post('/objects/companies/records/query', {
        limit: 500,
        ...(page > 0 ? { cursor: (response as any)?.data?.meta?.next_cursor } : {})
      });
      
      if (response.status !== 200) {
        console.error('❌ API request failed:', response.status);
        break;
      }
      
      const companies = response.data.data;
      console.log(`   Found ${companies.length} companies on page ${page + 1}`);
      
      // Check for our target IDs
      for (const company of companies) {
        const recordId = company.id?.record_id || company.id;
        
        if (TARGET_COMPANY_IDS.includes(recordId)) {
          foundCompanies.push({
            id: recordId,
            name: company.values?.name?.[0]?.value || 'Unknown',
            created_by: company.values?.created_by,
            page: page + 1
          });
          
          console.log(`✅ FOUND TARGET: ${recordId} on page ${page + 1}`);
          console.log('   Name:', company.values?.name?.[0]?.value || 'Unknown');
          console.log('   Created by:', JSON.stringify(company.values?.created_by, null, 2));
        }
      }
      
      // Check pagination
      hasMore = !!response.data.meta?.next_cursor;
      if (!hasMore) {
        console.log('   No more pages available');
      }
      
      page++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 SEARCH SUMMARY:`);
    console.log(`   Total pages checked: ${page}`);
    console.log(`   Found target companies: ${foundCompanies.length}/${TARGET_COMPANY_IDS.length}`);
    
    if (foundCompanies.length > 0) {
      console.log('\n🎯 TARGET COMPANIES FOUND:');
      foundCompanies.forEach((company, index) => {
        console.log(`\n   ${index + 1}. ${company.name} (${company.id})`);
        console.log(`      Page: ${company.page}`);
        console.log(`      Created by: ${JSON.stringify(company.created_by)}`);
      });
    } else {
      console.log('\n⚠️  NONE of the target companies were found in the search!');
      console.log('   This suggests they may have been:');
      console.log('   - Already deleted');
      console.log('   - Located beyond page 20 (10,000 records)');
      console.log('   - In a different endpoint or workspace');
    }
    
    // Check if we hit the page limit
    if (page >= 20 && hasMore) {
      console.log('\n⚠️  Search stopped at page limit (20 pages = 10,000 records)');
      console.log('   There may be more companies beyond this point');
    }
    
  } catch (error: any) {
    console.error('❌ Error checking companies:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the check
checkSpecificCompanies().catch(console.error);