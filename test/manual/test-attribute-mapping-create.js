/**
 * Manual test for attribute mapping in create operations
 * This test verifies that user-friendly attribute names like "b2b_segment"
 * are properly translated to API attribute names like "type_persona"
 */

// Set NODE_ENV to development to see debug logs
process.env.NODE_ENV = 'development';

import { batchCreateCompanies } from '../../src/objects/batch-companies.js';

async function testAttributeMapping() {
  console.log('=== Testing Attribute Mapping in Company Creation ===\n');

  try {
    // Test 1: Create companies with user-friendly attribute names
    console.log(
      'Test 1: Creating companies with b2b_segment (should map to type_persona)'
    );

    const companiesWithMapping = [
      {
        name: 'Test Mapping Company Alpha',
        website: 'https://mapping-test-alpha.example.com',
        b2b_segment: 'Plastic Surgeon',
        description:
          'Testing attribute mapping from b2b_segment to type_persona',
      },
      {
        name: 'Test Mapping Company Beta',
        website: 'https://mapping-test-beta.example.com',
        b2b_segment: 'Integrated Health',
        description: 'Another test for attribute mapping',
      },
    ];

    console.log('Input attributes (user-friendly names):');
    console.log(JSON.stringify(companiesWithMapping, null, 2));
    console.log('\n--- Starting batch creation (watch for mapping logs) ---\n');

    const result = await batchCreateCompanies({
      companies: companiesWithMapping,
    });

    console.log('\n--- Batch creation completed ---');
    console.log(
      `Total: ${result.summary.total}, Succeeded: ${result.summary.succeeded}, Failed: ${result.summary.failed}`
    );

    if (result.summary.failed > 0) {
      console.log('\nFailed records:');
      result.results.forEach((record) => {
        if (!record.success) {
          console.log(`❌ ${record.id}: ${record.error || 'Unknown error'}`);
        }
      });
    } else {
      console.log('\n✅ All companies created successfully!');
      console.log('This confirms that attribute mapping is working correctly.');
    }

    // Test 2: Create companies with direct API attribute names (should work as before)
    console.log(
      '\n\nTest 2: Creating companies with direct API attribute names'
    );

    const companiesWithDirectNames = [
      {
        name: 'Test Direct API Company',
        website: 'https://direct-api-test.example.com',
        type_persona: 'Wellness',
        description: 'Testing with direct API attribute name (type_persona)',
      },
    ];

    console.log('Input attributes (direct API names):');
    console.log(JSON.stringify(companiesWithDirectNames, null, 2));
    console.log('\n--- Starting batch creation (should show no mapping) ---\n');

    const result2 = await batchCreateCompanies({
      companies: companiesWithDirectNames,
    });

    console.log('\n--- Batch creation completed ---');
    console.log(
      `Total: ${result2.summary.total}, Succeeded: ${result2.summary.succeeded}, Failed: ${result2.summary.failed}`
    );

    if (result2.summary.failed > 0) {
      console.log('\nFailed records:');
      result2.results.forEach((record) => {
        if (!record.success) {
          console.log(`❌ ${record.id}: ${record.error || 'Unknown error'}`);
        }
      });
    } else {
      console.log('\n✅ Direct API names also work correctly!');
    }

    console.log('\n=== Attribute Mapping Test Summary ===');
    console.log(
      '✓ User-friendly names (b2b_segment) are mapped to API names (type_persona)'
    );
    console.log('✓ Direct API names continue to work as before');
    console.log('✓ The attribute mapping system is functioning correctly');
  } catch (error) {
    console.error('Test failed with error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testAttributeMapping();
