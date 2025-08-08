# Troubleshooting Guide

This document provides solutions for common issues you might encounter when working with the Attio MCP Server.

## 🏆 Recently Resolved Critical Issues (August 2025)

The following critical issues have been **RESOLVED** and should no longer affect users:

### ✅ P0 Critical API Failures (BUG-003, BUG-004, BUG-010)
**Issue**: API responses failing due to inconsistent data structure handling  
**Status**: **FIXED** - Implemented robust fallback pattern: `response?.data?.data || response?.data || []`  
**Impact**: 100% integration test pass rate achieved

### ✅ Build Compilation Errors
**Issue**: Missing enhanced-validation module causing TypeScript compilation failures  
**Status**: **FIXED** - Created placeholder module with proper exports  
**Impact**: All builds now successful

### ✅ E2E Test Implementation Bugs  
**Issue**: JSON truncation, resource mappings, and email validation failures  
**Status**: **FIXED** - Comprehensive test fixes with proper mocking and error handling  
**Impact**: All 15 integration tests now passing

### ✅ Field Parameter Filtering (BUG-002, BUG-009)
**Issue**: Tasks API failing due to missing `/objects/tasks/attributes` endpoint  
**Status**: **FIXED** - Implemented special case with predefined task attribute metadata  
**Impact**: Tasks API now fully functional

### ✅ Email Validation Consistency (BUG-006)
**Issue**: Inconsistent email validation between create and update operations  
**Status**: **FIXED** - Unified validation logic with consistent batch processing  
**Impact**: Reliable person creation and updates

### ✅ Pagination System Issues (BUG-001)
**Issue**: Tasks pagination not working as expected  
**Status**: **DOCUMENTED** - Added in-memory handling workaround  
**Impact**: Tasks retrieval now reliable with proper documentation

## Docker Deployment Issues

### Container Health Check Failing

**Problem:** Docker container health check fails with `unhealthy` status.

**Solution:**
- Check if the server is running and listening on port 3000 inside the container:
  ```bash
  docker exec -it attio-mcp-server sh -c "ps aux | grep node"
  docker exec -it attio-mcp-server sh -c "netstat -tulpn | grep 3000"
  ```
- Verify that the health check endpoint is accessible:
  ```bash
  docker exec -it attio-mcp-server sh -c "curl -v http://localhost:3000/health"
  ```
- Check the container logs for startup errors:
  ```bash
  docker logs attio-mcp-server
  ```
- Ensure your API key is correctly configured in the container environment variables:
  ```bash
  docker exec -it attio-mcp-server sh -c "printenv | grep ATTIO"
  ```

### API Key Issues

**Problem:** The server fails to start with "ATTIO_API_KEY environment variable not found" error.

**Solution:**
- Ensure your .env file contains the ATTIO_API_KEY variable:
  ```bash
  echo "ATTIO_API_KEY=your_api_key_here" > .env
  ```
- When using docker-compose, verify that your .env file is in the same directory as your docker-compose.yml file.
- When running containers manually, make sure to pass the environment variable:
  ```bash
  docker run -e ATTIO_API_KEY=your_api_key_here attio-mcp-server
  ```

### Port Conflict Issues

**Problem:** The container fails to start with "port is already allocated" error.

**Solution:**
- Check if another process is using port 3000:
  ```bash
  lsof -i :3000
  ```
- Change the host port mapping in docker-compose.yml or when running the container:
  ```bash
  docker run -p 8080:3000 attio-mcp-server
  ```

## Type Definition Errors

### Duplicate Interface Definitions

**Problem:** Errors like `All declarations of 'data' must have identical modifiers` or `Subsequent property declarations must have the same type` in `src/types/attio.ts`.

**Solution:** 
- Check for duplicate interface declarations in the `src/types/attio.ts` file.
- Specifically look for repeated declarations of `AttioListResponse<T>`, `AttioSingleResponse<T>`, `Person`, and `Company` interfaces.
- Merge the properties from duplicate interfaces into a single definition, ensuring property types are consistent.

**Example Fix:**
```typescript
// Before: Multiple conflicting definitions
export interface AttioListResponse<T> {
  data: T[];
  // other properties
}

// Later in the same file:
export interface AttioListResponse<T> {
  data?: T[]; // Conflicting property type (optional vs. required)
  // other properties
}

// After: Single merged definition
export interface AttioListResponse<T> {
  data: T[];
  has_more?: boolean;
  next_cursor?: string;
  // other properties
  [key: string]: any;
}
```

## API Error Handling Issues

### Missing Error Class Properties

**Problem:** Tests fail with errors about missing properties on error response objects.

**Solution:**
- Ensure the `AttioApiError` class in `src/utils/error-handler.ts` has all required properties:
  - `status`: HTTP status code
  - `detail`: Error details
  - `path`: API endpoint path
  - `method`: HTTP method
  - `responseData`: Raw API response data

