# Troubleshooting Guide

This document provides solutions for common issues you might encounter when working with the Attio MCP Server.

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