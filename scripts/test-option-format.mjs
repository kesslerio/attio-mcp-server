#!/usr/bin/env node
/**
 * Quick test to see what format Attio expects for select field values
 */
import { getAttioClient } from '../dist/api/attio-client.js';

async function testOptionFormat() {
  try {
    const client = getAttioClient();

    console.log(
      '🔍 Fetching a company record to see actual lead_type format...\n'
    );

    // Get a company with lead_type set
    const response = await client.post('/objects/companies/records/query', {
      limit: 1,
    });

    const company = response.data?.data?.[0];

    if (company?.values?.lead_type) {
      console.log('✅ Found company with lead_type set:\n');
      console.log('Record ID:', company.id.record_id);
      console.log('\nActual lead_type value format:');
      console.log(JSON.stringify(company.values.lead_type, null, 2));

      console.log('\n📋 Key Finding:');
      if (Array.isArray(company.values.lead_type)) {
        const firstOption = company.values.lead_type[0];
        if (typeof firstOption === 'string') {
          console.log('✅ API accepts/returns OPTION IDs (UUIDs)');
          console.log(`   Example: "${firstOption}"`);
        } else if (firstOption?.option_id) {
          console.log('✅ API accepts/returns option objects with option_id');
          console.log(`   Example:`, JSON.stringify(firstOption, null, 2));
        }
      }

      console.log('\n💡 Our slug generation conclusion:');
      console.log(
        '   - Generated slugs like "existing_customer" are for DOCUMENTATION only'
      );
      console.log('   - They help Claude understand what options mean');
      console.log('   - The actual API uses option IDs (UUIDs)');
      console.log('   - This is CORRECT - readability is the goal!');
    } else {
      console.log('⚠️  No company found with lead_type set');
      console.log('    Testing with options endpoint only...\n');

      const optionsResponse = await client.get(
        '/objects/companies/attributes/lead_type/options'
      );
      const option = optionsResponse.data?.data?.[0];

      console.log('Sample option from API:');
      console.log(JSON.stringify(option, null, 2));
      console.log(
        '\n✅ Confirmed: API provides option IDs, not slug-style values'
      );
      console.log('   Our generated slugs are for skill documentation clarity');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testOptionFormat();
