# Troubleshooting Guide

This document provides solutions for common issues you might encounter when working with the Attio MCP Server.

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