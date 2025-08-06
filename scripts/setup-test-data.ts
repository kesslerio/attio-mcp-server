#!/usr/bin/env node
/**
 * Setup test data for integration tests
 *
 * This script creates test records in your Attio workspace that can be used
 * for integration testing. It outputs the IDs in a format ready for .env.test
 */

import dotenv from 'dotenv';
import {
  getAttioClient,
  initializeAttioClient,
} from '../src/api/attio-client.js';
import { createCompany } from '../src/objects/companies/index.js';
import { createPerson } from '../src/objects/people/index.js';

// Load environment variables
dotenv.config();

async function setupTestData() {
  console.log('🚀 Attio MCP Server - Test Data Setup\n');

  // Check for API key
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: No ATTIO_API_KEY found in environment variables');
    console.error('Please set your API key in .env file');
    process.exit(1);
  }

  // Initialize API client
  try {
    initializeAttioClient(apiKey);
  } catch (error) {
    console.error('❌ Error initializing API client:', error);
    process.exit(1);
  }

  const timestamp = Date.now();
  const results: Record<string, string> = {};

  try {
    // Create test company
    console.log('📦 Creating test company...');
    const companyResult = await createCompany({
      name: `E2E_TEST_Company_${timestamp}`,
      domains: [`e2e-test-${timestamp}.com`],
      website: `https://e2e-test-${timestamp}.com`,
      description: `Integration test company created at ${new Date().toISOString()}`,
    });

    results.TEST_COMPANY_ID = companyResult.id?.record_id || '';
    console.log(`✅ Created company: ${results.TEST_COMPANY_ID}`);

    // Create test person
    console.log('👤 Creating test person...');
    const personResult = await createPerson({
      name: {
        first_name: `E2E_First_${timestamp}`,
        last_name: 'E2E_Last',
        full_name: `E2E_First_${timestamp} E2E_Last`,
      },
      email_addresses: [`e2e-test-${timestamp}@example.com`],
    });

    results.TEST_PERSON_ID = personResult.id?.record_id || '';
    console.log(`✅ Created person: ${results.TEST_PERSON_ID}`);

    // Get lists
    console.log('📋 Fetching available lists...');
    const client = getAttioClient();
    const listsResponse = await client.get('/lists');
    const lists = listsResponse.data.data || [];

    if (lists.length > 0) {
      results.TEST_LIST_ID = lists[0].id?.list_id || '';
      console.log(`✅ Found list: ${lists[0].name} (${results.TEST_LIST_ID})`);

      // Try to find an empty list
      if (lists.length > 1) {
        results.TEST_EMPTY_LIST_ID = lists[lists.length - 1].id?.list_id || '';
        console.log(
          `✅ Found additional list: ${lists[lists.length - 1].name} (${results.TEST_EMPTY_LIST_ID})`
        );
      }
    } else {
      console.warn('⚠️  No lists found in workspace');
    }

    // Output results
    console.log('\n✨ Test data created successfully!\n');
    console.log('Add the following to your .env.test file:');
    console.log('='.repeat(50));

    for (const [key, value] of Object.entries(results)) {
      console.log(`${key}=${value}`);
    }

    console.log('='.repeat(50));
    console.log(
      '\n💡 Tip: These test records will be automatically cleaned up after test runs'
    );
    console.log(
      '💡 To manually clean up, delete the records from your Attio workspace'
    );
  } catch (error) {
    console.error('\n❌ Error creating test data:', error);
    process.exit(1);
  }
}

// Run the setup
setupTestData().catch(console.error);
