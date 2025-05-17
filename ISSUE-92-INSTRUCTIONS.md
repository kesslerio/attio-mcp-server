# Issue #92: Refactor tools.ts - Instructions for Claude

## Context
You are working on Issue #92: "Refactor: Split tools.ts into registry, dispatcher, and formatters"

## Current Directory
You are in worktree: `/Users/kesslerio/GDrive/Projects/.worktrees/issue-92-split-tools`

## Problem
The file `src/handlers/tools.ts` has grown to 1,671 lines and mixes multiple responsibilities:
- Tool registration logic
- Tool execution dispatch
- Result formatting
- Tool configuration management

## Your Task

### 1. Create the new directory structure:
```
src/handlers/tools/
├── registry.ts      # Tool registration logic
├── dispatcher.ts    # Tool execution dispatch
├── formatters.ts    # Result formatting functions
└── index.ts        # Central export point
```

### 2. Split the code into modules:

#### `registry.ts` should contain:
- Tool registration mechanisms
- Tool discovery logic
- Tool metadata management
- Registration validation
- The tool registration Map

#### `dispatcher.ts` should contain:
- Tool execution dispatch logic
- Request routing
- Parameter validation
- Execution error handling
- The actual tool invocation logic

#### `formatters.ts` should contain:
- Result formatting functions
- Response transformation utilities
- Output standardization logic
- Format conversion helpers

#### `index.ts` should:
- Export all public interfaces
- Initialize the modules
- Coordinate between modules
- Maintain backward compatibility

### 3. Guidelines:
- Keep all existing functionality intact
- Update all imports throughout the codebase
- Add JSDoc comments to explain module responsibilities
- Ensure proper TypeScript types are maintained
- Test that all tools still work after refactoring

### 4. Testing:
After refactoring, verify:
- All tools can still be registered
- Tool dispatch works correctly
- Response formatting is unchanged
- No circular dependencies exist

### 5. Commit Message Format:
```
Refactor: Split tools.ts into registry, dispatcher, and formatters (Issue #92)

- Created modular structure for tool handling
- Separated registration, dispatch, and formatting concerns
- Maintained backward compatibility
- Updated all imports

Closes #92
```

## Working in this Worktree
- This is a separate branch: `refactor/issue-92-split-tools`
- Changes here won't affect other work
- When done, create a PR targeting the main repository