# Issue #90: Split companies.ts - Instructions for Claude

## Context
You are working on Issue #90: "Refactor: Split people.ts and companies.ts into focused modules"
This is the **companies module** worktree.

## Current Directory
You are in worktree: `/Users/kesslerio/GDrive/Projects/.worktrees/issue-90-companies-module`

## Problem
The file `src/objects/companies.ts` has grown to 1,161 lines and mixes multiple responsibilities:
- Basic CRUD operations
- Complex search functionality
- Relationship queries
- Batch operations
- Note management
- Attribute management

## Your Task

### 1. Create the new directory structure:
```
src/objects/companies/
├── basic.ts         # Basic CRUD operations
├── search.ts        # Search functionality
├── relationships.ts # Relationship queries
├── batch.ts         # Batch operations
├── notes.ts         # Note operations
├── attributes.ts    # Attribute management
├── types.ts         # Shared types
└── index.ts         # Central export point
```

### 2. Split the code into modules:

#### `basic.ts` should contain:
- `createCompany()`
- `updateCompany()`
- `updateCompanyAttribute()`
- `deleteCompany()`
- `getCompanyDetails()`
- `extractCompanyId()`
- Basic validation functions

#### `search.ts` should contain:
- `searchCompanies()`
- `advancedSearchCompanies()`
- `createNameFilter()`
- `createWebsiteFilter()`
- Search-related helper functions

#### `relationships.ts` should contain:
- `searchCompaniesByPeople()`
- `searchCompaniesByPeopleList()`
- `searchCompaniesByNotes()`
- All relationship-based searches

#### `batch.ts` should contain:
- Moved to separate file already as `batch-companies.ts`
- Just re-export from there

#### `notes.ts` should contain:
- `getCompanyNotes()`
- `createCompanyNote()`
- Note-related utilities

#### `attributes.ts` should contain:
- `getCompanyAttributes()`
- `discoverCompanyAttributes()`
- `getCompanyCustomFields()`
- `getCompanyFields()`
- `getCompanyBasicInfo()`
- `getCompanyContactInfo()`
- `getCompanyBusinessInfo()`
- `getCompanySocialInfo()`

#### `types.ts` should contain:
- Shared interfaces
- Type definitions specific to companies
- Export common types

#### `index.ts` should:
- Re-export all public functions
- Re-export from `batch-companies.ts`
- Maintain backward compatibility
- Group exports logically

### 3. Guidelines:
- Note that batch operations are already in `batch-companies.ts`
- Preserve all existing functionality
- Update imports throughout the codebase
- Add module-level JSDoc comments
- Ensure proper TypeScript types

### 4. Import Updates:
Find and update all imports from:
```typescript
import { ... } from '../objects/companies.js';
```
to:
```typescript
import { ... } from '../objects/companies/index.js';
```

### 5. Testing:
After refactoring, verify:
- All functions are accessible
- Batch operations still work
- No circular dependencies
- Tests still pass

### 6. Commit Message Format:
```
Refactor: Split companies.ts into focused modules (Issue #90)

- Created modular structure for company operations
- Separated CRUD, search, relationships, notes, and attributes
- Integrated existing batch-companies module
- Maintained backward compatibility
- Updated all imports

Part of #90
```

## Special Notes
- Batch operations already exist in `batch-companies.ts`
- The companies file is larger (1,161 lines) than people (804 lines)
- Has additional attribute management functions