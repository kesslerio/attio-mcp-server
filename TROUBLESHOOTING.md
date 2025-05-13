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