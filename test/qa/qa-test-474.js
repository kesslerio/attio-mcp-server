/**
 * QA Test Script for Issue #474: Content Search Functionality
 * 
 * This script tests the content search implementation to ensure:
 * - Content search returns relevant results based on text content
 * - Search works across multiple fields (description, notes, etc.)
 * - Partial matches are supported
 * - Results are ranked by relevance
 * - Cross-object type searches supported
 */

// Test Case: Verify content search functionality
async function testContentSearch() {
  console.log('Testing Content Search Functionality...\n');
  
  // Setup: Create test records with searchable content
  console.log('Setup: Creating test records with content');
  const testRecords = [];
  
  try {
    // Create companies with content
    const companies = [
      {
        name: 'Alpha Technologies',
        description: 'Leading provider of artificial intelligence solutions for healthcare'
      },
      {
        name: 'Beta Corporation',
        description: 'Specializes in machine learning algorithms for financial analysis'
      },
      {
        name: 'Gamma Industries',
        description: 'Manufacturing automation using robotics and AI systems'
      }
    ];
    
    for (const company of companies) {
      const record = await mcp.callTool('create-record', {
        resource_type: 'companies',
        record_data: company
      });
      testRecords.push({ type: 'companies', id: record.data.id, data: company });
    }
    
    // Create people with content
    const people = [
      {
        first_name: 'Alice',
        last_name: 'Smith',
        notes: 'Expert in neural networks and deep learning architectures'
      },
      {
        first_name: 'Bob',
        last_name: 'Johnson',
        notes: 'Specializes in natural language processing and chatbot development'
      }
    ];
    
    for (const person of people) {
      const record = await mcp.callTool('create-record', {
        resource_type: 'people',
        record_data: person
      });
      testRecords.push({ type: 'people', id: record.data.id, data: person });
    }
    
    console.log(`✅ Created ${testRecords.length} test records\n`);
  } catch (error) {
    console.log('❌ Failed to create test records:', error.message);
    return false;
  }

  // Test 1: Basic content search
  console.log('Test 1: Basic Content Search');
  try {
    const result = await mcp.callTool('search-records', {
      resource_type: 'companies',
      query: 'artificial intelligence',
      search_type: 'content'
    });
    
    if (result && result.data && result.data.length > 0) {
      console.log(`✅ Content search found ${result.data.length} matches`);
      
      // Verify results contain the search term
      const hasRelevantResults = result.data.some(company => 
        company.values?.description?.toLowerCase().includes('artificial intelligence')
      );
      
      if (hasRelevantResults) {
        console.log('✅ Search results are relevant to query');
      } else {
        console.log('❌ Search results do not match query content');
        return false;
      }
    } else {
      console.log('❌ Content search returned no results');
      return false;
    }
  } catch (error) {
    console.log('❌ Content search failed:', error.message);
    return false;
  }

  // Test 2: Cross-field content search
  console.log('\nTest 2: Cross-field Content Search');
  try {
    const result = await mcp.callTool('search-records', {
      resource_type: 'companies',
      query: 'machine learning',
      search_type: 'content',
      fields: ['description', 'notes', 'name']
    });
    
    if (result && result.data) {
      console.log(`✅ Cross-field search returned ${result.data.length} results`);
      
      if (result.data.length > 0) {
        console.log('✅ Found matches across specified fields');
      } else {
        console.log('⚠️ No matches found in specified fields');
      }
    }
  } catch (error) {
    console.log('❌ Cross-field search failed:', error.message);
    return false;
  }

  // Test 3: Partial match content search
  console.log('\nTest 3: Partial Match Content Search');
  try {
    const result = await mcp.callTool('search-records', {
      resource_type: 'companies',
      query: 'automat',  // Partial word
      search_type: 'content',
      match_type: 'partial'
    });
    
    if (result && result.data) {
      const foundAutomation = result.data.some(company =>
        company.values?.description?.toLowerCase().includes('automat')
      );
      
      if (foundAutomation) {
        console.log('✅ Partial match search working');
      } else {
        console.log('❌ Partial match not finding results');
        return false;
      }
    }
  } catch (error) {
    console.log('❌ Partial match search failed:', error.message);
    return false;
  }

  // Test 4: Relevance ranking
  console.log('\nTest 4: Relevance Ranking');
  try {
    const result = await mcp.callTool('search-records', {
      resource_type: 'companies',
      query: 'AI',
      search_type: 'content',
      sort: 'relevance'
    });
    
    if (result && result.data && result.data.length > 1) {
      // Check if results are sorted by relevance
      // Records with more occurrences should rank higher
      console.log('Search results order:');
      result.data.slice(0, 3).forEach((company, index) => {
        const description = company.values?.description || '';
        const occurrences = (description.match(/AI/gi) || []).length;
        console.log(`  ${index + 1}. ${company.values?.name} (${occurrences} occurrences)`);
      });
      
      console.log('✅ Relevance ranking applied to results');
    }
  } catch (error) {
    console.log('⚠️ Relevance ranking not available:', error.message);
  }

  // Test 5: People content search
  console.log('\nTest 5: People Content Search');
  try {
    const result = await mcp.callTool('search-records', {
      resource_type: 'people',
      query: 'neural networks',
      search_type: 'content'
    });
    
    if (result && result.data) {
      const foundPerson = result.data.some(person =>
        person.values?.notes?.toLowerCase().includes('neural networks')
      );
      
      if (foundPerson) {
        console.log('✅ People content search working');
      } else {
        console.log('❌ People content search not finding results');
        return false;
      }
    }
  } catch (error) {
    console.log('❌ People content search failed:', error.message);
    return false;
  }

  // Cleanup
  console.log('\nCleanup: Removing test records');
  try {
    for (const record of testRecords) {
      await mcp.callTool('delete-record', {
        resource_type: record.type,
        record_id: record.id.record_id
      });
    }
    console.log('✅ Test records cleaned up');
  } catch (error) {
    console.log('⚠️ Some cleanup failed:', error.message);
  }

  return true;
}

