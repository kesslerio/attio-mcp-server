# Issue #259: Critical - Fix create-company tool handler

Please help me implement a **CRITICAL** fix for GitHub issue #259 "Critical: create-company tool handler not implemented in dispatcher".

## Issue Summary
The `create-company` tool is completely broken and failing with:
```
Error executing tool 'create-company': Tool handler not implemented for tool type: create
```

This is a **P0 CRITICAL** issue affecting core company creation functionality.

## Root Cause
The dispatcher in `src/handlers/tools/dispatcher/core.ts` is missing handlers for multiple tool types:
- ✅ Currently handles: search, searchByEmail, searchByPhone, smartSearch, details, notes, createNote, getLists
- ❌ **MISSING**: create, update, delete, batchCreate, batchUpdate, and others

## Your Current Context
You are working in the git worktree at `/Users/kesslerio/GDrive/Projects/attio-mcp-server-issue-259` on branch `fix/create-company-tool-handler-259`.

**IMPORTANT:** All git commands must be run from this worktree directory and target the `fix/create-company-tool-handler-259` branch, NOT `main`.

## Implementation Plan

Please follow these steps:

1. **Analyze the current state**:
   ```bash
   cd /Users/kesslerio/GDrive/Projects/attio-mcp-server-issue-259
   gh issue view 259
   ```

2. **Examine the dispatcher implementation**:
   - Read `src/handlers/tools/dispatcher/core.ts`
   - Identify the missing tool handlers around line 99
   - Review existing tool configurations to understand the pattern

3. **Implement the missing handlers**:
   - Add `create` tool handler (PRIORITY)
   - Add `update` tool handler  
   - Add `delete` tool handler
   - Add any other missing handlers identified

4. **Follow the existing pattern**:
   - Look at how existing handlers like `details`, `notes` are implemented
   - Use proper TypeScript types from `tool-types.js`
   - Ensure error handling consistency

5. **Test the fix**:
   - Verify TypeScript compilation: `npm run build`
   - Run relevant tests to ensure no regressions
   - Test the specific create-company functionality

6. **Commit and create PR**:
   ```bash
   # Verify you're on the correct branch
   git branch --show-current  # Should show: fix/create-company-tool-handler-259
   
   # Stage changes
   git add src/handlers/tools/dispatcher/core.ts
   
   # Commit with clear message
   git commit -m "Fix: implement missing create/update/delete tool handlers in dispatcher (#259)
   
   - Add create tool handler to fix critical create-company functionality
   - Add update and delete handlers for completeness  
   - Maintain existing error handling patterns
   - Fixes core company creation functionality"
   
   # Push to remote
   git push origin fix/create-company-tool-handler-259
   ```

7. **Update GitHub issue and create PR**:
   ```bash
   # Update issue status
   gh issue edit 259 --add-label "status:in-progress"
   
   # Create pull request
   echo "# Fix: Implement missing create/update/delete tool handlers in dispatcher

   Fixes #259 

   ## Problem
   The create-company tool was failing with 'Tool handler not implemented for tool type: create' because the dispatcher was missing handlers for several core tool types.

   ## Solution  
   - Added create tool handler to fix critical company creation functionality
   - Added update and delete handlers for completeness
   - Maintained existing error handling patterns and TypeScript types
   - Followed established handler implementation patterns

   ## Testing
   - ✅ TypeScript compilation passes
   - ✅ Core create-company functionality restored
   - ✅ No regressions in existing handlers

   ## Impact
   - 🔧 **CRITICAL FIX**: create-company tool now works properly
   - 🔧 Enhanced: update and delete tools also implemented
   - 🔧 Consistent: All handlers follow same error handling pattern" > /tmp/pr-body-259.md
   
   gh pr create --base main --head fix/create-company-tool-handler-259 --title "Fix: implement missing create/update/delete tool handlers in dispatcher (#259)" --body-file /tmp/pr-body-259.md
   ```

## Key Focus Areas
- **CRITICAL**: The `create` handler is the immediate priority
- **Pattern matching**: Follow existing handler implementations  
- **Error handling**: Maintain consistent error patterns
- **TypeScript**: Use proper types from tool-types.js
- **Testing**: Verify the fix works without breaking existing functionality

## Success Criteria
- [ ] create-company tool works successfully
- [ ] update/delete handlers implemented  
- [ ] TypeScript compilation passes
- [ ] No regressions in existing functionality
- [ ] PR created and ready for review

Work efficiently - this is a critical production issue affecting core functionality!