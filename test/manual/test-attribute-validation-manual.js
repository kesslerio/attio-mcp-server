/**
 * Manual test script for attribute validation
 *
 * This script tests the attribute validation functionality with real data
 * against the Attio API. It showcases how type validation and conversion
 * works for different attribute types.
 *
 * To run:
 * 1. Set environment variable: export ATTIO_API_KEY=your_key_here
 * 2. Run: node test/manual/test-attribute-validation-manual.js
 */

import * as dotenv from 'dotenv';
import { getAttioClient } from '../../src/api/attio-client.js';
import { ResourceType } from '../../src/types/attio.js';
import { CompanyValidator } from '../../src/validators/company-validator.js';

// Load environment variables
dotenv.config();

// Check for API key
if (!process.env.ATTIO_API_KEY) {
  console.error('Error: ATTIO_API_KEY environment variable not set');
  process.exit(1);
}

// Test company prefix for identifying test data
const TEST_PREFIX = 'ValidationTest_';

// Generate a unique name for test company
const generateUniqueName = () =>
  `${TEST_PREFIX}${Math.floor(Math.random() * 100_000)}`;

// Create a company record
async function createCompany(data) {
  try {
    console.log('Creating company with data:', JSON.stringify(data, null, 2));

    // First validate the data
    const validated = await CompanyValidator.validateCreate(data);
    console.log('Validated data:', JSON.stringify(validated, null, 2));

    // Create the company
    const api = getAttioClient();
    const response = await api.post(
      `/objects/${ResourceType.COMPANIES}/records`,
      { values: validated }
    );

    const companyId = response.data.data.id.record_id;
    console.log(`Company created with ID: ${companyId}`);

    return companyId;
  } catch (error) {
    console.error('Failed to create company:', error.message);
    if (error.response?.data) {
      console.error(
        'API response:',
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw error;
  }
}

// Update a company record
async function updateCompany(companyId, data) {
  try {
    console.log(
      `Updating company ${companyId} with data:`,
      JSON.stringify(data, null, 2)
    );

    // First validate the data
    const validated = await CompanyValidator.validateUpdate(companyId, data);
    console.log('Validated data:', JSON.stringify(validated, null, 2));

    // Update the company
    const api = getAttioClient();
    const response = await api.patch(
      `/objects/${ResourceType.COMPANIES}/records/${companyId}`,
      { values: validated }
    );

    console.log(`Company ${companyId} updated successfully`);

    return response.data.data;
  } catch (error) {
    console.error(`Failed to update company ${companyId}:`, error.message);
    if (error.response?.data) {
      console.error(
        'API response:',
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw error;
  }
}

// Update a single attribute
async function updateAttribute(companyId, attributeName, attributeValue) {
  try {
    console.log(
      `Updating attribute ${attributeName} for company ${companyId} with value:`,
      attributeValue
    );

    // First validate the value
    const validatedValue = await CompanyValidator.validateAttributeUpdate(
      companyId,
      attributeName,
      attributeValue
    );
    console.log('Validated value:', validatedValue);

    // Update the attribute
    const api = getAttioClient();
    const response = await api.patch(
      `/objects/${ResourceType.COMPANIES}/records/${companyId}`,
      { values: { [attributeName]: validatedValue } }
    );

    console.log(
      `Attribute ${attributeName} updated successfully for company ${companyId}`
    );

    return response.data.data;
  } catch (error) {
    console.error(
      `Failed to update attribute ${attributeName} for company ${companyId}:`,
      error.message
    );
    if (error.response?.data) {
      console.error(
        'API response:',
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw error;
  }
}

// Get company details
async function getCompany(companyId) {
  try {
    const api = getAttioClient();
    const response = await api.get(
      `/objects/${ResourceType.COMPANIES}/records/${companyId}`
    );
    return response.data.data;
  } catch (error) {
    console.error(`Failed to get company ${companyId}:`, error.message);
    throw error;
  }
}

// Delete a company
async function deleteCompany(companyId) {
  try {
    const api = getAttioClient();
    await api.delete(`/objects/${ResourceType.COMPANIES}/records/${companyId}`);
    console.log(`Company ${companyId} deleted successfully`);
  } catch (error) {
    console.error(`Failed to delete company ${companyId}:`, error.message);
  }
}

// Clean up all test companies
async function cleanupTestCompanies() {
  try {
    console.log('Cleaning up test companies...');

    const api = getAttioClient();
    const response = await api.get(
      `/objects/${ResourceType.COMPANIES}/records?limit=100`
    );

    const companies = response.data.data || [];
    const testCompanies = companies.filter(
      (company) =>
        company.values.name &&
        Array.isArray(company.values.name) &&
        company.values.name[0] &&
        typeof company.values.name[0].value === 'string' &&
        company.values.name[0].value.startsWith(TEST_PREFIX)
    );

    console.log(`Found ${testCompanies.length} test companies to clean up`);

    for (const company of testCompanies) {
      await deleteCompany(company.id.record_id);
    }

    console.log('Cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup test companies:', error.message);
  }
}

// Run tests
async function runTests() {
  let companyId;

  try {
    console.log('----- Testing Attribute Validation -----');

    // Test 1: Create company with mixed attribute types
    console.log('\n1. Testing company creation with type conversion:');
    companyId = await createCompany({
      name: generateUniqueName(),
      company_size: '500', // String should be converted to number
      is_customer: 'yes', // String should be converted to boolean
      founded_date: '2023-01-15', // Date string
      website: 'https://example.com',
      description: 'Test company created by validation test script',
    });

    // Get company details to verify
    const company = await getCompany(companyId);
    console.log('\nCreated company details:', JSON.stringify(company, null, 2));

    // Test 2: Update company with type conversion
    console.log('\n2. Testing company update with type conversion:');
    await updateCompany(companyId, {
      company_size: '1000', // String should be converted to number
      is_customer: 0, // Number should be converted to boolean (false)
    });

    // Get updated company details
    const updatedCompany = await getCompany(companyId);
    console.log(
      '\nUpdated company details:',
      JSON.stringify(updatedCompany, null, 2)
    );

    // Test 3: Update single attribute with type conversion
    console.log('\n3. Testing single attribute update with type conversion:');
    await updateAttribute(companyId, 'company_size', '1500');

    // Get updated company details
    const finalCompany = await getCompany(companyId);
    console.log(
      '\nFinal company details:',
      JSON.stringify(finalCompany, null, 2)
    );

    console.log('\n4. Testing invalid attribute values:');
    try {
      const invalidData = {
        company_size: 'not-a-number', // Invalid for number field
      };

      await CompanyValidator.validateUpdate(companyId, invalidData);
      console.log('ERROR: Validation should have failed but did not!');
    } catch (error) {
      console.log('Success: Validation correctly rejected invalid data:');
      console.log(error.message);
    }

    // Clean up the test company
    if (companyId) {
      await deleteCompany(companyId);
    }

    // Optional: Clean up all test companies
    const cleanupAll = process.argv.includes('--cleanup-all');
    if (cleanupAll) {
      await cleanupTestCompanies();
    }

    console.log('\n----- All tests completed successfully -----');
  } catch (error) {
    console.error('\nTest failed:', error);

    // Clean up even if tests fail
    if (companyId) {
      await deleteCompany(companyId);
    }

    process.exit(1);
  }
}

// Run the tests
runTests();