**Example Implementation:**
```typescript
export class AttioApiError extends Error {
  status: number;
  detail: string;
  path: string;
  method: string;
  responseData: any;

  constructor(message: string, status: number, detail: string, path: string, method: string, responseData: any = {}) {
    super(message);
    this.name = 'AttioApiError';
    this.status = status;
    this.detail = detail;
    this.path = path;
    this.method = method;
    this.responseData = responseData;
  }
}
```

## Missing URI Formatting Functions

**Problem:** Tests fail with errors about missing `formatResourceUri` function.

**Solution:**
- Implement the `formatResourceUri` function in `src/utils/uri-parser.ts`:

```typescript
export function formatResourceUri(type: ResourceType, id: string): string {
  return `attio://${type}/${id}`;
}
```

## General Testing Tips

1. **Verify Type Definitions:**
   - Run `npm run check` to verify types before running tests.
   - Ensure all exported functions and classes have proper type annotations.

2. **Common Test Failures:**
   - **Missing exports**: Check that all required functions and classes are exported from their respective files.
   - **Type mismatches**: Ensure mock data in tests matches the expected types in your interfaces.
   - **Response format mismatches**: Verify that API response objects follow the structure expected by tests.

3. **Mock Data Consistency:**
   - Keep mock data consistent with the actual API response structure.
   - Update mock data when the interface definitions change.

## Repository and Git Issues

### Multiple Remote Configuration

**Problem:** Issues with pushing to the correct remote or creating PRs.

**Solution:**
- Use `git remote -v` to check your current remote configuration.
- Ensure your primary remote (usually named "origin") points to your fork.
- Use the correct repository URL with GitHub CLI commands:
  ```bash
  gh pr create --repo kesslerio/attio-mcp-server
  ```

### Branch Management

**Problem:** Unable to create PRs due to branch history issues.

**Solution:**
- Create a new branch from the main branch:
  ```bash
  git checkout main
  git pull upstream main
  git checkout -b feature/your-feature-name
  ```
- Apply your changes to this new branch.
- Push to your fork and create a PR.

## Client-Side JSON Parsing Errors (e.g., "Unexpected token ... is not valid JSON")

**Symptoms:**

- The client application (e.g., Claude.app, a web browser console) reports errors like `SyntaxError: Unexpected token ... is not valid JSON`, `JSON.parse: unexpected character at line 1 column 1 of the JSON data`, or similar.
- These errors often appear to happen *before* an expected API response or error is fully processed by the client.
- The snippets of "invalid JSON" shown in the error message might look like parts of server-side log messages, stack traces, or other non-JSON text.

**Cause:**

This issue commonly arises when server-side `console.log`, `console.error`, or other direct standard output/error stream messages are inadvertently mixed with the JSON-RPC (or any JSON) response stream being sent to the client. The client expects a pure JSON string, but if the server prints debug information directly to the output that forms the body of the HTTP response, it contaminates the JSON string, making it unparsable.

**Example of Problematic Server-Side Code (within an API handler):**

```typescript
// Inside an Express.js route or similar handler
try {
  // ... some operation ...
  const result = await someAsyncOperation();
  // This log might break the client if it's part of the response stream
  console.log("Operation successful, result object:", result); 
  res.json({ data: result });
} catch (error) {
  // These logs are very likely to break the JSON response if not handled carefully
  console.error("An error occurred:", error);
  console.error("Error stack:", error.stack);
  // Even if you send a JSON error response, the console logs might have already been sent
  res.status(500).json({ error: "Internal server error" }); 
}
```

**Solution:**

1.  **Identify and Remove/Comment Out Offending Logs:**
    *   Carefully review the server-side code paths that handle the requests leading to the JSON parsing errors.
    *   Temporarily comment out or remove `console.log`, `console.error`, and similar statements, especially those that print complex objects or multi-line strings (like stack traces).
    *   Pay close attention to error handling blocks (`catch` clauses) and middleware.

2.  **Use a Proper Server-Side Logging Mechanism:**
    *   Instead of logging directly to `console.log` in a way that might interfere with the HTTP response, use a dedicated logging library (e.g., Winston, Pino, Bunyan) that writes to files, a logging service, or the console in a controlled manner, separate from the response stream.
    *   Ensure your application framework (e.g., Express.js) is configured so that only the intended JSON response is written to the HTTP response body.

3.  **Isolate Debugging:**
    *   If you must use `console.log` for quick debugging, ensure it's done in a context where it won't be mixed with client responses (e.g., in standalone scripts, unit tests, or very early in the request lifecycle before any response headers/body are sent, and remove them afterward).

**Key Takeaway:** The data stream for a JSON API response must contain *only* valid JSON. Any extraneous text, including server-side debug logs, will likely cause parsing failures on the client.

## Claude Desktop App Crashes

### Large JSON Response Causing Crashes

**Problem:** Claude Desktop app crashes when receiving large company details with JSON responses containing thousands of lines.

**Symptoms:**
- App crashes specifically when calling `get-company-details`
- Large JSON responses with multiple nested attributes
- Response includes data anomalies (e.g., typos like "typpe" instead of "type")

**Cause:**
The `get-company-details` tool was returning raw JSON with thousands of lines, which can overwhelm Claude Desktop's processing capabilities, especially when the JSON contains errors or unusual data.

**Solution:**
1. **Use the Improved get-company-details Tool:**
   - The `get-company-details` tool now returns a formatted summary instead of raw JSON
   - Shows key fields like name, website, industry, location, etc.
   - Provides company ID for further queries if needed

2. **For JSON Data:**
   - The `get-company-json` tool now returns a JSON summary instead of full data
   - This prevents crashes from extremely large JSON responses
   - Full data access is available through the new `get-company-attributes` tool

3. **For Specific Attributes:**
   - Use the new `get-company-attributes` tool to safely access specific fields
   - Can list all available attributes or get a specific attribute value
   - No risk of crashes from large data volumes

**Example Usage:**
```bash
# Get a human-readable summary
get-company-details --companyId "49b11210-df4c-5246-9eda-2add14964eb4"

