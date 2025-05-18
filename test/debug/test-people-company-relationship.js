/**
 * Test script to debug people-company relationship queries
 * This script demonstrates the correct way to find people affiliated with companies
 */

// For a manual test using the MCP tool, the correct format would be:
/*
await mcp.call('search-people-by-company', {
  companyFilter: {
    filters: [
      {
        attribute: { slug: 'companies.name' },
        condition: 'equals',
        value: 'Oakwood Precision Medicine'
      }
    ]
  }
});
*/

// Or using the company ID directly:
/*
await mcp.call('search-people-by-company', {
  companyFilter: {
    filters: [
      {
        attribute: { slug: 'companies.id' },
        condition: 'equals',
        value: { record_id: '0c472146-9c7b-5fde-96cd-5df8e5cf9575' }
      }
    ]
  }
});
*/

// The issue is that the MCP tool expects a companyFilter object with filters,
// not a simple companyId string. The handler should look like this:

console.log(`
Issue Summary:
- The search-people-by-company MCP tool expects a 'companyFilter' parameter
- The companyFilter should contain a 'filters' array with filter conditions
- Each filter should specify an attribute, condition, and value
- The implementation in relationships.ts expects a companyId string internally
- There's a mismatch between the MCP tool definition and internal implementation

Correct usage:
{
  companyFilter: {
    filters: [{
      attribute: { slug: 'companies.name' },  // or 'companies.id'
      condition: 'equals',
      value: 'Oakwood Precision Medicine'    // or { record_id: 'company-id' }
    }]
  }
}

The current implementation needs to be fixed to properly map between the MCP
tool interface and the internal function signature.
`);