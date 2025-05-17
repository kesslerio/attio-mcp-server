# Issue #93: Refactor tool config files - Instructions for Claude

## Context
You are working on Issue #93: "Refactor: Break down large tool config files"

## Current Directory
You are in worktree: `/Users/kesslerio/GDrive/Projects/.worktrees/issue-93-split-configs`

## Problem
Large tool configuration files need to be split:
- `handlers/tool-configs/companies.ts` (1,210 lines!)
- `handlers/tool-configs/people.ts` (564 lines)
- `handlers/tool-configs/lists.ts` (334 lines)
- `handlers/tool-configs/records.ts` (327 lines)

## Your Task

### 1. Split companies.ts first (largest file):
Create this structure:
```
src/handlers/tool-configs/companies/
├── search.ts        # Search-related tools
├── crud.ts         # CRUD operation tools
├── attributes.ts   # Attribute management tools
├── notes.ts        # Notes-related tools
├── relationships.ts # Relationship-based tools
├── batch.ts        # Batch operation tools
├── formatters.ts   # Result formatting functions
├── definitions.ts  # Tool definitions
└── index.ts       # Main export file
```

### 2. For each split file:

#### `search.ts` should contain:
- search-companies
- advanced-search-companies
- search-companies-by-people
- search-companies-by-people-list
- search-companies-by-notes

#### `crud.ts` should contain:
- create-company
- update-company
- update-company-attribute
- delete-company

#### `attributes.ts` should contain:
- get-company-fields
- get-company-custom-fields
- discover-company-attributes
- get-company-attributes

#### `notes.ts` should contain:
- get-company-notes
- create-company-note

#### `batch.ts` should contain:
- batch-create-companies
- batch-update-companies
- batch-delete-companies
- batch-search-companies
- batch-get-company-details

#### `formatters.ts` should contain:
- All formatResult functions

#### `definitions.ts` should contain:
- All tool definitions (inputSchema)

### 3. Apply similar pattern to people.ts:
```
src/handlers/tool-configs/people/
├── search.ts
├── crud.ts
├── relationships.ts
├── notes.ts
├── batch.ts
├── formatters.ts
├── definitions.ts
└── index.ts
```

### 4. Guidelines:
- Keep related tools together
- Maintain the same export structure
- Use index.ts to aggregate exports
- Ensure all imports are updated
- Add module-level JSDoc comments

### 5. Testing:
After refactoring, verify:
- All tools are still accessible
- No missing exports
- Tool registration still works
- All tests pass

### 6. Commit Message Format:
```
Refactor: Break down large tool config files (Issue #93)

- Split companies.ts into modular sub-files
- Split people.ts into focused modules
- Organized tools by operation type
- Maintained backward compatibility

Closes #93
```

## Working in this Worktree
- This is a separate branch: `refactor/issue-93-split-configs`
- Changes here won't affect other work
- Start with companies.ts as it's the largest
- Test thoroughly before moving to the next file