import { initializeAttioClient } from '../dist/api/attio-client.js';
import {
  updateCompany,
  updateCompanyAttribute,
} from '../dist/objects/companies.js';

// Mock environment
process.env.NODE_ENV = 'test';

// Mock API client
class MockAPIClient {
  constructor() {
    this.requests = [];
  }

  async patch(path, payload) {
    console.log('PATCH request to:', path);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    this.requests.push({ method: 'PATCH', path, payload });

    // Validate the payload structure
    if (!(payload && payload.data && payload.data.values)) {
      throw new Error('Invalid payload structure - missing data.values');
    }

    // Check if the body_contouring field is present
    if (!Object.hasOwn(payload.data.values, 'body_contouring')) {
      throw new Error('body_contouring field is missing from the payload');
    }

    // Simulate successful response
    return {
      data: {
        data: {
          type: 'object',
          api_slug: 'companies',
          id: {
            workspace_id: 'test-workspace',
            object_id: 'test-object',
            record_id: '7ac2ddbc-3ad2-4ef3-a977-19a191adc2ed',
          },
          values: {
            name: [
              {
                value: 'Test Company',
              },
            ],
            body_contouring: payload.data.values.body_contouring,
            services: [
              {
                value: 'Test services',
              },
            ],
          },
        },
      },
    };
  }

  async get(path) {
    console.log('GET request to:', path);

    if (path.includes('/attributes')) {
      // Mock attributes metadata
      return {
        data: {
          data: [
            {
              api_slug: 'body_contouring',
              type: 'text',
              is_multiselect: false,
              title: 'Body Contouring',
            },
            {
              api_slug: 'services',
              type: 'text',
              is_multiselect: false,
              title: 'Services',
            },
            {
              api_slug: 'name',
              type: 'text',
              is_required: true,
              title: 'Name',
            },
          ],
        },
      };
    }

    // Default response
    return { data: { data: {} } };
  }
}

// Initialize mock client
const mockClient = new MockAPIClient();
initializeAttioClient({ apiKey: 'test-key' }, { client: mockClient });

// Test the fix
async function testUpdateCompanyAttribute() {
  console.log('=== Testing Issue #97 Fix ===\n');

  try {
    console.log('Test 1: Updating attribute to null value...');
    const result1 = await updateCompanyAttribute(
      '7ac2ddbc-3ad2-4ef3-a977-19a191adc2ed',
      'body_contouring',
      null
    );
    console.log('✅ Success: attribute updated to null\n');

    // Now test with a regular value
    console.log('Test 2: Updating attribute to string value...');
    const result2 = await updateCompanyAttribute(
      '7ac2ddbc-3ad2-4ef3-a977-19a191adc2ed',
      'body_contouring',
      'CoolSculpting, Liposuction'
    );
    console.log('✅ Success: attribute updated to string value\n');

    // Test with updateCompany for comparison
    console.log('Test 3: Updating multiple attributes including null...');
    const result3 = await updateCompany(
      '7ac2ddbc-3ad2-4ef3-a977-19a191adc2ed',
      {
        body_contouring: null,
        services: 'Updated services',
      }
    );
    console.log('✅ Success: multiple attributes updated including null\n');

    console.log('=== All Tests Passed! ===');
    console.log(`Total API requests made: ${mockClient.requests.length}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testUpdateCompanyAttribute();
