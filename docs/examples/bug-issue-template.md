# Example Bug Issue Template

This document demonstrates a well-structured bug issue report.

## Bug Issue Template Example

```markdown
# Fix: People Search Not Working with Email Addresses

## Overview
The `search-people` tool fails to find people when searching by email address, even when the email exists in the database.

## Problem Statement
When users search for people using an email address (e.g., "john@example.com"), the search returns no results despite the person existing in the database. This issue only occurs when searching by email - searching by name works correctly.

Investigation shows that the search filter in `src/objects/people.ts` only searches the `name` field, ignoring `email` and `phone` fields.

## Steps to Reproduce
1. Create a person in Attio with email "john@example.com"
2. Use the `search-people` tool with query "john@example.com"
3. Observe that no results are returned

## Expected Behavior
The search should return the person with the matching email address.

## Current Behavior
The search returns no results when searching by email.

## Root Cause
In `src/objects/people.ts`, the `searchPeople` function only includes the `name` field in the search filter:

```typescript
export async function searchPeople(query: string): Promise<Person[]> {
  return searchObject<Person>(ResourceType.PEOPLE, query);
}
```

The underlying `searchObject` function in `src/api/attio-operations.ts` only searches by name:

```typescript
// Current implementation
const filter = {
  name: { "$contains": query }
};
```

## Proposed Solution
Update the `searchObject` function in `src/api/attio-operations.ts` to search by email and phone when the object type is 'people':

```typescript
// Updated implementation
let filter = {};

if (objectType === ResourceType.PEOPLE) {
  // For people, search by name, email, or phone
  filter = {
    "$or": [
      { name: { "$contains": query } },
      { email: { "$contains": query } },
      { phone: { "$contains": query } }
    ]
  };
} else {
  // For other types (like companies), search by name only
  filter = {
    name: { "$contains": query }
  };
}
```

## Acceptance Criteria
- [ ] The `searchObject` function is updated to search people by name, email, and phone
- [ ] Tests are updated to verify that searching by email works correctly
- [ ] Documentation is updated to reflect that people can be searched by email or phone
- [ ] All existing tests pass

## Environment
- Node.js version: v18.12.1
- Attio API version: v2
- Operating System: macOS 12.6

## Related Issues
- #15 Enhance People search functionality
- #22 Improve search relevance
```

## Key Elements for Bug Reports

### 1. Title
Use a clear title with the "Fix:" prefix for bug issues, followed by a concise description of the problem.

### 2. Overview
Provide a brief summary of the bug and its impact.

### 3. Problem Statement
Clearly describe:
- What's not working
- The impact on users
- When the issue occurs

### 4. Steps to Reproduce
List exact, numbered steps to reproduce the issue. Include any specific data or context needed.

### 5. Expected vs. Current Behavior
Clearly contrast what should happen with what actually happens.

### 6. Root Cause
If known, describe the technical cause of the issue. Include code snippets when helpful.

### 7. Proposed Solution
Outline a potential fix with code examples when appropriate.

### 8. Acceptance Criteria
List specific criteria that must be met to consider the bug fixed.

### 9. Environment
Specify relevant technical details:
- Node.js version
- API version
- OS version
- Browser version (if relevant)
- Device information (if relevant)

### 10. Related Issues
Link to any related issues or PRs for context.

## Best Practices for Bug Reports

1. **Be specific**: Provide exact details about the problem, not vague descriptions.

2. **Include context**: Explain the circumstances when the bug occurs.

3. **Provide reproduction steps**: Make it easy for developers to recreate the issue.

4. **Include visual evidence**: When applicable, add screenshots or videos.

5. **Check for duplicates**: Search for existing issues before creating a new one.

6. **Use appropriate labels**: Tag the issue with relevant labels like `bug`, `priority`, etc.

7. **Avoid assumptions**: Report what you observe, not your interpretation of why it happens (unless you're certain).

8. **Test isolation**: Verify the bug isn't caused by other factors (extensions, custom configurations, etc.).

9. **Follow up**: Be responsive to requests for additional information.