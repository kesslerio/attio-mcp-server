# Error Handling in Attio MCP Server

This document describes the error handling system implemented in the Attio MCP server.

## Filter Validation Error Categories

As of version 0.0.2, the server implements a more granular categorization system for filter validation errors. This allows for more targeted error handling and better user feedback.

| Category | Description | Example Error |
|----------|-------------|---------------|
| `STRUCTURE` | Basic structure issues with filters | Missing filters array, filters not an array |
| `ATTRIBUTE` | Issues with attribute specification | Missing attribute object, missing attribute.slug |
| `CONDITION` | Issues with filter conditions | Invalid condition value, unsupported condition |
| `VALUE` | Issues with filter values | Invalid value type, incompatible value for condition |
| `TRANSFORMATION` | Issues transforming filters to API format | API format transformation errors |

### Working with Filter Error Categories

When handling filter validation errors, you can use the error category to determine the type of issue:

```typescript
try {
  const results = await advancedSearchCompanies(filters);
} catch (error) {
  if (error instanceof FilterValidationError) {
    switch (error.category) {
      case FilterErrorCategory.STRUCTURE:
        console.error("Basic filter structure issue:", error.message);
        // Show basic filter structure examples
        break;
      case FilterErrorCategory.ATTRIBUTE:
        console.error("Issue with filter attributes:", error.message);
        // Show attribute examples
        break;
      case FilterErrorCategory.CONDITION:
        console.error("Issue with filter conditions:", error.message);
        // Show condition examples
        break;
      case FilterErrorCategory.VALUE:
        console.error("Issue with filter values:", error.message);
        // Show value format examples
        break;
      case FilterErrorCategory.TRANSFORMATION:
        console.error("Issue transforming filters to API format:", error.message);
        // Show transformation examples
        break;
    }
  } else {
    console.error("Other error:", error.message);
  }
}
```

### Filter Error Examples

#### Structure Error

```
Filter object is required but was undefined or null

Example of valid filter structure: 
{
  "filters": [
    {
      "attribute": { "slug": "name" },
      "condition": "contains",
      "value": "Company Inc"
    }
  ]
}
```

#### Attribute Error

```
Invalid filter structure at index 0: missing attribute.slug

Example of valid filter structure: 
{
  "filters": [
    {
      "attribute": { "slug": "name" },
      "condition": "contains",
      "value": "Company Inc"
    }
  ]
}
```

#### Condition Error

```
Invalid filter structure at index 0: invalid condition 'not_valid'. 
Valid conditions are: equals, contains, starts_with, ends_with, greater_than, less_than, is_empty, is_not_empty

Example of valid filter structure: 
{
  "filters": [
    {
      "attribute": { "slug": "name" },
      "condition": "contains",
      "value": "Company Inc"
    }
  ]
}
```

## MCP-Specific Error Handling

When using Claude with the Attio MCP server, you may encounter errors that are specific to the MCP integration. Here's how these are handled:

### Common MCP Error Scenarios

1. **Authentication Failures**
   - If your Attio API key is invalid or expired, Claude will receive an authentication error
   - Claude will prompt you to check your API key configuration

2. **Resource Not Found Errors**
   - When referencing non-existent records, Claude receives a NOT_FOUND error
   - Claude will suggest alternative search approaches or creation of new records

3. **Rate Limiting**
   - Attio API rate limits may cause temporary failures
   - The MCP server implements retry logic with exponential backoff
   - Claude will inform you if operations are being delayed due to rate limiting

### Error Recovery Strategies

Claude implements several strategies to recover from errors:

1. **Alternative Search Methods**
   - If a direct lookup fails, Claude may try broader search criteria
   - Example: If email search fails, Claude might try name search instead

2. **Graceful Degradation**
   - When specific operations fail, Claude will continue with available functions
   - Example: If creating a note fails, Claude can still read existing notes

3. **User Guidance**
   - Claude provides clear explanations of errors and suggests next steps
   - For persistent errors, Claude will recommend troubleshooting steps

### Example Error Handling Dialog

**User**: "Update the contact information for john@nonexistentcompany.com"

**Claude**: "I wasn't able to find a contact with the email john@nonexistentcompany.com. Would you like me to:
1. Search for contacts named John instead
2. Create a new contact with this email address
3. Check if there might be a different email address for this contact"

