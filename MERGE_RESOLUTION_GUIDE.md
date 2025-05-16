# Merge Resolution Guide for PRs #94 and #96

## Current State

- **PR #94**: Original company write operations (conflicting with main)
- **PR #96**: Includes everything from PR #94 + fixes (also conflicting)
- Both PRs have significant conflicts due to divergence from main

## The Problem

1. Both PRs modify the same core files extensively
2. Main branch has evolved significantly since these PRs were created
3. The conflicts involve both file deletions and content changes
4. PR #96 already contains all of PR #94's work

## Recommended Solution

### Step 1: Comment on PR #94
```
This PR has been superseded by #96 which includes all these changes plus additional fixes for the services field issue.
Closing in favor of #96.
```

### Step 2: Fix PR #96
```bash
# 1. Checkout the PR branch
git checkout fix/pr94-services-field-dynamic-detection

# 2. Create a backup branch
git checkout -b fix/pr96-backup

# 3. Go back to the original branch
git checkout fix/pr94-services-field-dynamic-detection

# 4. Rebase interactively on main
git rebase -i main

# 5. Resolve conflicts file by file:
# - Keep the new implementations from the PR
# - Remove any dist/ files (they'll be rebuilt)
# - Ensure all new features are preserved

# 6. After resolving all conflicts
git rebase --continue

# 7. Force push the updated branch
git push --force origin fix/pr94-services-field-dynamic-detection
```

### Step 3: Clean Up PR #96 Description
Update the PR description to clarify:
- It includes all company write operations from PR #94
- Fixes the services field issue
- Fixes null value handling
- Resolves conflicts with main

## Key Files to Watch During Conflict Resolution

1. **src/objects/companies.ts**
   - Contains new write operations
   - Has dynamic field detection
   - Must preserve all new functions

2. **src/validators/company-validator.ts**
   - New validation logic
   - Null value fix
   - Services field handling

3. **src/handlers/tool-configs/companies.ts**
   - New MCP tools for company operations
   - Field handling improvements

4. **src/api/attribute-types.ts**
   - New file for dynamic field detection
   - Critical for the fixes

## Testing After Resolution

```bash
# 1. Build the project
npm run build

# 2. Run all tests
npm test

# 3. Test specific functionality
npm test -- companies.test.ts
npm test -- company-validator

# 4. Manual testing with Claude Desktop
# Test company creation, updates, and null values
```

## Alternative: Create a Fresh PR

If rebasing is too complex:

1. Create a new branch from main
2. Manually apply the changes from PR #96
3. Ensure all tests pass
4. Create a new PR that references both #94 and #96
5. Close both original PRs

This might be cleaner given the extensive conflicts.