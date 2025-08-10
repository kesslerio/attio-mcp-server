# Issue #90: Split people.ts - Instructions for Claude

## Context
You are working on Issue #90: "Refactor: Split people.ts and companies.ts into focused modules"
This is the **people module** worktree.

## Current Directory
You are in worktree: `/Users/kesslerio/GDrive/Projects/.worktrees/issue-90-people-module`

## Problem
The file `src/objects/people.ts` has grown to 804 lines and mixes multiple responsibilities:
- Basic CRUD operations
- Complex search functionality
- Relationship queries
- Batch operations
- Note management

## Your Task

### 1. Create the new directory structure:
```
src/objects/people/
├── basic.ts        # Basic CRUD operations
├── search.ts       # Search functionality
├── relationships.ts # Relationship queries
├── batch.ts        # Batch operations
├── notes.ts        # Note operations
├── types.ts        # Shared types
└── index.ts        # Central export point
```

### 2. Split the code into modules:

#### `basic.ts` should contain:
- `createPerson()`
- `updatePerson()`
- `updatePersonAttribute()`
- `deletePerson()`
- `getPersonDetails()`
- Basic validation functions

#### `search.ts` should contain:
- `searchPeople()`
- `advancedSearchPeople()`
- `getPersonByEmail()`
- `searchPeopleByPhone()`
- Search-related helper functions

#### `relationships.ts` should contain:
- `searchPeopleByCompany()`
- `searchPeopleByList()`
- `searchPeopleByNotes()`
- All relationship-based searches

#### `batch.ts` should contain:
- `batchSearchPeople()`
- `batchGetPersonDetails()`
- `batchCreatePeople()`
- `batchUpdatePeople()`
- `batchDeletePeople()`

#### `notes.ts` should contain:
- `getPersonNotes()`
- `createPersonNote()`
- Note-related utilities

#### `types.ts` should contain:
- Shared interfaces
- Type definitions specific to people
- Export common types

#### `index.ts` should:
- Re-export all public functions
- Maintain backward compatibility
- Group exports logically

### 3. Guidelines:
- Preserve all existing functionality
- Update imports throughout the codebase
- Add module-level JSDoc comments
- Ensure proper TypeScript types
- Test that all functions still work

### 4. Import Updates:
Find and update all imports from:
```typescript
import { ... } from '../objects/people.js';
```
to:
```typescript
import { ... } from '../objects/people/index.js';
```

### 5. Testing:
After refactoring, verify:
- All functions are accessible
- No circular dependencies
- Tests still pass
- Type definitions work

### 6. Commit Message Format:
```
Refactor: Split people.ts into focused modules (Issue #90)

- Created modular structure for people operations
- Separated CRUD, search, relationships, batch, and notes
- Maintained backward compatibility
- Updated all imports

Part of #90
```

## Dependencies
This refactor depends on the api-operations refactor being complete (which it is).