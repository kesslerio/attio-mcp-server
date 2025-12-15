#!/usr/bin/env node
/**
 * Test whether Attio API accepts:
 * A) Slug-style strings like "potential_customer"
 * B) UUID option IDs like "8f6ac4eb-6ab6-40be-909a-29042d3674e7"
 * C) Both
 */
import { getAttioClient } from '../dist/api/attio-client.js';

async function testSlugVsUuid() {
  try {
    const client = getAttioClient();

    console.log(
      '🧪 Testing: Does Attio API accept slug-style option values?\n'
    );

    // Get a test company
    const searchResponse = await client.post(
      '/objects/companies/records/query',
      {
        limit: 1,
      }
    );

    const testCompany = searchResponse.data?.data?.[0];
    if (!testCompany) {
      console.log('❌ No test company found');
      process.exit(1);
    }

    const recordId = testCompany.id.record_id;
    console.log(`Using test company: ${recordId}\n`);

    // Test 1: Try updating with slug-style string
    console.log('Test 1: Updating lead_type with SLUG "potential_customer"...');
    try {
      await client.patch(`/objects/companies/records/${recordId}`, {
        data: {
          values: {
            lead_type: ['potential_customer'], // Slug-style
          },
        },
      });
      console.log('✅ SUCCESS: API accepted slug "potential_customer"\n');
    } catch (error) {
      console.log('❌ FAILED: API rejected slug');
      console.log(
        `   Error: ${error.response?.data?.message || error.message}\n`
      );
    }

    // Test 2: Try updating with UUID
    console.log(
      'Test 2: Updating lead_type with UUID "8f6ac4eb-6ab6-40be-909a-29042d3674e7"...'
    );
    try {
      await client.patch(`/objects/companies/records/${recordId}`, {
        data: {
          values: {
            lead_type: ['8f6ac4eb-6ab6-40be-909a-29042d3674e7'], // UUID
          },
        },
      });
      console.log('✅ SUCCESS: API accepted UUID\n');
    } catch (error) {
      console.log('❌ FAILED: API rejected UUID');
      console.log(
        `   Error: ${error.response?.data?.message || error.message}\n`
      );
    }

    console.log('📋 Conclusion:');
    console.log('   Check which format was accepted above.');
    console.log(
      '   This determines if our generated slugs are purely documentation'
    );
    console.log('   or if they could actually be used in API calls.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testSlugVsUuid();
