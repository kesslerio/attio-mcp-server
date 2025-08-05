/**
 * Debug script to test the complete search-companies flow
 */

// Load environment variables from .env file
import dotenv from 'dotenv';

dotenv.config();

// Set up environment for testing
process.env.NODE_ENV = 'development';
process.env.DEBUG = 'true';

const query = 'The Plastics Doc theplasticsdoc.com';

async function testSearchCompaniesFlow() {
  console.log('🧪 Testing search-companies complete flow');
  console.log('==========================================');
  console.log(`Query: "${query}"`);
  console.log('');

  try {
    // Step 1: Test tool registry
    console.log('1️⃣ Testing tool registry...');
    const { findToolConfig } = await import(
      '../../dist/handlers/tools/registry.js'
    );

    const toolInfo = findToolConfig('search-companies');
    if (!toolInfo) {
      console.error('❌ Tool not found in registry!');
      return;
    }

    console.log('✅ Tool found:', {
      resourceType: toolInfo.resourceType,
      toolType: toolInfo.toolType,
      hasHandler: typeof toolInfo.toolConfig.handler === 'function',
    });

    // Step 2: Test domain extraction
    console.log('\n2️⃣ Testing domain extraction...');
    const { extractDomain, extractAllDomains } = await import(
      '../../dist/utils/domain-utils.js'
    );

    const extractedDomain = extractDomain(query);
    const allDomains = extractAllDomains(query);

    console.log('✅ Domain extraction results:', {
      single: extractedDomain,
      all: allDomains,
    });

    // Step 3: Test search handler directly
    console.log('\n3️⃣ Testing search handler directly...');

    if (process.env.ATTIO_API_KEY) {
      console.log('🔧 Using real API...');

      // Initialize the client
      const { initializeAttioClient } = await import(
        '../../dist/api/attio-client.js'
      );
      initializeAttioClient(process.env.ATTIO_API_KEY);

      // Call the actual handler
      const results = await toolInfo.toolConfig.handler(query);
      console.log('✅ Search results:', {
        count: results.length,
        hasResults: results.length > 0,
      });

      if (results.length > 0) {
        console.log('First result sample:', {
          id: results[0].id?.record_id,
          name: results[0].values?.name?.[0]?.value,
          website: results[0].values?.website?.[0]?.value,
        });
      }

      // Test formatting
      const formattedResult = toolInfo.toolConfig.formatResult(results);
      console.log('✅ Formatted result length:', formattedResult.length);
      console.log(
        'Formatted result preview:',
        formattedResult.substring(0, 200) + '...'
      );
    } else {
      console.log('⚠️ No ATTIO_API_KEY found, creating mock test...');

      // Mock the API client for testing
      const mockResults = [];
      console.log('🔧 Mock search result:', mockResults);

      // Test formatting
      const formattedResult = toolInfo.toolConfig.formatResult(mockResults);
      console.log('✅ Formatted result:', formattedResult);

      // This is the expected result format for the GitHub issue
      console.log(
        '\n🔍 Expected result for this query (domain should be found):'
      );
      console.log('Domain extraction: ✅ Working');
      console.log('Search logic: ✅ Working (tries domain search first)');
      console.log('API client: ❌ Not initialized');
      console.log(
        'Final result: "Found 0 companies:" (incorrect - should find domain matches)'
      );
    }

    // Step 4: Test complete MCP flow
    console.log('\n4️⃣ Testing complete MCP flow...');

    // For MCP flow testing, we need to initialize the API client if we have a key
    if (process.env.ATTIO_API_KEY) {
      console.log('🔧 Initializing API client for MCP flow test...');
      const { initializeAttioClient } = await import(
        '../../dist/api/attio-client.js'
      );
      initializeAttioClient(process.env.ATTIO_API_KEY);
    }

    const { executeToolRequest } = await import(
      '../../dist/handlers/tools/dispatcher.js'
    );

    const mcpRequest = {
      method: 'tools/call',
      params: {
        name: 'search-companies',
        arguments: {
          query,
        },
      },
    };

    console.log('🔧 MCP request:', JSON.stringify(mcpRequest, null, 2));

    const mcpResponse = await executeToolRequest(mcpRequest);
    console.log('✅ MCP response:', JSON.stringify(mcpResponse, null, 2));

    // Analyze the response
    if (mcpResponse.isError) {
      console.log(
        '\n❌ Issue detected: API client not initialized in MCP flow!'
      );
      console.log(
        'This indicates that the MCP server startup process is not being simulated correctly.'
      );
    } else {
      const responseText = mcpResponse.content?.[0]?.text || '';
      if (responseText.includes('Found 0 companies:')) {
        console.log(
          '\n⚠️ Potential issue: Found 0 companies for a query with a valid domain'
        );
        console.log('This could indicate:');
        console.log(
          '1. No companies with "theplasticsdoc.com" domain exist in the CRM'
        );
        console.log('2. Domain search is not working correctly');
        console.log('3. Website field format/normalization issues');
      } else {
        console.log('\n✅ Search returned results as expected');
      }
    }
  } catch (error) {
    console.error('❌ Error during testing:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testSearchCompaniesFlow().catch(console.error);
