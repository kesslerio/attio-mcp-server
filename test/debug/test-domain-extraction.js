/**
 * Test script to validate domain extraction functionality
 */

import dotenv from 'dotenv';

dotenv.config();

// Test the domain extraction functionality
async function testDomainExtraction() {
  console.log('🧪 Testing Domain Extraction Functionality');
  console.log('==========================================');

  try {
    // Test 1: Domain extraction from website URL
    console.log('1️⃣ Testing domain extraction from validator...');
    const { CompanyValidator } = await import(
      '../../dist/validators/company-validator.js'
    );

    // Test cases for domain extraction
    const testCases = [
      {
        name: 'Basic HTTPS URL',
        input: {
          name: 'Test Company',
          website: 'https://www.theplasticsdoc.com',
        },
        expectedDomain: 'theplasticsdoc.com',
      },
      {
        name: 'HTTP URL with path',
        input: { name: 'Another Company', website: 'http://example.com/path' },
        expectedDomain: 'example.com',
      },
      {
        name: 'URL without www',
        input: { name: 'Clean URL Company', website: 'https://cleanurl.io' },
        expectedDomain: 'cleanurl.io',
      },
      {
        name: 'URL with subdomain',
        input: {
          name: 'Subdomain Company',
          website: 'https://app.subdomain.com',
        },
        expectedDomain: 'app.subdomain.com',
      },
      {
        name: 'URL without protocol',
        input: { name: 'No Protocol Company', website: 'noprotocol.com' },
        expectedDomain: 'noprotocol.com',
      },
      {
        name: 'Existing domains (should not overwrite)',
        input: {
          name: 'Manual Domain Company',
          website: 'https://example.com',
          domains: ['manual-domain.com'],
        },
        expectedDomain: 'manual-domain.com', // Should NOT extract from website
        shouldNotOverwrite: true,
      },
      {
        name: 'No website (should not add domains)',
        input: { name: 'No Website Company' },
        expectedDomain: null,
      },
      {
        name: 'Invalid website URL',
        input: { name: 'Invalid URL Company', website: 'not-a-valid-url' },
        expectedDomain: null,
      },
    ];

    console.log('Testing domain extraction logic:');
    for (const testCase of testCases) {
      try {
        const result = CompanyValidator.extractDomainFromWebsite({
          ...testCase.input,
        });
        const extractedDomain = result.domains ? result.domains[0] : null;

        if (testCase.shouldNotOverwrite) {
          // Should preserve existing domains
          const success =
            JSON.stringify(result.domains) ===
            JSON.stringify(testCase.input.domains);
          console.log(
            `  ✅ ${testCase.name}: ${
              success ? 'PASS' : 'FAIL'
            } - preserved manual domains`
          );
        } else if (testCase.expectedDomain === null) {
          // Should not add domains field
          const success = !result.domains;
          console.log(
            `  ${success ? '✅' : '❌'} ${testCase.name}: ${
              success ? 'PASS' : 'FAIL'
            } - no domain extracted`
          );
        } else {
          // Should extract expected domain
          const success = extractedDomain === testCase.expectedDomain;
          console.log(
            `  ${success ? '✅' : '❌'} ${testCase.name}: ${
              success ? 'PASS' : 'FAIL'
            } - extracted "${extractedDomain}"`
          );
        }
      } catch (error) {
        console.log(`  ❌ ${testCase.name}: ERROR - ${error.message}`);
      }
    }

    // Test 2: Full validation flow
    console.log('\\n2️⃣ Testing full validation flow...');

    const testAttributes = {
      name: 'The Plastics Doc',
      website: 'https://www.theplasticsdoc.com',
      description:
        'Plastic surgery and medical spa practice led by board-certified plastic surgeon Dr. Samuel Salcedo.',
    };

    console.log('Input attributes:', JSON.stringify(testAttributes, null, 2));

    const validated = await CompanyValidator.validateCreate(testAttributes);
    console.log('Validated attributes:', JSON.stringify(validated, null, 2));

    if (validated.domains && validated.domains.includes('theplasticsdoc.com')) {
      console.log(
        '✅ Domain extraction in validation: PASS - theplasticsdoc.com extracted'
      );
    } else {
      console.log(
        '❌ Domain extraction in validation: FAIL - domain not extracted'
      );
    }

    // Test 3: Test actual company creation
    console.log('\\n3️⃣ Testing actual company creation...');

    const { createCompany } = await import(
      '../../dist/objects/companies/basic.js'
    );

    const uniqueName = `Domain Test Company ${Date.now()}`;
    const companyData = {
      name: uniqueName,
      website: 'https://www.test-domain-extraction.com',
      description: 'Testing domain extraction functionality',
    };

    console.log('Creating company with:', JSON.stringify(companyData, null, 2));

    const createdCompany = await createCompany(companyData);
    console.log('\\nCreated company response:');
    console.log('- ID:', createdCompany.id?.record_id);
    console.log('- Name:', createdCompany.values?.name?.[0]?.value);
    console.log('- Website:', createdCompany.values?.website?.[0]?.value);
    console.log('- Domains:', createdCompany.values?.domains);

    // Check if domain was automatically populated
    if (createdCompany.values?.domains) {
      const domains = Array.isArray(createdCompany.values.domains)
        ? createdCompany.values.domains
        : [createdCompany.values.domains];

      // Attio returns domains in object format: { domain: 'example.com', root_domain: 'example.com', ... }
      const hasDomain = domains.some((d) => {
        const domainValue = d?.domain || d?.value || d;
        return domainValue === 'test-domain-extraction.com';
      });

      if (hasDomain) {
        console.log(
          '✅ End-to-end domain extraction: PASS - domain populated in Attio'
        );
      } else {
        console.log(
          '❌ End-to-end domain extraction: FAIL - domain not found in response'
        );
        console.log('   Expected: test-domain-extraction.com');
        console.log(
          '   Actual domains:',
          domains.map((d) => d?.domain || d?.value || d)
        );
      }
    } else {
      console.log(
        '❌ End-to-end domain extraction: FAIL - no domains field found'
      );
    }

    // Clean up - delete the test company
    const { deleteCompany } = await import(
      '../../dist/objects/companies/basic.js'
    );
    try {
      await deleteCompany(createdCompany.id.record_id);
      console.log('✅ Test company cleaned up successfully');
    } catch (error) {
      console.log(
        '⚠️  Warning: Failed to clean up test company:',
        error.message
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
testDomainExtraction().catch(console.error);
