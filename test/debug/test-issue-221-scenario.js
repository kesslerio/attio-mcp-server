/**
 * Test script for GitHub Issue #221 - Specific failing scenario
 * Tests the exact case described in the issue
 */

import dotenv from 'dotenv';

dotenv.config();

async function testIssue221Scenario() {
  console.log('🐛 Testing GitHub Issue #221 Specific Scenario');
  console.log('==============================================');
  console.log('Scenario: Creating company with website but no explicit domain');
  console.log(
    'Expected: System should auto-extract domain to prevent duplicates'
  );
  console.log('');

  try {
    // Import the MCP dispatcher to test the exact tool call
    const { executeToolRequest } = await import(
      '../../dist/handlers/tools/dispatcher.js'
    );

    // Test the exact failing request from the issue
    const issueRequest = {
      method: 'tools/call',
      params: {
        name: 'create-company',
        arguments: {
          attributes: {
            name: 'The Plastics Doc',
            website: 'https://www.theplasticsdoc.com',
            description:
              'Plastic surgery and medical spa practice led by board-certified plastic surgeon Dr. Samuel Salcedo. Specializes in breast augmentation, liposuction, body contouring, and comprehensive aesthetic treatments in Corona, CA.',
          },
        },
      },
    };

    console.log('📤 Testing exact MCP request from issue:');
    console.log(JSON.stringify(issueRequest, null, 2));
    console.log('');

    // Execute the request
    const result = await executeToolRequest(issueRequest);

    console.log('📥 MCP Response:');
    console.log('Status:', result.isError ? 'ERROR' : 'SUCCESS');
    console.log('Content:', JSON.stringify(result.content, null, 2));
    console.log('');

    if (result.isError) {
      console.log('❌ Company creation failed');
      return;
    }

    // Extract company ID from the response
    const responseText = result.content[0]?.text || '';
    const idMatch = responseText.match(/ID: ([^)]+)/);

    if (!idMatch) {
      console.log('❌ Could not extract company ID from response');
      return;
    }

    const companyId = idMatch[1];
    console.log('✅ Company created successfully with ID:', companyId);

    // Now verify the company has the domain field populated
    console.log('');
    console.log('🔍 Verifying domain field was populated...');

    const { getCompanyDetails } = await import(
      '../../dist/objects/companies/basic.js'
    );
    const companyDetails = await getCompanyDetails(companyId);

    console.log('Company details:');
    console.log('- Name:', companyDetails.values?.name?.[0]?.value);
    console.log('- Website:', companyDetails.values?.website?.[0]?.value);
    console.log('- Domains:', companyDetails.values?.domains);

    // Check if domain was automatically extracted
    let domainFound = false;
    if (companyDetails.values?.domains) {
      const domains = Array.isArray(companyDetails.values.domains)
        ? companyDetails.values.domains
        : [companyDetails.values.domains];

      // Look for theplasticsdoc.com in various formats
      domainFound = domains.some((d) => {
        const domainValue = d?.domain || d?.value || d;
        return (
          domainValue === 'theplasticsdoc.com' ||
          domainValue?.includes('theplasticsdoc.com')
        );
      });

      console.log('- Domain extracted:', domainFound ? 'YES ✅' : 'NO ❌');
      console.log(
        '- Domain values found:',
        domains.map((d) => d?.domain || d?.value || d)
      );
    } else {
      console.log('- Domain extracted: NO ❌ (domains field missing)');
    }

    // Test duplicate prevention by creating the same company again
    console.log('');
    console.log('🔄 Testing duplicate prevention...');
    console.log('Attempting to create the same company again...');

    try {
      const duplicateResult = await executeToolRequest(issueRequest);

      if (duplicateResult.isError) {
        console.log('✅ Duplicate creation prevented (API returned error)');
        console.log('Error message:', duplicateResult.content[0]?.text);
      } else {
        // Check if Attio created a new record or found existing
        const duplicateText = duplicateResult.content[0]?.text || '';
        const duplicateIdMatch = duplicateText.match(/ID: ([^)]+)/);

        if (duplicateIdMatch) {
          const duplicateId = duplicateIdMatch[1];
          if (duplicateId === companyId) {
            console.log(
              '✅ Duplicate prevention: PASS - Same company returned'
            );
          } else {
            console.log('❌ Duplicate prevention: FAIL - New company created');
            console.log('  Original ID:', companyId);
            console.log('  Duplicate ID:', duplicateId);

            // Clean up the duplicate
            const { deleteCompany } = await import(
              '../../dist/objects/companies/basic.js'
            );
            try {
              await deleteCompany(duplicateId);
              console.log('✅ Duplicate company cleaned up');
            } catch (error) {
              console.log('⚠️  Warning: Failed to clean up duplicate company');
            }
          }
        }
      }
    } catch (duplicateError) {
      console.log('✅ Duplicate creation prevented (exception thrown)');
      console.log('Exception:', duplicateError.message);
    }

    // Clean up the original test company
    console.log('');
    console.log('🧹 Cleaning up test data...');
    const { deleteCompany } = await import(
      '../../dist/objects/companies/basic.js'
    );
    try {
      await deleteCompany(companyId);
      console.log('✅ Test company cleaned up successfully');
    } catch (error) {
      console.log(
        '⚠️  Warning: Failed to clean up test company:',
        error.message
      );
    }

    // Final assessment
    console.log('');
    console.log('📊 Issue #221 Resolution Assessment:');
    console.log('=====================================');

    if (domainFound) {
      console.log('✅ RESOLVED: Domain extraction working correctly');
      console.log('   - Website URLs are automatically parsed');
      console.log('   - Domain field is populated during company creation');
      console.log('   - Attio can now use domain for uniqueness checks');
      console.log('');
      console.log('🎉 Issue #221 has been successfully resolved!');
    } else {
      console.log('❌ NOT RESOLVED: Domain extraction still failing');
      console.log('   - Domain field is not being populated');
      console.log('   - Risk of duplicate company creation remains');
      console.log('');
      console.log(
        '💡 Check implementation and ensure domain extraction logic is working'
      );
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testIssue221Scenario().catch(console.error);
