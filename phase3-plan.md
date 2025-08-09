## Phase 3 ESLint Warning Reduction Plan

### Current State
- Total warnings: 674 (all @typescript-eslint/no-explicit-any)
- Target: <500 warnings (174+ reduction needed)
- Branch: feature/phase3-eslint-reduction

### Priority Areas Identified
1. Handler configurations in src/handlers/tool-configs/
2. Test files with mock objects
3. Error handling in src/errors/
4. Utility functions
5. CLI commands

### Refactoring Strategy
1. Replace `Record<string, any>` with `Record<string, unknown>`
2. Create shared type definitions for repeated patterns
3. Use TypeScript utility types (Partial, Pick, Omit)
4. Define specific interfaces for API responses
5. Type mock objects in tests properly

### File Groups for Systematic Refactoring
- Group 1: src/handlers/tool-configs/**/*.ts (19 files)
- Group 2: src/errors/*.ts and src/handlers/*.ts
- Group 3: src/cli/commands/*.ts
- Group 4: test/**/*.ts (65 test files)
- Group 5: src/utils/*.ts and src/validators/*.ts

Ready to begin systematic refactoring!
