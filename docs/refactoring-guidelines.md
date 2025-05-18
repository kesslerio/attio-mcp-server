# Refactoring Guidelines

This document provides guidelines for conducting refactoring work on the Attio MCP Server project.

## Issue Creation for Refactoring

When creating issues for refactoring work, use a structured checklist to track progress. This helps ensure all aspects of the refactoring are addressed and provides clear visibility into what has been completed.

### Refactoring Issue Template

```markdown
## Problem
[Describe the current state and issues]

## Current Issues
- [ ] Issue 1
- [ ] Issue 2
- [ ] Issue 3

## Refactoring Plan

### 1. [First Major Task]
- [ ] Subtask 1
- [ ] Subtask 2
- [ ] Subtask 3

### 2. [Second Major Task]
- [ ] Subtask 1
- [ ] Subtask 2

### 3. Final Structure
```
[Show desired end state]
```

## Benefits
- [List expected improvements]

## Implementation Steps
1. [ ] Step 1
2. [ ] Step 2
3. [ ] Step 3
4. [ ] Run tests
5. [ ] Update documentation
6. [ ] Create PR
```

### Example: File Consolidation Refactoring

```markdown
## Problem
Filter and attribute mapping utilities are scattered and duplicated:
- filter-utils.ts (511 lines)
- filter-utils-additions.ts (132 lines)
- filter-validation.ts (321 lines)
- Duplicate attribute-mapping.ts files

## Current Issues
- [ ] Overlapping functionality in filter utilities
- [ ] Unclear which utility to use
- [ ] Duplicate attribute mapping files
- [ ] Confusing module organization

## Refactoring Plan

### 1. Filter Utilities Consolidation
- [ ] Audit filter utility functions
- [ ] Move functions to appropriate filter submodules
- [ ] Update all imports for filter utilities
- [ ] Remove old filter utility files

### 2. Attribute Mapping Cleanup
- [ ] Identify duplicate attribute-mapping files
- [ ] Compare contents of duplicates
- [ ] Update imports to use single source
- [ ] Remove duplicate files

### 3. Final Structure
```
utils/
├── filters/
│   ├── types.ts
│   ├── builders.ts
│   ├── validators.ts
│   └── index.ts
└── attribute-mapping/
    ├── index.ts
    └── mappers.ts
```

## Benefits
- Eliminates confusion from duplicate files
- Clear module boundaries
- Reduced code duplication
- Improved import paths

## Implementation Steps
1. [ ] Create feature branch
2. [ ] Audit existing files
3. [ ] Move/consolidate utilities
4. [ ] Update imports
5. [ ] Remove duplicates
6. [ ] Run build and tests
7. [ ] Create PR
```

## Best Practices

1. **Use Checklists**: Create detailed checklists in issues to track progress
2. **Atomic Changes**: Keep refactoring PRs focused on specific tasks
3. **Document Progress**: Update issue checklists as work progresses
4. **Reference Related Work**: Mention related commits/PRs in your PR description
5. **Test Thoroughly**: Ensure all tests pass after refactoring
6. **No Functional Changes**: Pure refactoring should not change functionality

## Pull Request Guidelines

When creating a PR for refactoring work:

1. Reference the issue number (e.g., "Closes #91")
2. Provide a clear summary of what was refactored
3. List specific changes made
4. Include test results
5. Note any related commits (e.g., "Filter utilities were already refactored in commit abc123")

## Benefits of Using Checklists

- **Visibility**: Team members can see exactly what remains to be done
- **Progress Tracking**: Clear indication of completion percentage
- **Handoff**: Easy for others to pick up work if needed
- **Documentation**: Serves as a record of what was done
- **Planning**: Helps break down complex refactoring into manageable tasks

By following these guidelines, refactoring work becomes more organized, trackable, and successful.