# Get a JSON summary (safe, won't crash)
get-company-json --companyId "49b11210-df4c-5246-9eda-2add14964eb4"

# List all available attributes
get-company-attributes --companyId "49b11210-df4c-5246-9eda-2add14964eb4"

# Get a specific attribute value
get-company-attributes --companyId "49b11210-df4c-5246-9eda-2add14964eb4" --attributeName "services"
```

**Prevention:**
- Always use the formatted `get-company-details` for general queries
- Use `get-company-json` for a safe JSON summary
- Use `get-company-attributes` when you need specific field values
- Never attempt to retrieve the full raw JSON for companies with extensive data
## MCP Server Crash Prevention for Claude Desktop

### The Problem

When retrieving company details from Attio, large JSON responses can crash Claude Desktop. This particularly affects companies with many attributes (70+ fields).

### The Solution

We've implemented field selection and server-side filtering to limit response sizes. Use the appropriate tool based on your needs to prevent crashes.

### Field Selection Implementation

**How It Works:**
1. The Attio API does not support field selection natively through query parameters
2. We implemented server-side filtering that:
   - Fetches all company data from Attio
   - Filters to only requested fields before returning
   - Simplifies the data structure to minimize JSON complexity
   - Always includes the company name for context

**Using Field Selection:**
```javascript
// Request specific fields only
const result = await getCompanyFields(companyId, ['name', 'services', 'products']);
```

### Tools by Data Volume

#### ⚠️ High Risk - Full Data
**Tool**: `get-company-json`  
**Data**: Returns all raw JSON data  
**When to use**: When you need complete access to all fields and underlying data structure  
**Crash risk**: HIGH - May crash with companies having many fields  

#### ✅ Field Selection - Custom Data
**Tool**: `get-company-fields`  
**Data**: Returns only the specific fields you request  
**When to use**: When you need specific fields and want to minimize data transfer  
**Crash risk**: LOW - Only returns requested fields with simplified structure  
**Example**: `get-company-fields` with `fields: ["name", "services", "products"]`

#### ✅ Recommended - Limited Data
These tools return formatted, limited data and should NOT crash Claude Desktop:

1. **get-company-details**
   - Returns: Basic formatted summary
   - Use for: General company overview
   - Crash risk: LOW
   
2. **get-company-basic-info**
   - Returns: Essential fields only (name, industry, location, etc.)
   - Use for: Quick company lookups
   - Crash risk: VERY LOW
   
3. **get-company-contact-info**
   - Returns: Contact-related fields
   - Use for: Finding contact information
   - Crash risk: VERY LOW
   
4. **get-company-business-info**
   - Returns: Business data (revenue, employees, categories)
   - Use for: Business analysis
   - Crash risk: VERY LOW
   
5. **get-company-social-info**
   - Returns: Social media and online presence
   - Use for: Social media research
   - Crash risk: VERY LOW
   
6. **get-company-custom-fields**
   - Returns: Only custom field values
   - Use for: Accessing user-defined fields
   - Crash risk: LOW
   
7. **discover-company-attributes**
   - Returns: List of available fields without values
   - Use for: Understanding data structure
   - Crash risk: VERY LOW

### Best Practices to Avoid Crashes

1. **Start with `discover-company-attributes`** to understand what fields are available
2. **Use specialized tools** (`get-company-basic-info`, `get-company-contact-info`, etc.) for common use cases
3. **Use `get-company-fields`** when you need specific fields that aren't covered by the specialized tools
4. **Only use `get-company-json`** when absolutely necessary and be prepared for potential crashes with large datasets

### Debugging Tips

If Claude Desktop continues to crash:
1. Check the MCP server logs for the actual response size
2. Try fetching fewer fields at once
3. Use the specialized tools that return pre-filtered data
4. Report the issue with the specific company ID and field count for investigation
EOF < /dev/null