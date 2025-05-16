/**
 * Test for the improved implementation of Issue #100 fix
 */
import { 
  RESOURCE_SPECIFIC_CREATE_TOOLS, 
  RESOURCE_TYPE_MAP,
  VALIDATION_RULES 
} from '../dist/handlers/tool-configs/resource-specific-tools.js';

console.log('=== Testing Improved Issue #100 Fix ===');

// Test the configuration
console.log('\nResource-specific tools configuration:');
console.log('Tools:', RESOURCE_SPECIFIC_CREATE_TOOLS);
console.log('Resource map:', RESOURCE_TYPE_MAP);

// Test validation rules
console.log('\n--- Testing Validation Rules ---');

// Test company validation
const companyValidation1 = VALIDATION_RULES['create-company']({ name: 'Test Company' });
console.log('Valid company:', companyValidation1 || 'No error');

const companyValidation2 = VALIDATION_RULES['create-company']({});
console.log('Invalid company:', companyValidation2);

// Test person validation  
const personValidation1 = VALIDATION_RULES['create-person']({ name: 'John Doe' });
console.log('Valid person (name):', personValidation1 || 'No error');

const personValidation2 = VALIDATION_RULES['create-person']({ email: 'john@example.com' });
console.log('Valid person (email):', personValidation2 || 'No error');

const personValidation3 = VALIDATION_RULES['create-person']({});
console.log('Invalid person:', personValidation3);

// Test resource type mapping
console.log('\n--- Testing Resource Type Mapping ---');
RESOURCE_SPECIFIC_CREATE_TOOLS.forEach(tool => {
  const resourceType = RESOURCE_TYPE_MAP[tool];
  console.log(`${tool} -> ${resourceType}`);
  console.log(`Path: objects/${resourceType}/records`);
});

// Simulate the improved flow
console.log('\n--- Simulating Improved Flow ---');
const toolName = 'create-company';

// Check if tool is resource-specific
if (RESOURCE_SPECIFIC_CREATE_TOOLS.includes(toolName)) {
  console.log('✅ Tool is resource-specific');
  
  // Get resource type from map
  const resourceType = RESOURCE_TYPE_MAP[toolName];
  console.log('Resource type:', resourceType);
  
  // Validate attributes
  const attributes = { name: 'Test Company' };
  const validationError = VALIDATION_RULES[toolName](attributes);
  
  if (validationError) {
    console.log('❌ Validation failed:', validationError);
  } else {
    console.log('✅ Validation passed');
    
    // Construct correct path
    const path = `objects/${resourceType}/records`;
    console.log('Correct path:', path);
    
    if (!path.includes('undefined')) {
      console.log('✅ No undefined in path - Fix verified!');
    }
  }
}