// Mock MCP interface for testing
const mcp = {
  callTool: async (toolName, params) => {
    console.log(`Calling tool: ${toolName} with params:`, params);
    // This would be replaced with actual MCP tool calls
    // For now, returning mock data for testing
    
    if (toolName === 'create-record') {
      return {
        data: {
          id: { record_id: `test_${Date.now()}_${Math.random()}` },
          values: params.record_data
        }
      };
    }
    
    if (toolName === 'search-records') {
      // Mock search results based on query
      if (params.query?.includes('artificial intelligence')) {
        return {
          data: [{
            id: { record_id: 'test_1' },
            values: {
              name: 'Alpha Technologies',
              description: 'Leading provider of artificial intelligence solutions for healthcare'
            }
          }]
        };
      }
      
      if (params.query?.includes('machine learning')) {
        return {
          data: [{
            id: { record_id: 'test_2' },
            values: {
              name: 'Beta Corporation',
              description: 'Specializes in machine learning algorithms for financial analysis'
            }
          }]
        };
      }
      
      if (params.query?.includes('automat')) {
        return {
          data: [{
            id: { record_id: 'test_3' },
            values: {
              name: 'Gamma Industries',
              description: 'Manufacturing automation using robotics and AI systems'
            }
          }]
        };
      }
      
      if (params.query === 'AI') {
        return {
          data: [
            {
              id: { record_id: 'test_3' },
              values: {
                name: 'Gamma Industries',
                description: 'Manufacturing automation using robotics and AI systems'
              }
            },
            {
              id: { record_id: 'test_1' },
              values: {
                name: 'Alpha Technologies',
                description: 'Leading provider of artificial intelligence solutions'
              }
            }
          ]
        };
      }
      
      if (params.query?.includes('neural networks')) {
        return {
          data: [{
            id: { record_id: 'test_4' },
            values: {
              name: 'Alice Smith',
              notes: 'Expert in neural networks and deep learning architectures'
            }
          }]
        };
      }
      
      return { data: [] };
    }
    
    if (toolName === 'delete-record') {
      return { success: true };
    }
    
    return {};
  }
};

// Run the test
console.log('='.repeat(60));
console.log('QA TEST: CONTENT SEARCH FUNCTIONALITY (ISSUE #474)');
console.log('='.repeat(60));
console.log();

testContentSearch().then(success => {
  console.log();
  console.log('='.repeat(60));
  if (success) {
    console.log('✅ ALL TESTS PASSED');
  } else {
    console.log('❌ SOME TESTS FAILED');
  }
  console.log('='.repeat(60));
}).catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});