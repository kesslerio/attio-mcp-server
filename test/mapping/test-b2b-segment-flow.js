/**
 * Test B2B segment mapping flow
 */
const { translateAttributeNamesInFilters } = require('./dist/utils/attribute-mapping/index.js');
const { advancedSearchObject } = require('./dist/api/attio-operations.js');
const { ResourceType, FilterConditionType } = require('./dist/types/attio.js');

// Mock the API client to see what data is being sent
const originalPost = require('./dist/api/attio-client.js').getAttioClient;
let mockClient = null;

require('./dist/api/attio-client.js').getAttioClient = function() {
  if (!mockClient) {
    mockClient = {
      ...originalPost(),
      post: function(path, data) {
        console.log('[MOCK API] POST Request:', {
          path,
          data: JSON.stringify(data, null, 2)
        });
        
        // Check for untranslated attribute
        const dataStr = JSON.stringify(data);
        if (dataStr.includes('b2b_segment')) {
          console.error('[MOCK API] WARNING: Untranslated attribute "b2b_segment" found in request!');
        }
        
        // Mock error response for b2b_segment
        if (dataStr.includes('b2b_segment')) {
          const error = new Error('Unknown attribute slug: b2b_segment');
          error.response = { 
            status: 400, 
            data: { error: 'Unknown attribute slug: b2b_segment' } 
          };
          throw error;
        }
        
        // Mock successful response for type_persona
        return Promise.resolve({ data: { data: [] } });
      }
    };
  }
  return mockClient;
};

async function testB2BSegmentFlow() {
  try {
    // Test 1: Direct filter with b2b_segment (untranslated)
    console.log('\n=== Test 1: Direct filter with b2b_segment ===');
    const filters1 = {
      filters: [
        {
          attribute: { slug: "b2b_segment" },
          condition: FilterConditionType.CONTAINS,
          value: "Plastic Surgeon"
        }
      ]
    };
    
    // Test translation
    console.log('Original filters:', JSON.stringify(filters1, null, 2));
    const translated1 = translateAttributeNamesInFilters(filters1, ResourceType.COMPANIES);
    console.log('Translated filters:', JSON.stringify(translated1, null, 2));
    
    // Test API call
    try {
      await advancedSearchObject(ResourceType.COMPANIES, translated1);
      console.log('Search with translated filters succeeded');
    } catch (error) {
      console.error('Search with translated filters failed:', error.message);
    }
    
    // Test 2: Direct filter with type_persona (pre-translated)
    console.log('\n=== Test 2: Direct filter with type_persona ===');
    const filters2 = {
      filters: [
        {
          attribute: { slug: "type_persona" },
          condition: FilterConditionType.CONTAINS,
          value: "Plastic Surgeon"
        }
      ]
    };
    
    console.log('Using pre-translated filters:', JSON.stringify(filters2, null, 2));
    try {
      await advancedSearchObject(ResourceType.COMPANIES, filters2);
      console.log('Search with type_persona succeeded');
    } catch (error) {
      console.error('Search with type_persona failed:', error.message);
    }
    
    // Test 3: Test what happens with untranslated filter
    console.log('\n=== Test 3: Untranslated filter ===');
    try {
      await advancedSearchObject(ResourceType.COMPANIES, filters1);
      console.log('Search with untranslated filters succeeded (unexpected)');
    } catch (error) {
      console.error('Search with untranslated filters failed (expected):', error.message);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testB2BSegmentFlow();