## Error Types

The server categorizes errors into specific types to make error handling more predictable and actionable. These types are defined in the `ErrorType` enum:

```typescript
export enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  API_ERROR = 'api_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  NETWORK_ERROR = 'network_error',
  NOT_FOUND_ERROR = 'not_found_error',
  SERVER_ERROR = 'server_error',
  UNKNOWN_ERROR = 'unknown_error',
}
```

## Error Response Format

All error responses follow a consistent format:

```typescript
interface ErrorResponse {
  error: {
    type: ErrorType;
    message: string;
    details?: any;
    code?: string;
    status?: number;
  };
}
```

- `type`: The categorized error type
- `message`: A human-readable error message
- `details`: Optional detailed information about the error
- `code`: Optional error code
- `status`: HTTP status code associated with the error

## Input Validation

The server uses a comprehensive validation utility to ensure all input meets the expected schema before processing. This helps catch and report invalid input early in the request lifecycle.

```typescript
// Example validation schema
const personSchema = {
  type: 'object',
  required: ['firstName', 'email'],
  properties: {
    firstName: { type: 'string', minLength: 1 },
    lastName: { type: 'string' },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 0 }
  }
};

// Validate input against schema
const { valid, errors } = validateInput(input, personSchema);
if (!valid) {
  // Handle validation errors
}
```

## API Call Retry Logic

The server implements automatic retry logic for API calls to handle transient failures. This is done using the `callWithRetry` function which supports:

- Configurable maximum retry attempts
- Exponential backoff with jitter
- Intelligent retry decisions based on error type

```typescript
// Example usage
const result = await callWithRetry(
  async () => {
    // API call that might fail
    return await api.get('/some/endpoint');
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000
  }
);
```

### Default Retry Configuration

```typescript
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  useExponentialBackoff: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};
```

## Standardized Response Formatting

All responses from the server follow standardized formats for consistency:

### Success Responses

```typescript
// Basic success response
{
  success: true,
  message: "Operation completed successfully",
  data: { ... }
}

// List response
{
  success: true,
  message: "Found 10 items",
  data: [ ... ],
  meta: {
    total: 10,
    page: 1,
    hasMore: false
  }
}
```

### Error Responses

```typescript
// Error response
{
  success: false,
  error: {
    type: "validation_error",
    message: "Invalid input provided",
    details: [
      { field: "email", message: "Must be a valid email address" }
    ]
  }
}
```

## Best Practices

### Creating Error Responses

Use the `createErrorResult` function to create standardized error responses:

```typescript
import { createErrorResult, ErrorType } from '../utils/error-handler';

try {
  // Operation that might fail
} catch (error) {
  if (error.response?.status === 404) {
    return createErrorResult(
      ErrorType.NOT_FOUND_ERROR,
      'Resource not found',
      { resourceId: id }
    );
  }
  
  // Generic error handling
  return createErrorResult(
    ErrorType.UNKNOWN_ERROR,
    'An unexpected error occurred',
    error
  );
}
```

### Using the Retry Logic

Add retry logic to API calls that might fail due to transient issues:

```typescript
import { callWithRetry } from '../api/attio-operations';

async function fetchUserData(userId) {
  return callWithRetry(
    async () => {
      // API call that might fail
      const response = await api.get(`/users/${userId}`);
      return response.data;
    },
    {
      maxRetries: 5,
      retryableStatusCodes: [429, 503]
    }
  );
}
```

### Validation

Always validate inputs before processing:

```typescript
import { validateInput } from '../utils/validation';

function processUserData(userData) {
  const schema = {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: { type: 'string', minLength: 1 },
      email: { type: 'string', format: 'email' }
    }
  };
  
  const { valid, errors } = validateInput(userData, schema);
  if (!valid) {
    throw new Error(`Invalid user data: ${JSON.stringify(errors)}`);
  }
  
  // Process validated data
}
```

## Testing

The error handling system includes comprehensive test coverage for:

- Error type categorization
- Response formatting
- Input validation
- Retry logic

Use these tests as examples when implementing error handling in new features.

# API Client Error Handling Best Practices

When interacting with external APIs, such as the Attio API via client modules (e.g., `src/api/attio-operations.ts`), it's crucial to handle errors in a way that preserves detailed information for upstream processing and user feedback.

