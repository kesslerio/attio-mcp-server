Resolves #215

## Problem
The recently implemented domain search for companies was returning 0 results despite correct domain extraction. When searching for 'The Plastics Doc theplasticsdoc.com', the system would extract the domain correctly but fail to find matching companies.

## Root Cause
Two issues were identified:
1. **API client not initialized**: Tools called standalone (outside MCP server context) didn't have the API client initialized
2. **ES module compatibility**: A `require()` call in search operations was incompatible with ES modules

## Solution
1. **Added fallback API client initialization**: Modified `getAttioClient()` to auto-initialize from environment variables when not already initialized
2. **Fixed ES module imports**: Replaced `require()` with dynamic `import()` in search operations
3. **Maintained search prioritization**: Domain search → name search fallback logic preserved

## Testing
- ✅ Domain extraction works correctly
- ✅ API client auto-initializes from environment variables  
- ✅ Domain search finds companies by website field
- ✅ MCP tool returns correct results: 'Found 1 companies' instead of 'Found 0 companies'
- ✅ Search prioritization maintained: domain matches first, then name matches

## Files Changed
- `src/api/attio-client.ts`: Added fallback initialization
- `src/api/operations/search.ts`: Fixed ES module compatibility
- Added comprehensive debug scripts in `test/debug/`

The fix ensures domain-based company search works correctly while maintaining backward compatibility and proper error handling. 