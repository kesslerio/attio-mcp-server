# Example of Well-Structured Issue Documentation

This document demonstrates best practices for creating comprehensive issues in the repository.

## Complete Issue Template Example

Below is a full example of a well-structured issue using all recommended elements:

```markdown
# Feature: Implement API Call Retry Logic

## Overview
This issue focuses on implementing a robust retry mechanism for API calls to handle transient errors and rate limiting from the Attio API.

## Problem Statement
Currently, the Attio MCP Server does not handle transient errors gracefully. When API calls fail due to temporary issues like network interruptions or rate limiting, the server reports an error to the user instead of retrying the request. This leads to a poor user experience and reduces the reliability of the system.

We need a robust retry mechanism that:
- Automatically retries failed API calls with exponential backoff
- Handles different error types appropriately
- Avoids retrying non-transient errors (e.g., authentication failures)
- Allows configurable retry parameters (attempts, delays, etc.)

## Goals
- Implement a `callWithRetry` utility function with configurable parameters
- Add intelligent retry decision logic based on error type
- Update all API operations to use the retry mechanism
- Ensure proper logging of retry attempts
- Maintain backward compatibility with existing code
- Improve overall system resilience against temporary failures

## Implementation Details
This implementation will add a new utility function and update existing API calls.

### Required Changes

1. **Create RetryConfig Interface**
   ```typescript
   export interface RetryConfig {
     maxRetries: number;
     initialDelay: number;
     maxDelay: number;
     useExponentialBackoff: boolean;
     retryableStatusCodes: number[];
   }
   ```

2. **Implement callWithRetry Function**
   ```typescript
   export async function callWithRetry<T>(
     fn: () => Promise<T>,
     config: Partial<RetryConfig> = {}
   ): Promise<T> {
     // Merge with default config
     const retryConfig: RetryConfig = {
       ...DEFAULT_RETRY_CONFIG,
       ...config
     };
     
     let attempt = 0;
     let lastError: any;
     
     while (attempt <= retryConfig.maxRetries) {
       try {
         return await fn();
       } catch (error) {
         lastError = error;
         
         // Check if we should retry
         if (attempt >= retryConfig.maxRetries || !isRetryableError(error, retryConfig)) {
           throw error;
         }
         
         // Calculate delay and wait before retrying
         const delay = calculateRetryDelay(attempt, retryConfig);
         await sleep(delay);
         
         attempt++;
       }
     }
     
     throw lastError;
   }
   ```

3. **Update API Operations**
   ```typescript
   export async function searchObject<T extends AttioRecord>(
     objectType: ResourceType, 
     query: string,
     retryConfig?: Partial<RetryConfig>
   ): Promise<T[]> {
     const api = getAttioClient();
     const path = `/objects/${objectType}/records/query`;
     
     return callWithRetry(async () => {
       // Existing implementation...
     }, retryConfig);
   }
   ```

4. **Add Helper Functions**
   - `calculateRetryDelay`: Calculate delay time with exponential backoff and jitter
   - `isRetryableError`: Determine if an error is retryable based on type and status code
   - `sleep`: Promisified sleep function for delays

## Acceptance Criteria
- [ ] `callWithRetry` function is implemented with configurable parameters
- [ ] Default retry configuration is defined with reasonable values
- [ ] All API operations in `attio-operations.ts` use the retry mechanism
- [ ] Retry logic includes exponential backoff with jitter
- [ ] Unit tests verify that retries are performed correctly
- [ ] Retry attempts are logged in development mode
- [ ] Non-retryable errors (e.g., authentication failures) are not retried
- [ ] Documentation is updated to explain the retry mechanism

## Related Issues
- #4 Error handling improvements
- #5 Network resilience enhancements

## Additional Resources
- [Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Attio API Rate Limits](https://developers.attio.com/docs/rate-limits)
```

## Key Elements Explained

