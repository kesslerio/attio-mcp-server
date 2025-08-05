const { updateCompanyAttribute } = require('../dist/objects/companies');

// Mock API client
const mockClient = {
  put: async (path, body) => {
    console.log('PUT request to:', path);
    console.log('Body:', JSON.stringify(body, null, 2));

    // Simulate the error mentioned in the issue
    if (!(body && body.data)) {
      throw new Error('Cannot convert undefined or null to object');
    }

    return {
      data: {
        type: 'object',
        api_slug: 'companies',
        id: {
          workspace_id: 'test',
          object_id: 'test-object',
          record_id: 'test-record',
        },
        values: {
          body_contouring: [
            {
              value: body.data.values.body_contouring[0].value,
            },
          ],
        },
      },
    };
  },
};

// Mock the global API client
global.apiClient = mockClient;

// Test the function
async function testUpdateCompanyAttribute() {
  try {
    console.log('Testing updateCompanyAttribute with null value...');
    const result = await updateCompanyAttribute(
      '7ac2ddbc-3ad2-4ef3-a977-19a191adc2ed',
      'body_contouring',
      null
    );
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testUpdateCompanyAttribute();
