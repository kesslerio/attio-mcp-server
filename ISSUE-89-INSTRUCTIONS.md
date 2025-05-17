# Issue #89: Reorganize filters module - Instructions for Claude

## Context
You are working on Issue #89: "Refactor: Reorganize filters module with proper separation"

## Current Directory
You are in worktree: `/Users/kesslerio/GDrive/Projects/.worktrees/issue-89-filters-module`

## Problem
Filter logic is scattered across multiple files:
- `utils/filters/index.ts` (1,059 lines, 28 exports)
- `utils/filter-utils.ts` (511 lines)
- `utils/filter-utils-additions.ts` (132 lines)
- `utils/filter-validation.ts` (321 lines)

## Your Task

### 1. Create the new directory structure:
```
src/utils/filters/
├── types.ts        # Filter type definitions
├── builders.ts     # Filter construction functions
├── validators.ts   # Filter validation logic
├── translators.ts  # API format translation
├── operators.ts    # Filter operator implementations
├── utils.ts        # General filter utilities
└── index.ts        # Central export point
```

### 2. Consolidate and split the code:

#### `types.ts` should contain:
- All filter-related interfaces
- Type definitions from current files
- Enums and constants
- Move types from:
  - `filters/index.ts`
  - `filter-utils.ts`
  - `filter-validation.ts`

#### `builders.ts` should contain:
- Filter construction functions
- `createFilter()`
- `buildComplexFilter()`
- `createFilterFromAttributes()`
- Helper methods for building filters

#### `validators.ts` should contain:
- All validation logic from `filter-validation.ts`
- `validateFilterStructure()`
- `validateFilterConditions()`
- Constraint checking
- Error handling for invalid filters

#### `translators.ts` should contain:
- `transformFiltersToApiFormat()`
- `convertOperatorToApiFormat()`
- Format conversion utilities
- API-specific transformations

#### `operators.ts` should contain:
- Filter operator implementations
- Logical operators (AND, OR, NOT)
- Comparison operators
- Operator mapping functions

#### `utils.ts` should contain:
- Merge utilities from:
  - `filter-utils.ts`
  - `filter-utils-additions.ts`
- General helper functions
- Common filter utilities

#### `index.ts` should:
- Re-export everything needed
- Maintain backward compatibility
- Provide the same API surface

### 3. Migration Steps:
1. Create new directory structure
2. Move types first (foundation)
3. Consolidate validation logic
4. Merge utilities from scattered files
5. Extract operators and builders
6. Update all imports in codebase
7. Delete old files after verification

### 4. Files to Remove After Migration:
- `utils/filter-utils.ts`
- `utils/filter-utils-additions.ts`
- `utils/filter-validation.ts`
- Old content from `utils/filters/index.ts`

### 5. Guidelines:
- Eliminate duplicate code
- Ensure consistent naming
- Add JSDoc comments
- Test each module independently
- Check for circular dependencies

### 6. Testing:
After refactoring, verify:
- All filter operations work
- No missing functionality
- Tests pass
- No duplicate exports

### 7. Commit Message Format:
```
Refactor: Reorganize filters module with proper separation (Issue #89)

- Consolidated scattered filter logic into organized modules
- Created clear separation: types, builders, validators, translators
- Eliminated code duplication
- Removed obsolete files
- Updated all imports

Closes #89
```

## Priority Order:
1. Create types.ts first (foundation)
2. Move validation logic to validators.ts
3. Consolidate utilities in utils.ts
4. Extract builders and operators
5. Create translators.ts
6. Update index.ts
7. Update all imports
8. Remove old files