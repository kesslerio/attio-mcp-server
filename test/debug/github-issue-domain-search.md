# Company domain search returns 0 results despite correct domain extraction

## Issue Description

The recently implemented domain search for companies doesn't seem to work properly. When searching for companies using a query that contains a domain (e.g., 'The Plastics Doc theplasticsdoc.com'), the search returns 0 results even though the domain extraction logic is working correctly.

## Expected Behavior

When searching for 'The Plastics Doc theplasticsdoc.com', the system should:
1. Extract the domain 'theplasticsdoc.com' from the query ✅ (working)
2. Prioritize domain-based search over name search ✅ (working)
3. Find companies with matching domain in their website field ❌ (failing)
4. Return matching companies or fall back to name search if no domain matches

## Actual Behavior

```
Request: {
  "query": "The Plastics Doc theplasticsdoc.com"
}

Response: [
  {
    "type": "text", 
    "text": "Found 0 companies:\n"
  }
]
```

## Root Cause Analysis

Through debugging, I've identified that:

1. **Domain extraction is working correctly**: ✅
   - `extractDomain('The Plastics Doc theplasticsdoc.com')` returns `'theplasticsdoc.com'`
   - `extractAllDomains()` correctly identifies the domain

2. **Search logic is working correctly**: ✅
   - The system detects the domain and attempts domain search first
   - Fallback to name search is implemented

3. **API client initialization issue**: ❌
   - The search fails because the API client is not initialized when running standalone
   - This suggests the issue may also occur in real MCP usage scenarios

## Technical Details

- **File**: `src/objects/companies/search.ts`
- **Function**: `searchCompanies()`, `searchCompaniesByDomain()`
- **Tools affected**: `search-companies` MCP tool
- **Domain logic**: Located in `src/utils/domain-utils.ts`

## Debug Output

```
[searchCompanies] Extracted domain: "theplasticsdoc.com" from query: "The Plastics Doc theplasticsdoc.com"
[searchCompaniesByDomain] Searching for domain: "theplasticsdoc.com" (original: "theplasticsdoc.com")
[advancedSearchCompanies] Error details: {
  message: 'API client not initialized. Call initializeAttioClient first.'
}
Domain search failed for "theplasticsdoc.com", falling back to name search: Error: API client not initialized...
```

## Steps to Reproduce

1. Use the MCP tool `search-companies` with a query containing a domain:
   ```json
   {
     "name": "search-companies",
     "arguments": {
       "query": "The Plastics Doc theplasticsdoc.com"
     }
   }
   ```

2. Or run the debug script: `node test/debug/debug-search-companies.js`

## Potential Solutions

1. **Investigate API client initialization in MCP flow**
   - Ensure the API client is properly initialized when the MCP server starts
   - Add fallback initialization in tool handlers if needed

2. **Verify domain search implementation**
   - Check if the website field filtering is working correctly
   - Verify domain normalization matches stored website formats

3. **Add better error handling**
   - Provide more informative error messages when domain search fails
   - Ensure graceful fallback to name search

## Priority

**High** - This affects the core functionality of the recently implemented domain search feature and could impact user experience when searching for companies by domain/website.

## Labels

- bug
- domain-search
- companies
- search
- api-client

## Related Files

- `src/objects/companies/search.ts`
- `src/utils/domain-utils.ts` 
- `src/handlers/tools/dispatcher.ts`
- `src/api/attio-client.ts`
- `test/debug/debug-search-companies.js` 