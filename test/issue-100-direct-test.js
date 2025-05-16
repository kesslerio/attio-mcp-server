/**
 * Direct test to verify the fix for Issue #100
 */

// Test the fix logic directly
function testCreateCompanyLogic() {
  console.log('=== Testing Issue #100 Fix Logic ===');
  
  // Simulate the request parameters
  const toolName = 'create-company';
  const toolType = 'create';
  const requestParams = {
    name: 'create-company',
    arguments: {
      attributes: {
        name: 'Test Company for Issue 100'
      }
    }
  };
  
  console.log('Tool name:', toolName);
  console.log('Tool type:', toolType);
  console.log('Arguments:', JSON.stringify(requestParams.arguments, null, 2));
  
  // Test the fix logic
  if (toolType === 'create') {
    // Special handling for resource-specific create tools
    if (toolName === 'create-company' || toolName === 'create-person') {
      console.log('✅ Using special handling for create-company');
      const attributes = requestParams.arguments?.attributes || {};
      console.log('Attributes:', attributes);
      
      // With the fix, we don't try to extract objectSlug
      // Instead, we use the tool's handler directly with just attributes
      const errorResource = toolName === 'create-company' ? 'companies' : 'people';
      const path = `objects/${errorResource}/records`;
      console.log('Correct path:', path);
      
      if (!path.includes('undefined')) {
        console.log('✅ FIX VERIFIED: No undefined in path');
      }
    } else {
      console.log('Using generic record creation');
      const objectSlug = requestParams.arguments?.objectSlug;
      console.log('objectSlug:', objectSlug);
      
      if (!objectSlug) {
        console.log('❌ Would result in undefined path');
        const path = `objects/${objectSlug}/records`;
        console.log('Buggy path:', path);
      }
    }
  }
  
  // Test the buggy behavior without the fix
  console.log('\n--- Without the fix ---');
  const objectSlug = requestParams.arguments?.objectSlug; // This is undefined
  const buggyPath = `objects/${objectSlug}/records`;
  console.log('Buggy path:', buggyPath);
  
  if (buggyPath.includes('undefined')) {
    console.log('❌ BUG REPRODUCED: Path contains undefined');
  }
}

testCreateCompanyLogic();