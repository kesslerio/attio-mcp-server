/**
 * Manual test script for boolean attribute updates
 *
 * This script demonstrates and tests the string-to-boolean conversion for Attio
 * company attributes using both the low-level and high-level APIs.
 *
 * Usage:
 *   export ATTIO_API_KEY=your_api_key
 *   node test/manual/boolean-update-test.js
 *
 * Or provide a specific company ID to update an existing company:
 *   node test/manual/boolean-update-test.js comp_12345
 */
import { getAttioClient } from '../../src/api/attio-client.js';
import {
  createCompany,
  deleteCompany,
  getCompanyDetails,
  updateCompany,
  updateCompanyAttribute,
} from '../../src/objects/companies/basic.js';
import { convertToBoolean } from '../../src/utils/attribute-mapping/attribute-mappers.js';

// Set API key from environment
const API_KEY = process.env.ATTIO_API_KEY;
if (!API_KEY) {
  console.error('Error: ATTIO_API_KEY environment variable is required');
  process.exit(1);
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Test company data
const TEST_COMPANY_NAME = `Boolean Test Company ${Date.now()}`;
const BOOLEAN_FIELD_NAMES = ['is_active', 'uses_body_composition'];

// Function to display string-to-boolean conversion results
function testStringBooleanConversion() {
  console.log(
    `\n${colors.cyan}Testing string-to-boolean conversion:${colors.reset}`
  );

  const testValues = [
    // Truthy values
    'true',
    'TRUE',
    'yes',
    'YES',
    'y',
    'Y',
    '1',
    // Falsy values
    'false',
    'FALSE',
    'no',
    'NO',
    'n',
    'N',
    '0',
    // Boolean values
    true,
    false,
    // Number values
    1,
    0,
  ];

  testValues.forEach((value) => {
    const result = convertToBoolean(value);
    const valueType = typeof value;
    const resultColor = result ? colors.green : colors.red;

    console.log(
      `${colors.yellow}${value}${colors.reset} (${valueType}) → ${resultColor}${result}${colors.reset}`
    );
  });
}

// Function to create a test company with boolean fields
async function createTestCompany() {
  console.log(`\n${colors.cyan}Creating test company:${colors.reset}`);

  try {
    const company = await createCompany({
      name: TEST_COMPANY_NAME,
      is_active: true,
      uses_body_composition: false,
    });

    console.log(
      `${colors.green}Created company:${colors.reset} ${company.id.record_id}`
    );
    console.log(`Name: ${company.values.name[0].value}`);
    console.log(`is_active: ${company.values.is_active[0].value}`);
    console.log(
      `uses_body_composition: ${company.values.uses_body_composition[0].value}`
    );

    return company;
  } catch (error) {
    console.error(
      `${colors.red}Error creating company:${colors.reset}`,
      error.message
    );
    throw error;
  }
}

// Function to test updating a single boolean attribute with a string value
async function testSingleBooleanUpdate(companyId) {
  console.log(
    `\n${colors.cyan}Testing single boolean attribute update:${colors.reset}`
  );

  try {
    // Update is_active with string 'false'
    console.log(`Updating 'is_active' to string value 'false'...`);
    const result = await updateCompanyAttribute(
      companyId,
      'is_active',
      'false'
    );

    // Display result
    console.log(`${colors.green}Update successful:${colors.reset}`);
    console.log(`is_active: ${result.values.is_active[0].value}`);

    // Verify the type in the response
    const isBoolean = typeof result.values.is_active[0].value === 'boolean';
    console.log(
      `Value is boolean: ${
        isBoolean ? colors.green + 'Yes' : colors.red + 'No'
      }${colors.reset}`
    );

    return result;
  } catch (error) {
    console.error(
      `${colors.red}Error updating boolean attribute:${colors.reset}`,
      error.message
    );
    throw error;
  }
}

// Function to test updating multiple boolean attributes with string values
async function testMultipleBooleanUpdate(companyId) {
  console.log(
    `\n${colors.cyan}Testing multiple boolean attribute update:${colors.reset}`
  );

  try {
    // Update multiple boolean fields with string values
    console.log(
      `Updating 'is_active' to 'yes' and 'uses_body_composition' to 'no'...`
    );
    const result = await updateCompany(companyId, {
      is_active: 'yes',
      uses_body_composition: 'no',
    });

    // Display result
    console.log(`${colors.green}Update successful:${colors.reset}`);
    console.log(`is_active: ${result.values.is_active[0].value}`);
    console.log(
      `uses_body_composition: ${result.values.uses_body_composition[0].value}`
    );

    // Verify the types in the response
    const isActiveIsBoolean =
      typeof result.values.is_active[0].value === 'boolean';
    const usesBodyCompositionIsBoolean =
      typeof result.values.uses_body_composition[0].value === 'boolean';

    console.log(
      `'is_active' is boolean: ${
        isActiveIsBoolean ? colors.green + 'Yes' : colors.red + 'No'
      }${colors.reset}`
    );
    console.log(
      `'uses_body_composition' is boolean: ${
        usesBodyCompositionIsBoolean ? colors.green + 'Yes' : colors.red + 'No'
      }${colors.reset}`
    );

    return result;
  } catch (error) {
    console.error(
      `${colors.red}Error updating multiple boolean attributes:${colors.reset}`,
      error.message
    );
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log(
    `${colors.magenta}===== Boolean Attribute Update Test =====\n${colors.reset}`
  );

  // Check if a company ID was provided as argument
  const providedCompanyId = process.argv[2];
  let testCompany;
  let companyId;

  if (providedCompanyId) {
    companyId = providedCompanyId;
    console.log(
      `${colors.yellow}Using provided company ID: ${companyId}${colors.reset}`
    );

    // Verify the company exists
    try {
      testCompany = await getCompanyDetails(companyId);
      console.log(`Found company: ${testCompany.values.name[0].value}`);
    } catch (error) {
      console.error(
        `${colors.red}Error: Company not found with ID ${companyId}${colors.reset}`
      );
      process.exit(1);
    }
  } else {
    // Create a new test company
    testCompany = await createTestCompany();
    companyId = testCompany.id.record_id;
  }

  // Test the string-to-boolean conversion utility
  testStringBooleanConversion();

  // Test updating a single boolean attribute
  await testSingleBooleanUpdate(companyId);

  // Test updating multiple boolean attributes
  await testMultipleBooleanUpdate(companyId);

  // Clean up test company if we created it
  if (!providedCompanyId) {
    console.log(`\n${colors.cyan}Cleaning up test company...${colors.reset}`);
    try {
      await deleteCompany(companyId);
      console.log(
        `${colors.green}Deleted test company: ${companyId}${colors.reset}`
      );
    } catch (error) {
      console.error(
        `${colors.red}Error deleting test company:${colors.reset}`,
        error.message
      );
    }
  }

  console.log(`\n${colors.magenta}===== Test Complete =====\n${colors.reset}`);
}

// Run the tests
runTests().catch((error) => {
  console.error(`${colors.red}Test failed with error:${colors.reset}`, error);
  process.exit(1);
});
