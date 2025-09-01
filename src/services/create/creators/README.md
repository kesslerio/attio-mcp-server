# Resource Creators - Strategy Pattern Implementation

This directory implements the Strategy Pattern to handle different Attio resource types (companies, people, tasks, notes) in the `AttioCreateService`. This refactoring addresses Issue #552 by applying Single Responsibility Principle (SRP) and promoting maintainability.

## Architecture Overview

### Problem Addressed
The original `AttioCreateService` violated SRP by handling multiple concerns within large methods:
- `createCompany`: ~139 lines with mixed concerns
- `createPerson`: ~168 lines with similar patterns
- Mixed responsibilities: API normalization, error recovery, data extraction, validation

### Solution: Strategy Pattern
Each resource type now has its own dedicated creator class that encapsulates:
- Resource-specific normalization logic
- API interaction patterns
- Error handling and recovery strategies
- Response processing

## File Structure

```
src/services/create/creators/
├── README.md                 # This documentation
├── index.ts                  # Exports all creators and types
├── types.ts                  # Base interfaces and types
├── base-creator.ts           # Abstract base class with shared utilities
├── company-creator.ts        # Company-specific creation logic
├── person-creator.ts         # Person-specific creation logic
├── task-creator.ts           # Task-specific creation logic
└── note-creator.ts           # Note-specific creation logic
```

## Core Components

### Base Interfaces (`types.ts`)

- **`ResourceCreator`**: Base interface all creators must implement
- **`ResourceCreatorContext`**: Shared context with client and utilities
- **`RecoveryOptions`**: Configuration for error recovery strategies

### Abstract Base Class (`base-creator.ts`)

**`BaseCreator`** provides common functionality:
- Response processing and record extraction
- ID enrichment from web_url
- Generic recovery attempt handling
- Enhanced error creation
- Shared debugging and logging patterns

### Resource-Specific Creators

#### CompanyCreator
- Handles domain/domains normalization via `normalizeCompanyValues`
- Recovery by domain search, then by name search
- Specialized error handling for company creation

#### PersonCreator
- Handles name and email normalization via `normalizePersonValues`
- Email format retry logic (string ↔ object format)
- Recovery by primary email address search

#### TaskCreator
- Delegates to existing `tasks.js` object
- Converts result to `AttioRecord` format via `convertTaskToAttioRecord`
- Simplified strategy due to delegation approach

#### NoteCreator
- Delegates to existing `notes.js` object
- Handles response unwrapping and normalization
- Input validation for required note fields

## Usage Example

```typescript
// The AttioCreateService now uses creators internally
const service = new AttioCreateService();

// Each method delegates to the appropriate creator
const company = await service.createCompany({
  name: "Acme Corp",
  domain: "acme.com"
});
```

## Benefits Achieved

### Single Responsibility Principle ✅
- Each creator has one reason to change
- Clear separation between resource types
- Focused error handling per resource

### Maintainability ✅
- Add new resource types by creating new creators
- Modify resource logic without affecting others
- Clear dependency injection through constructor

### Testability ✅
- Test each creator independently
- Mock context for unit testing
- Isolated error scenarios per resource

### Code Reuse ✅
- Shared utilities in `BaseCreator`
- Common patterns extracted to base class
- Reduced duplication across creators

## Extension Points

### Adding New Resource Types

1. Create new creator class extending `BaseCreator`:
```typescript
export class NewResourceCreator extends BaseCreator {
  readonly resourceType = 'newresource';
  readonly endpoint = '/objects/newresource/records';

  async create(input: Record<string, unknown>, context: ResourceCreatorContext): Promise<AttioRecord> {
    // Implementation
  }
}
```

2. Register in `AttioCreateService`:
```typescript
this.creators.set('newresource', new NewResourceCreator());
```

3. Add interface method:
```typescript
async createNewResource(input: Record<string, unknown>): Promise<AttioRecord> {
  return this.getCreator('newresource').create(input, this.context);
}
```

### Customizing Recovery Strategies

Override `getRecoveryOptions()` and `attemptRecovery()` in your creator:
```typescript
protected getRecoveryOptions(): RecoveryOptions {
  return {
    searchFilters: [
      { field: 'unique_field', value: '', operator: 'eq' }
    ],
    maxAttempts: 3
  };
}
```

## Migration Notes

- Original `AttioCreateService` backed up to `.backup` file
- All existing tests pass without modification
- Public interface remains unchanged
- Performance characteristics maintained
- Error handling patterns preserved

## Compliance

This implementation satisfies:
- **Issue #552**: Strategy Pattern for SRP compliance
- **80/20 Principle**: Maximum benefit with minimal complexity
- **Existing API Contract**: No breaking changes
- **Test Compatibility**: All existing tests pass

## Future Improvements

1. **Creator-Specific Tests**: Add unit tests for each creator (currently pending)
2. **Async Creator Registration**: Support dynamic creator loading
3. **Validation Pipeline**: Add creator-specific input validation
4. **Metrics Collection**: Add per-creator performance metrics