# Issue #88: Split attio-operations.ts - Instructions for Claude

## Context
You are working on Issue #88: "Refactor: Split attio-operations.ts into focused modules"

## Current Directory
You are in worktree: `/Users/kesslerio/GDrive/Projects/.worktrees/issue-88-split-attio-operations`

## Problem
The file `src/api/attio-operations.ts` has grown to 1,169 lines with 31 exports, handling ALL API operations for every entity type.

## Your Task

### 1. Create the new directory structure:
```
src/api/operations/
├── search.ts       # Search-related functions
├── crud.ts         # Basic CRUD operations
├── notes.ts        # Note operations
├── lists.ts        # List operations
├── batch.ts        # Batch operation utilities
├── retry.ts        # Retry logic
├── types.ts        # Shared type definitions
└── index.ts        # Central export point
```

### 2. Split the code into modules:

#### `search.ts` should contain:
- `searchObject()`
- `advancedSearchObject()`
- Related helper functions
- Search-specific types

#### `crud.ts` should contain:
- `createObjectRecord()`
- `updateObjectRecord()`
- `deleteObjectRecord()`
- `getObjectDetails()`
- CRUD helper functions

#### `notes.ts` should contain:
- `getObjectNotes()`
- `createObjectNote()`
- Note-specific types

#### `lists.ts` should contain:
- `getAllLists()`
- `getListDetails()`
- `getListEntries()`
- `addRecordToList()`
- List operation helpers

#### `batch.ts` should contain:
- `batchSearchObjects()`
- `batchGetObjectDetails()`
- `executeBatchOperations()`
- Batch operation types
- `DEFAULT_BATCH_CONFIG`

#### `retry.ts` should contain:
- `callWithRetry()`
- `calculateRetryDelay()`
- `isRetryableError()`
- Retry configuration types
- `DEFAULT_RETRY_CONFIG`

#### `types.ts` should contain:
- Shared interfaces
- Common type definitions
- Exported types used across modules

#### `index.ts` should:
- Re-export everything for backward compatibility
- Maintain the same API surface
- Export types from types.ts

### 3. Guidelines:
- Use proper imports between modules
- Maintain all existing functionality
- Update imports throughout the codebase
- Add JSDoc comments for each module
- Ensure no circular dependencies

### 4. Testing:
After refactoring, verify:
- All functions still work
- No missing exports
- Imports are correctly updated
- Tests still pass

### 5. Update Import Statements:
Find and update all imports from:
```typescript
import { ... } from '../api/attio-operations.js';
```
to:
```typescript
import { ... } from '../api/operations/index.js';
```

### 6. Commit Message Format:
```
Refactor: Split attio-operations.ts into focused modules (Issue #88)

- Created modular structure for API operations
- Separated search, CRUD, notes, lists, batch, and retry logic
- Maintained backward compatibility
- Updated all imports throughout codebase

Closes #88
```

## Priority Order:
1. First extract retry.ts (foundational)
2. Then types.ts (shared dependencies)
3. Then split by feature: search, crud, notes, lists, batch
4. Finally create index.ts
5. Update all imports