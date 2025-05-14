# GitHub Templates Guide

This guide explains how to use the GitHub issue and pull request templates provided in the Attio MCP Server repository.

## Overview

GitHub templates streamline the process of creating issues and pull requests by providing standard formats that include all necessary information. Our repository includes the following templates:

1. **Bug Report Template**: For reporting bugs and unexpected behavior
2. **Feature Request Template**: For suggesting new features or enhancements
3. **Documentation Improvement Template**: For suggesting documentation changes
4. **Pull Request Template**: For submitting code changes

## Using Issue Templates

When you create a new issue on GitHub, you'll be prompted to choose a template:

![Issue Template Selection](https://mermaid.ink/img/pako:eNptkc1qwzAQhF9F7CmFuKbgHkJpodBrT7308ktZyyhW5Z-V5EAIeffKdhzSQ2-r0c43s94BNauIAdY4MHdQNdoLpJBtVgA2TAfMDyjpljK5hmP6kXnX2qrPhc9Uk6nIUGndDZ_wXIIeVXpYYSbjZvT5AZ5OSVZrT2myfyDbU3dSfYhiAX9oTJcUqN8HkbEA-NxcPl36uG1Gh7NWKsucHRjrQX3B0ctuILVg9dtJmcP-pXBJ_VJhLsmIZZXP1Ib4G7L6bcqxGvdvVPNsYDdnYdx9jmYj-YVq3IY0aCzKXZMpZJDIFzTv5S40D31qCCLI1Gp0E2vg9uAJPDIJ8WBxBUzx7XxXCIkp3MECmVN3nRVNhvb6D7OYm1w?type=png)

### Bug Report Template

Use this template to report problems with the MCP Server:

1. Enter a clear, specific title that starts with "Bug: "
2. Fill in the reproduction steps in numbered order
3. Describe both expected and actual behavior
4. Provide environment information
5. Include error logs if available
6. Assess the impact of the bug

Example:
```markdown
## Bug Description
The MCP Server crashes when searching for people with multiple email addresses.

## Reproduction Steps
1. Start the MCP Server
2. Send a search request to `/api/people/search` with `{ "query": "email:*" }`
3. Server crashes with "Cannot read property 'length' of undefined"

## Expected Behavior
The server should return all people with email addresses.

## Actual Behavior
The server crashes with an unhandled exception.

## Environment Information
- MCP Server Version: 1.2.0
- Node.js Version: 18.15.0
- Operating System: Ubuntu 22.04
- Deployment Method: Docker
- Attio API Version: v2

## Error Logs
```
TypeError: Cannot read property 'length' of undefined
    at SearchController.searchPeople (/app/src/controllers/search.js:123)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)
```

## Impact
- [x] Blocker - Prevents core functionality from working
```

### Feature Request Template

Use this template to suggest new features:

1. Enter a title that starts with "Feature: "
2. Clearly describe the feature and its use case
3. Suggest a potential implementation approach
4. Assess the priority level

Example:
```markdown
## Feature Description
Add support for bulk operations on people records.

## Use Case
When managing large sets of contacts, administrators need to be able to update, tag, or categorize multiple records at once to save time.

## Proposed Solution
Implement new endpoints for bulk operations:
- POST /api/people/bulk/update
- POST /api/people/bulk/delete
- POST /api/people/bulk/tag

Each endpoint would accept an array of record IDs and the operation to perform.

## Example Implementation
```javascript
// Example API call
const response = await fetch('/api/people/bulk/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ids: ['person_123', 'person_456', 'person_789'],
    data: {
      status: 'active',
      category: 'lead'
    }
  })
});
```

## Priority Assessment
- [x] P2 - High (Important enhancement)
```

### Documentation Improvement Template

Use this template to suggest documentation changes:

1. Enter a title that starts with "Docs: "
2. Identify the specific documentation that needs improvement
3. Clearly describe what should be changed or added
4. Provide example content if possible

Example:
```markdown
## Documentation Issue
The authentication documentation lacks examples for token refresh flows.

## Affected Documentation
The Authentication Guide at docs/api/authentication.md

## Suggested Improvement
Add a new section titled "Token Refresh Flow" that explains how to handle token expiration and refresh tokens.

## Example Content
```markdown
### Token Refresh Flow

When an access token expires, you'll receive a 401 Unauthorized response. Here's how to use the refresh token to get a new access token:

```javascript
async function refreshToken(refreshToken) {
  const response = await fetch('https://api.attio.com/v2/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  
  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token
  };
}
```
```

## Impact
- [x] Major - Causes confusion or incorrect implementation
```

## Using the Pull Request Template

When you create a new pull request, the template will automatically be used:

1. Provide a clear title for your PR
2. Reference any related issues
3. Describe the changes made in detail
4. Complete the testing checklist
5. Add any implementation details or screenshots that would help reviewers

Example:
```markdown
## Pull Request Description
Add rate limiting to the People API endpoints to prevent abuse and ensure service stability.

## Related Issues
Closes #42

## Changes Made
- Added a token bucket rate limiter middleware
- Applied rate limiting to all People API endpoints (10 requests per minute per API key)
- Added rate limit headers to responses (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- Added documentation for rate limiting behavior

## Testing Performed
- [x] Unit tests added/updated
- [x] Integration tests added/updated
- [x] Manual testing performed
- [x] Test coverage maintained or improved

## Implementation Details
The rate limiter uses a sliding window algorithm with Redis for persistence. This allows the rate limits to work correctly in multi-instance deployments.

## Screenshots
![Rate Limit Headers](https://example.com/screenshots/rate-limit-headers.png)
```

## Tips for Effective Issues and PRs

1. **Be Specific**: Provide detailed information to help others understand the issue or change.
2. **One Issue Per Report**: Create separate issues for unrelated problems.
3. **Search First**: Check if an issue already exists before creating a new one.
4. **Use Labels**: Apply appropriate labels to help categorize and prioritize.
5. **Update Status**: Keep the issue updated as you make progress.
6. **Link Related Items**: Link PRs to the issues they address.

## Command Line Usage

You can also create issues and PRs using the GitHub CLI:

```bash
# Create a new bug report
gh issue create --template "bug_report.md" --title "Bug: Search API crashes with multiple email addresses"

# Create a new feature request
gh issue create --template "feature_request.md" --title "Feature: Add bulk operations to People API"

# Create a new PR 
gh pr create --title "Add rate limiting to People API" --body "$(cat .github/PULL_REQUEST_TEMPLATE.md)"
```

## Customizing Templates

Templates can be customized by editing the files in:
- `.github/ISSUE_TEMPLATE/` for issue templates
- `.github/PULL_REQUEST_TEMPLATE.md` for the PR template

When making changes to templates, consider:
- Keeping templates concise but comprehensive
- Adding visual elements like checklists or collapsible sections
- Including links to relevant documentation
- Ensuring the template is accessible to new contributors