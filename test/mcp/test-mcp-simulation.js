/**
 * Simulate the exact MCP request flow
 */

// Set environment for testing
process.env.NODE_ENV = 'development';
process.env.ATTIO_API_KEY = 'test-key';

async function simulateMCPRequest() {
  // First, let's see what the actual mcp-server config looks like
  const packageJson = await import('./package.json', {
    with: { type: 'json' },
  });
  console.log('MCP server name:', packageJson.default.name);
  console.log('MCP server main:', packageJson.default.main);

  // Import the actual server module
  const server = await import('./dist/index.js');
  console.log('Server exports:', Object.keys(server));

  // Let's manually test the flow of an advanced-search-companies request
  console.log('\n=== Testing attribute mapping before handler ===');

  const { translateAttributeNamesInFilters } = await import(
    './dist/utils/attribute-mapping/index.js'
  );
  const { ResourceType, FilterConditionType } = await import(
    './dist/types/attio.js'
  );

  // The filter that Claude Code sends
  const claudeFilter = {
    filters: [
      {
        attribute: { slug: 'b2b_segment' },
        condition: FilterConditionType.CONTAINS,
        value: 'Plastic Surgeon',
      },
    ],
  };

  console.log('Claude sends:', JSON.stringify(claudeFilter, null, 2));

  // What should happen in tools.ts
  const translated = translateAttributeNamesInFilters(
    claudeFilter,
    ResourceType.COMPANIES
  );
  console.log('After translation:', JSON.stringify(translated, null, 2));

  // Now let's test the tool config handler
  console.log('\n=== Testing tool config handler ===');

  const { companyToolConfigs } = await import(
    './dist/handlers/tool-configs/companies.js'
  );
  console.log('Available company tools:', Object.keys(companyToolConfigs));

  // Get the advancedSearch handler
  const advancedSearchConfig = companyToolConfigs.advancedSearch;
  console.log('AdvancedSearch handler exists?', !!advancedSearchConfig);

  if (advancedSearchConfig) {
    console.log('Handler name:', advancedSearchConfig.name);

    // Call the handler directly with translated filters
    try {
      console.log('\nCalling handler with translated filters...');
      const results = await advancedSearchConfig.handler(translated);
      console.log('Handler succeeded, results:', results.length);
    } catch (error) {
      console.error('Handler error:', error.message);

      // Check if body contains untranslated attribute
      if (error.message?.includes('b2b_segment')) {
        console.error(
          'ERROR: The handler is still seeing the untranslated attribute!'
        );
      }
    }
  }
}

simulateMCPRequest().catch(console.error);
