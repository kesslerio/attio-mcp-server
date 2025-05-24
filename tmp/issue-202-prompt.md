# Issue #202: Enhancement - Implement Structured Logging System

Please help me implement GitHub issue #202 "Enhancement: Implement structured logging system to replace console methods".

## Issue Summary
Replace current console.log/console.error usage with a proper structured logging library (Pino recommended) for better production logging capabilities, performance optimization, and observability.

## Your Current Context
You are working in the git worktree at `/Users/kesslerio/GDrive/Projects/attio-mcp-server-issue-202` on branch `enhancement/structured-logging-system-202`.

**IMPORTANT:** All git commands must be run from this worktree directory and target the `enhancement/structured-logging-system-202` branch, NOT `main`.

## Current State Analysis
- All debug output correctly routed to stderr via console.error
- Development-only logging gated with `process.env.NODE_ENV` checks  
- Verbose object serialization in some hot paths
- No log levels or structured logging

## Implementation Plan

Please follow these steps:

1. **Analyze current state**:
   ```bash
   cd /Users/kesslerio/GDrive/Projects/attio-mcp-server-issue-202
   gh issue view 202
   ```

2. **Research and install logging library**:
   ```bash
   # Install Pino for high-performance structured logging
   npm install pino
   npm install --save-dev @types/pino
   ```

3. **Create centralized logger configuration**:
   - Create `src/utils/logger.ts` with Pino configuration
   - Implement configurable log levels via environment variables
   - Add structured JSON output for production
   - Include request correlation IDs for tracing

4. **Phase 1: Core API Operations**:
   Replace console methods in:
   - `src/api/operations/crud.ts` - CRUD operation logging
   - `src/api/operations/lists.ts` - List operation logging  
   - `src/api/operations/batch.ts` - Batch operation logging

5. **Phase 2: Tool Handlers**:
   Replace console methods in:
   - `src/handlers/tools/dispatcher/core.ts` - Tool execution logging
   - `src/handlers/tools/registry.ts` - Tool registration logging
   - `src/objects/batch-companies.ts` - Batch operation logging

6. **Phase 3: Performance Optimizations**:
   - Remove verbose JSON.stringify() calls in hot paths
   - Implement lazy evaluation for expensive log operations
   - Add log level filtering to prevent unnecessary serialization

7. **Implementation Example**:
   ```typescript
   // Before (current pattern):
   console.error('[updateRecord] Request path:', path);
   
   // After (structured logging):
   logger.debug('updateRecord request', { 
     path, 
     operation: 'updateRecord',
     timestamp: new Date().toISOString(),
     correlationId: req.correlationId
   });
   ```

8. **Build and test**:
   ```bash
   # Install dependencies
   npm install
   
   # Verify TypeScript compilation
   npm run build
   
   # Run tests to ensure no regressions
   npm test
   
   # Test logging in development
   NODE_ENV=development npm start
   
   # Test logging in production mode
   NODE_ENV=production npm start
   ```

9. **Commit systematically**:
   ```bash
   # Verify branch
   git branch --show-current  # Should show: enhancement/structured-logging-system-202
   
   # Commit logger infrastructure
   git add src/utils/logger.ts package.json package-lock.json
   git commit -m "Enhancement: add Pino structured logging infrastructure (#202)"
   
   # Commit API operations updates
   git add src/api/operations/
   git commit -m "Enhancement: replace console methods in API operations with structured logging (#202)"
   
   # Commit tool handlers updates  
   git add src/handlers/tools/
   git commit -m "Enhancement: replace console methods in tool handlers with structured logging (#202)"
   
   # Commit performance optimizations
   git add src/objects/batch-companies.ts
   git commit -m "Enhancement: optimize logging performance in batch operations (#202)"
   
   # Push all commits
   git push origin enhancement/structured-logging-system-202
   ```

10. **Create PR**:
    ```bash
    # Update issue status
    gh issue edit 202 --add-label "status:in-progress"
    
    # Create comprehensive PR
    echo "# Enhancement: Implement structured logging system to replace console methods

    Fixes #202

    ## Summary
    Replaces console.log/console.error usage with Pino structured logging for better production logging, performance, and observability.

    ## Changes
    ### Infrastructure
    - ✅ **src/utils/logger.ts** - Centralized Pino logger configuration
    - ✅ **Configurable log levels** via LOG_LEVEL environment variable
    - ✅ **Structured JSON output** for production log aggregation
    - ✅ **Request correlation IDs** for distributed tracing

    ### API Operations
    - ✅ **src/api/operations/crud.ts** - Structured logging for CRUD operations
    - ✅ **src/api/operations/lists.ts** - Structured logging for list operations
    - ✅ **src/api/operations/batch.ts** - Structured logging for batch operations

    ### Tool Handlers  
    - ✅ **src/handlers/tools/dispatcher/core.ts** - Tool execution logging
    - ✅ **src/handlers/tools/registry.ts** - Tool registration logging
    - ✅ **src/objects/batch-companies.ts** - Batch operation logging

    ### Performance Optimizations
    - ✅ **Lazy evaluation** for expensive log operations
    - ✅ **Log level filtering** to prevent unnecessary serialization
    - ✅ **Reduced overhead** in production hot paths

    ## Configuration
    \`\`\`bash
    # Development (verbose logging)
    LOG_LEVEL=debug NODE_ENV=development npm start

    # Production (minimal logging) 
    LOG_LEVEL=warn NODE_ENV=production npm start
    \`\`\`

    ## Benefits
    - 🚀 **Performance**: Reduced overhead in production
    - 🔍 **Observability**: Better debugging and monitoring capabilities  
    - 🛠️ **Maintainability**: Consistent logging patterns across codebase
    - 📊 **Production Ready**: Proper log aggregation and analysis support
    - 🔗 **Traceability**: Request correlation IDs for distributed tracing

    ## Backward Compatibility
    - ✅ All existing functionality preserved
    - ✅ Development workflows unchanged
    - ✅ No breaking changes to APIs" > /tmp/pr-body-202.md
    
    gh pr create --base main --head enhancement/structured-logging-system-202 --title "Enhancement: implement structured logging system to replace console methods (#202)" --body-file /tmp/pr-body-202.md
    ```

## Key Focus Areas
- **Performance**: Minimal overhead in production hot paths
- **Structure**: Consistent JSON logging format across all modules
- **Configuration**: Environment-based log level control
- **Observability**: Request correlation and proper error context
- **Backward Compatibility**: No breaking changes to existing workflows

## Success Criteria
- [ ] Pino logging library integrated and configured
- [ ] All console.error calls replaced with structured logging
- [ ] Configurable log levels via environment variables  
- [ ] Performance optimizations implemented in hot paths
- [ ] Request correlation IDs for tracing
- [ ] Documentation updated with logging configuration
- [ ] All tests pass with no regressions

This enhancement will significantly improve production observability and performance while maintaining full backward compatibility.