## Key Principle: Preserve Original Error Context

The most common pitfall is catching an error from an API client library (like an `AxiosError`) and then throwing a new, generic `Error` object. This practice strips away valuable context from the original error, such as:

- HTTP status code
- API-specific error codes (e.g., `responseData.code` from Attio)
- API-specific error messages and details (e.g., `responseData.path`, `responseData.detail`)

This loss of information prevents centralized error handlers (like those in `src/utils/error-handler.ts` or `src/handlers/tools.ts`) from creating rich, informative error messages for the end-user or for detailed logging.

## Recommended Pattern: Re-throw Original API Errors

When a function in an API client module (like `src/api/attio-operations.ts`) catches an error from an API call (typically an `AxiosError` or similar), it should **re-throw the original error object**.

**Rationale:**

- **Centralized Enhancement:** Allows a single, higher-level error handler to inspect the original error (including its `response.data` or similar properties) and create a specific, user-friendly `AttioApiError` or a well-structured error response.
- **Detailed Logging:** Ensures that all available details from the API provider are available for logging and debugging.
- **Consistent Error Structure:** Promotes a consistent error structure throughout the application, as the centralized handler can normalize different API errors into a standard format.

### Example

Consider a function in `src/api/attio-operations.ts` that makes an API call:

**BAD:** Masking the original error.

```typescript
// In src/api/attio-operations.ts
import axios from 'axios';

async function fetchSomeData(id: string): Promise<any> {
  try {
    const response = await axios.get(`https://api.attio.com/v2/some-endpoint/${id}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // PROBLEM: Creates a new generic error, losing original Attio details.
      if (error.response.status === 404) {
        throw new Error(`Resource with ID ${id} not found.`);
      } else if (error.response.status === 400) {
        throw new Error(`Bad request for resource ${id}: ${error.response.data.message}`);
      }
    }
    // PROBLEM: Generic fallback, losing all specific API error info.
    throw new Error('An unexpected error occurred while fetching data.');
  }
}
```

**GOOD:** Re-throwing the original error for upstream handling.

```typescript
// In src/api/attio-operations.ts
import axios from 'axios';

async function fetchSomeData(id: string): Promise<any> {
  try {
    const response = await axios.get(`https://api.attio.com/v2/some-endpoint/${id}`);
    return response.data;
  } catch (error) {
    // BEST PRACTICE: Re-throw the original error (or a minimally wrapped one if necessary,
    // ensuring the original error is attached for inspection).
    // The AxiosError object itself contains response.status, response.data, etc.
    throw error;
  }
}

// Upstream handler (e.g., in src/handlers/tools.ts or called by it)
// This handler can now access error.response.data from Attio.

/*
import { createAttioError } from '../utils/error-handler';
sync function handleFetchData(id: string) {
  try {
    return await fetchSomeData(id);
  } catch (error) {
    // createAttioError (or similar) can inspect the full AxiosError
    // and its error.response.data to create a detailed AttioApiError.
    const enhancedError = createAttioError(error);
    // Log enhancedError, return it as a structured JSON-RPC error, etc.
    console.error(enhancedError);
    throw enhancedError; // Or return a formatted error response
  }
}
*/
```

By consistently re-throwing original API errors, the application can leverage centralized error handling logic to provide more precise feedback and better diagnostic information.

## Recent Updates and Improvements

### Enhanced Attribute Error Handling (Issue #183)

The company attributes module has been updated with improved error handling to address issues when using the `get-company-attributes` tool. Key improvements include:

1. **Try/Catch Blocks in Core Logic**
   - Added structured `try/catch` blocks in the `getCompanyAttributes` function 
   - Implemented consistent error logging using the `logAttributeError` helper
   - Enhanced error messages with additional context (company ID, attribute name)

2. **Robust Result Formatting**
   - Improved error handling in the tool formatter with comprehensive checks
   - Added fallback handling for unexpected result structures
   - Better error messages for end users with clear guidance on issues

3. **Error Detection and Prevention**
   - Added type checking and validation for input parameters
   - Improved validation for attribute existence before access attempts
   - Implemented robust error propagation with context preservation

These improvements ensure that the `get-company-attributes` tool now provides clear, actionable error messages rather than generic "[object Object]" errors, making it much easier to troubleshoot issues when working with company attributes.