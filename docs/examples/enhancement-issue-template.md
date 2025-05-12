# Example Enhancement Issue Template

This document demonstrates a well-structured enhancement issue request.

## Enhancement Issue Template Example

```markdown
# Enhancement: Implement Standardized Response Formatting

## Overview
This enhancement aims to create a standardized response formatting system to ensure consistency in all API responses from the Attio MCP Server.

## Problem Statement
Currently, responses from different API operations have inconsistent structures, making it difficult for clients to parse and handle responses predictably. Each function formats its response differently, resulting in:
- Inconsistent error handling
- Varying data structures for similar operations
- No standard way to include metadata
- Challenges when extending or modifying response formats

We need a centralized, consistent response formatting system that:
- Provides a uniform structure for all responses
- Handles different response types (single item, lists, errors, etc.)
- Allows for including metadata and pagination information
- Makes it easy to extend with new response types in the future

## Current State
Currently, each API operation formats its own response, leading to inconsistencies:

```typescript
// Example from one function
return {
  content: [{ type: 'text', text: `Found ${results.length} people: ...` }],
  isError: false
};

// Example from another function
return {
  content: [{ type: 'text', text: `Person details: ...` }],
  data: personDetails,
  isError: false
};
```

## Proposed Enhancement
Create a new utility module `src/utils/response-formatter.ts` with standardized formatting functions:

1. **Implement Response Formatters**:
   - `formatSuccessResponse`: For simple success messages
   - `formatListResponse`: For lists of items with pagination
   - `formatRecordResponse`: For single record responses
   - `formatErrorResponse`: For error responses
   - `formatEmptyResponse`: For operations that return no content

2. **Define Standard Response Interface**:
```typescript
interface ToolResponse {
  content: ResponseContent[];
  isError: boolean;
  error?: {
    code: number;
    message: string;
    type: string;
    details?: any;
  };
  metadata?: Record<string, any>;
}
```

3. **Update Existing API Operations**:
   - Refactor all API operations to use the new formatting utilities
   - Ensure consistent error handling
   - Add metadata to responses where appropriate

## Benefits
- **Consistency**: All API responses will follow the same structure
- **Maintainability**: Changes to response format only need to be made in one place
- **Extensibility**: Easy to add new response types or extend existing ones
- **Developer Experience**: Improved predictability makes integration easier
- **Testing**: Simplified testing of response structures

## Implementation Details

### New Response Formatting Utility

```typescript
// src/utils/response-formatter.ts

export function formatSuccessResponse(message: string, metadata?: Record<string, any>): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: message
      }
    ],
    isError: false,
    metadata
  };
}

export function formatListResponse<T>(
  title: string,
  items: T[],
  formatter: (item: T) => string,
  pagination?: { total?: number; hasMore?: boolean; nextCursor?: string },
  metadata?: Record<string, any>
): ToolResponse {
  const itemsText = items.length > 0
    ? items.map(formatter).join('\n')
    : 'No items found';
  
  const countText = pagination?.total !== undefined
    ? `${items.length} of ${pagination.total} total`
    : `${items.length}`;
  
  return {
    content: [
      {
        type: 'text',
        text: `${title}:\n${itemsText}\n\nShowing ${countText} items${pagination?.hasMore ? '. More items available.' : '.'}`
      }
    ],
    isError: false,
    metadata: {
      items,
      pagination,
      ...metadata
    }
  };
}

// Additional formatters...
```

### Example Usage in API Operations

```typescript
// Before
export async function searchPeople(query: string): Promise<ToolResponse> {
  try {
    const results = await searchObject<Person>(ResourceType.PEOPLE, query);
    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} people matching '${query}':\n\n${formatPeopleList(results)}`
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error searching for people: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

// After
export async function searchPeople(query: string): Promise<ToolResponse> {
  try {
    const results = await searchObject<Person>(ResourceType.PEOPLE, query);
    return formatListResponse(
      `Found people matching '${query}'`,
      results,
      formatPersonItem,
      { total: results.length }
    );
  } catch (error) {
    return formatErrorResponse(
      `Error searching for people: ${error.message}`,
      error.status || 500,
      error.type || 'unknown_error',
      error.details
    );
  }
}
```

## Acceptance Criteria
- [ ] Create `response-formatter.ts` with standard formatting functions
- [ ] Implement formatters for success, list, record, error, and empty responses
- [ ] Update all API operations to use the new formatters
- [ ] Add comprehensive unit tests for the formatting utilities
- [ ] Update documentation to reflect the standardized response format
- [ ] Ensure backward compatibility for existing clients

## Related Issues
- #6 Enhance error handling and response formatting
- #12 Improve API operation consistency

## Additional Resources
- [Model Context Protocol Response Format](https://www.modelcontextprotocol.ai/docs/responses) (fictitious link)
- [RESTful API Response Standards](https://restfulapi.net/http-status-codes/)
```

## Key Elements for Enhancement Issues

### 1. Title
Use a clear title with the "Enhancement:" prefix, followed by a concise description of the proposed improvement.

### 2. Overview
Provide a brief summary of the enhancement and its purpose.

### 3. Problem Statement
Clearly describe:
- The current limitations or issues
- Why an enhancement is needed
- The benefits it will bring

### 4. Current State
Document the existing implementation with examples if relevant.

### 5. Proposed Enhancement
Outline the proposed changes in detail:
- New functionality to be added
- Changes to existing functionality
- Technical approach

### 6. Benefits
List specific benefits the enhancement will bring to users and developers.

### 7. Implementation Details
Provide technical specifications:
- Code examples
- New interfaces or classes
- Changes to existing code
- Migration strategy

### 8. Acceptance Criteria
List specific criteria that must be met for the enhancement to be considered complete.

### 9. Related Issues
Link to any related issues or dependencies.

### 10. Additional Resources
Include references to relevant documentation, standards, or examples.

## Best Practices for Enhancement Issues

1. **Focus on value**: Clearly articulate the benefits of the enhancement.

2. **Be specific**: Provide detailed requirements and implementation guidance.

3. **Consider impacts**: Address potential impacts on existing functionality.

4. **Keep scope reasonable**: Avoid cramming too many changes into a single enhancement.

5. **Include examples**: Use code examples to illustrate the proposed changes.

6. **Consider alternatives**: Acknowledge alternative approaches and explain your choice.

7. **Address technical debt**: If the enhancement addresses technical debt, explain how.

8. **Think about testing**: Include considerations for testing the enhancement.