### 1. Title
Use a clear, descriptive title with a prefix indicating the issue type:
- `Feature:` for new features
- `Fix:` for bug fixes
- `Docs:` for documentation changes
- `Refactor:` for code restructuring
- `Test:` for adding or updating tests
- `Chore:` for maintenance tasks

### 2. Overview
Provide a concise summary (2-3 sentences) of what the issue addresses, giving readers immediate context.

### 3. Problem Statement
Clearly articulate:
- The current situation or problem
- Why it needs addressing
- The impact of not addressing it
- Any constraints or requirements

### 4. Goals
List specific, measurable objectives that solving this issue should achieve. These should be focused on outcomes rather than implementation details.

### 5. Implementation Details
Provide technical guidance including:
- Required changes with specific file locations
- Code examples where helpful
- Step-by-step approach to implementation
- Potential challenges and solutions

### 6. Acceptance Criteria
List specific, testable conditions that must be satisfied to consider the issue resolved. Format these as a checklist that can be marked off as items are completed.

### 7. Related Issues
Link to any related issues or PRs to provide additional context and help establish dependencies.

### 8. Additional Resources
Include links to relevant documentation, articles, or tools that might help with implementation.

## Issue Template Structure

For consistency, issues should generally follow this structure:

```markdown
# [Type]: [Short Descriptive Title]

## Overview
[Concise summary of the issue]

## Problem Statement
[Detailed description of the problem]

## Goals
- [Goal 1]
- [Goal 2]
- [Goal n]

## Implementation Details
[Technical implementation guidance]

### Required Changes
1. [Change 1]
2. [Change 2]
3. [Change n]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion n]

## Related Issues
- [Issue link 1]
- [Issue link 2]

## Additional Resources
- [Resource link 1]
- [Resource link 2]
```

## Best Practices

### Issue Clarity
- Be specific and avoid vague language
- Use concrete examples to illustrate problems
- Include expected vs. actual behavior for bugs
- Link to relevant documentation

### Code Examples
- Use proper markdown code blocks with language syntax highlighting
- Include before/after examples where applicable
- Keep code examples concise but complete enough to be useful

### Visual Aids
- Include screenshots or diagrams for UI-related issues
- Use flowcharts for complex process changes
- Mark up screenshots to highlight specific areas of interest

### Issue Tracking
- Use appropriate labels for categorization
- Assign priority levels based on impact and urgency
- Link related issues to establish dependencies
- Update issues regularly with progress

## Using GitHub Features

### Labels
Use labels to categorize issues:
- `bug`: Something isn't working as expected
- `feature`: New functionality
- `enhancement`: Improvements to existing features
- `documentation`: Documentation updates
- `P0` through `P4`: Priority levels

### Projects
Organize related issues into projects for better tracking:
- Create a project for each major release or milestone
- Use project boards to visualize workflow stages
- Automate transitions when possible

### Milestones
Group issues into meaningful milestones with deadlines:
- Version releases (e.g., "v1.0.0")
- Project phases (e.g., "Phase 1: Core API")
- Time-based sprints (e.g., "Sprint 5")

## Common Mistakes to Avoid

1. **Vague Descriptions**
   - Bad: "The API doesn't work sometimes"
   - Good: "The API returns 429 errors during high-traffic periods and doesn't retry"

2. **Missing Context**
   - Bad: "We need to implement retry logic"
   - Good: "We need to implement retry logic to handle transient 429 and 5xx errors from the Attio API"

3. **Ambiguous Acceptance Criteria**
   - Bad: "Code should work better"
   - Good: "API calls retry up to 3 times with exponential backoff when receiving 429 or 5xx status codes"

4. **Overloaded Issues**
   - Bad: One issue covering multiple unrelated changes
   - Good: Separate issues for distinct changes, linked if related

5. **No Implementation Guidance**
   - Bad: "Fix the error handling"
   - Good: Specific code snippets or references to files/methods that need changes