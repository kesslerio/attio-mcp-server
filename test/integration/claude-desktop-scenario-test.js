/**
 * Test to replicate the exact Claude Desktop scenario
 * This mimics what happens in Claude Desktop when using update-company-attribute
 */

import dotenv from 'dotenv';
import { initializeAttioClient } from '../dist/api/attio-client.js';
import {
  getCompanyAttributes,
  updateCompanyAttribute,
} from '../dist/objects/companies.js';

dotenv.config();

// Initialize the API client
initializeAttioClient(process.env.ATTIO_API_KEY);

// Test company ID from the Claude Desktop chat
const TEST_COMPANY_ID = '7ac2ddbc-3ad2-4ef3-a977-19a191adc2ed';

async function testClaudeDesktopScenario() {
  console.log('Replicating Claude Desktop scenario...\n');

  try {
    // Step 1: Get current attributes to show what's there
    console.log('Step 1: Getting current company attributes...');
    const attributesResult = await getCompanyAttributes(TEST_COMPANY_ID);
    console.log(`Company: ${attributesResult.company}`);
    console.log(`Available attributes: ${attributesResult.attributes.length}`);
    const hasBodyContouring =
      attributesResult.attributes.includes('body_contouring');
    console.log(`Has body_contouring attribute: ${hasBodyContouring}`);

    if (hasBodyContouring) {
      const bodyContouringValue = await getCompanyAttributes(
        TEST_COMPANY_ID,
        'body_contouring'
      );
      console.log(
        `Current body_contouring value: ${JSON.stringify(
          bodyContouringValue.value
        )}`
      );
    }

    console.log('\n---\n');

    // Step 2: Attempt to update body_contouring with null
    console.log(
      'Step 2: Attempting to update body_contouring with null (Claude Desktop scenario)...'
    );
    console.log('Request:');
    console.log(
      JSON.stringify(
        {
          companyId: TEST_COMPANY_ID,
          attributeName: 'body_contouring',
          attributeValue: null,
        },
        null,
        2
      )
    );

    console.log('\nExecuting update...');

    try {
      const result = await updateCompanyAttribute(
        TEST_COMPANY_ID,
        'body_contouring',
        null
      );
      console.log(
        'Response: Company updated:',
        result.values?.name?.[0]?.value || 'Unknown'
      );
      console.log(`ID: ${result.id?.record_id}`);

      // Check the value after update
      const afterValue = await getCompanyAttributes(
        TEST_COMPANY_ID,
        'body_contouring'
      );
      console.log(
        `\nVerification - body_contouring after update: ${JSON.stringify(
          afterValue.value
        )}`
      );

      console.log(
        '\n✅ SUCCESS: update-company-attribute worked with null value'
      );
    } catch (error) {
      console.error('Response: Error executing code:', error.message);
      if (error.response?.data) {
        console.error(
          'API Error:',
          JSON.stringify(error.response.data, null, 2)
        );
      }
      console.log(
        '\n❌ FAILED: The exact error from Claude Desktop chat would appear here'
      );
    }

    console.log('\n---\n');

    // Step 3: Show the workaround (using update-company instead)
    console.log('Step 3: Workaround using update-company...');
    const { updateCompany } = await import('../dist/objects/companies.js');

    try {
      const workaroundResult = await updateCompany(TEST_COMPANY_ID, {
        body_contouring:
          'coolsculpting, coolsculpting elite, liposuction, KYBELLA, tummy tuck (abdominoplasty), body sculpting/body shaping',
      });
      console.log(
        'Company updated:',
        workaroundResult.values?.name?.[0]?.value || 'Unknown'
      );
      console.log(`ID: ${workaroundResult.id?.record_id}`);
      console.log(
        '\n✅ This is the workaround that worked in the Claude Desktop chat'
      );
    } catch (error) {
      console.error('Error:', error.message);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testClaudeDesktopScenario();
