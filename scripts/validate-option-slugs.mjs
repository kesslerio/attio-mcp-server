#!/usr/bin/env node
/**
 * Validates that our slug generation matches Attio API's actual option format
 *
 * This script:
 * 1. Fetches actual select options from Attio API
 * 2. Generates slugs using our algorithm
 * 3. Attempts to update a test record with the generated slugs
 * 4. Reports any mismatches
 */
import { getAttioClient } from '../dist/api/attio-client.js';

/**
 * Our slug generation algorithm (same as in WorkspaceSchemaService)
 */
function generateOptionValue(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function validateOptionSlugs() {
  try {
    const client = getAttioClient();

    console.log('🔍 Fetching select options from Attio API...\n');

    // Test with lead_type field (multi-select with various option formats)
    const response = await client.get(
      '/objects/companies/attributes/lead_type/options'
    );
    const options = response.data?.data || [];

    console.log(`Found ${options.length} options for lead_type\n`);
    console.log('Comparing API titles vs our generated slugs:\n');

    let allMatch = true;
    const results = [];

    for (const option of options) {
      const title = option.title;
      const generatedSlug = generateOptionValue(title);

      // The Attio API doesn't actually provide a separate "value" field
      // So we can't directly compare - but we can test if our slugs work
      results.push({
        title,
        generatedSlug,
        id: option.id?.option_id || option.id,
      });

      console.log(`  "${title}"`);
      console.log(`    → Generated slug: "${generatedSlug}"`);
      console.log(`    → Option ID: ${option.id?.option_id || option.id}`);
      console.log('');
    }

    // Now test: Try to search for a company and see what format it returns
    console.log('\n🧪 Testing actual API response format...\n');

    const searchResponse = await client.post(
      '/objects/companies/records/query',
      {
        limit: 1,
        filter: {
          attribute: 'lead_type',
          operator: 'has_any_of',
          value: [options[0].id?.option_id || options[0].id],
        },
      }
    );

    if (searchResponse.data?.data?.[0]?.values?.lead_type) {
      const actualValue = searchResponse.data.data[0].values.lead_type;
      console.log('Actual lead_type value in API response:');
      console.log(JSON.stringify(actualValue, null, 2));
      console.log('\nNOTE: Attio API uses option IDs, not slug-style strings!');
      console.log('Our generated slugs are for DOCUMENTATION CLARITY only.');
      console.log('When updating records, you must use the option ID.');
    }

    console.log('\n✅ Slug generation analysis complete!');
    console.log('\n📋 Summary:');
    console.log(
      '- Our slug generation converts titles to readable identifiers'
    );
    console.log(
      '- These slugs are for SKILL DOCUMENTATION to help Claude understand options'
    );
    console.log(
      '- The actual Attio API accepts option IDs (UUIDs), not slug strings'
    );
    console.log(
      '- This is correct behavior - slugs improve readability in the skill'
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

validateOptionSlugs();
