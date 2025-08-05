/**
 * Manual test script for verifying industry-to-categories field mapping
 * Issue #176: Fix Incorrect Industry Field mapping
 *
 * This script tests:
 * 1. Creating a company with 'industry' field (should map to 'categories')
 * 2. Updating a company with 'industry' field
 * 3. Demonstrates the mapping between 'industry' and 'categories'
 *
 * To run this script:
 * 1. Set your Attio API key as environment variable:
 *    export ATTIO_API_KEY=your_api_key_here
 *
 * 2. Run the script with node:
 *    node test/manual/test-industry-mapping-fix.js
 */

import { initializeAttioClient } from '../../build/api/attio-client.js';
import {
  createCompany,
  deleteCompany,
  getCompanyDetails,
  updateCompany,
} from '../../build/objects/companies/index.js';
import { getAttributeSlug } from '../../build/utils/attribute-mapping/index.js';

// Initialize API client with key from environment
if (!process.env.ATTIO_API_KEY) {
  console.error('Please set ATTIO_API_KEY environment variable first');
  console.error('export ATTIO_API_KEY=your_api_key_here');
  process.exit(1);
}

initializeAttioClient({
  apiKey: process.env.ATTIO_API_KEY,
});

// Track companies to clean up at the end
const testCompanies = [];

// ANSI color codes for clearer console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper to show field values in company response
function logCompanyFields(company) {
  console.log(
    `${colors.bright}Company:${colors.reset} ${
      company.values?.name?.[0]?.value || 'Unnamed'
    }`
  );
  console.log(`${colors.cyan}ID:${colors.reset} ${company.id?.record_id}`);

  // Log all values
  if (company.values) {
    console.log(`${colors.bright}Fields:${colors.reset}`);
    Object.entries(company.values).forEach(([field, values]) => {
      if (values === null) {
        console.log(`  ${colors.yellow}${field}:${colors.reset} null`);
      } else if (Array.isArray(values)) {
        const valueStr = values.map((v) => JSON.stringify(v.value)).join(', ');
        console.log(`  ${colors.yellow}${field}:${colors.reset} ${valueStr}`);
      }
    });
  }
  console.log(''); // Empty line for spacing
}

// Main test function
async function runTests() {
  console.log(
    `${colors.bright}${colors.blue}=== Testing Industry-to-Categories Mapping Fix (Issue #176) ===${colors.reset}\n`
  );

  try {
    // Test 1: Verify attribute mapping directly
    console.log(
      `${colors.bright}Test 1: Verify Attribute Mapping${colors.reset}`
    );
    console.log(`Mapping 'industry' -> '${getAttributeSlug('industry')}'`);
    console.log(`Mapping 'Industry' -> '${getAttributeSlug('Industry')}'`);
    console.log(
      `Mapping 'industry type' -> '${getAttributeSlug('industry type')}'`
    );
    console.log('\n');

    // Test 2: Create a company with industry field
    console.log(
      `${colors.bright}Test 2: Create Company with Industry Field${colors.reset}`
    );
    const timestamp = Date.now();
    const companyData = {
      name: `Industry Mapping Test ${timestamp}`,
      industry: 'Technology Services',
    };

    console.log(`Creating company with data: ${JSON.stringify(companyData)}`);
    const company = await createCompany(companyData);
    testCompanies.push(company.id.record_id);

    console.log(`${colors.green}Company created successfully${colors.reset}`);
    logCompanyFields(company);

    // Test 3: Update a company with industry field
    console.log(
      `${colors.bright}Test 3: Update Company with Industry Field${colors.reset}`
    );
    const updateData = {
      industry: 'Financial Services',
    };

    console.log(`Updating company with data: ${JSON.stringify(updateData)}`);
    const updatedCompany = await updateCompany(
      company.id.record_id,
      updateData
    );

    console.log(`${colors.green}Company updated successfully${colors.reset}`);
    logCompanyFields(updatedCompany);

    // Test 4: Get fresh company details to verify the mapping
    console.log(
      `${colors.bright}Test 4: Get Fresh Company Details${colors.reset}`
    );
    const freshDetails = await getCompanyDetails(company.id.record_id);

    console.log(`${colors.green}Company details retrieved${colors.reset}`);
    logCompanyFields(freshDetails);

    // Test 5: Multiple values test
    console.log(
      `${colors.bright}Test 5: Multiple Industry Values Test${colors.reset}`
    );
    const multiValueCompany = await createCompany({
      name: `Multi-Industry Test ${timestamp}`,
      industry: ['Healthcare', 'Biotechnology'],
    });
    testCompanies.push(multiValueCompany.id.record_id);

    console.log(`${colors.green}Multi-value company created${colors.reset}`);
    logCompanyFields(multiValueCompany);

    // Explain the results
    console.log(
      `${colors.bright}${colors.blue}=== Test Results ====${colors.reset}\n`
    );

    const hasCategories =
      freshDetails.values?.categories?.[0]?.value === 'Financial Services';
    const hasIndustry =
      freshDetails.values?.industry?.[0]?.value === 'Financial Services';

    if (hasCategories) {
      console.log(
        `${colors.green}✓ Success! The 'industry' field was mapped to 'categories' field${colors.reset}`
      );
    } else if (hasIndustry) {
      console.log(
        `${colors.yellow}⚠ The value was set on 'industry' field which exists in this Attio account${colors.reset}`
      );
      console.log(
        'This is still a valid outcome as it means the API accepted the field.'
      );
    } else {
      console.log(
        `${colors.red}❌ Neither 'categories' nor 'industry' fields were set properly${colors.reset}`
      );
    }
  } catch (error) {
    console.error(`${colors.red}Error during tests:${colors.reset}`, error);
  } finally {
    // Cleanup test companies
    console.log(`\n${colors.dim}Cleaning up test companies...${colors.reset}`);

    for (const id of testCompanies) {
      try {
        await deleteCompany(id);
        console.log(`${colors.dim}Deleted company ${id}${colors.reset}`);
      } catch (error) {
        console.error(
          `${colors.dim}Failed to delete company ${id}:${colors.reset}`,
          error.message
        );
      }
    }

    console.log(
      `\n${colors.bright}${colors.blue}=== Tests Complete ====${colors.reset}`
    );
  }
}

// Run the tests
runTests().catch((error) => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
