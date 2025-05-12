# Error Handling in Attio MCP Server

This document describes the error handling system implemented in the Attio MCP server.

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