# Handler Signature Requirements

This document defines the required function signatures for handlers in the Attio MCP Server dispatcher system.

## Overview

The tool dispatcher in `src/handlers/tools/dispatcher/operations/` expects specific function signatures for different operation types. All handler functions must match these signatures exactly to ensure proper operation.

## Required Signatures

### Create Operations

**File**: `src/handlers/tools/dispatcher/operations/crud.ts` (line 34)

```typescript
// Dispatcher calls: await toolConfig.handler(attributes)
handler: (attributes: AttributesType) => Promise<ResultType>
```

**Examples**:
- `src/handlers/tool-configs/companies/crud.ts` - `createCompany`
- `src/handlers/tool-configs/people/crud.ts` - `createPerson`

### Update Operations

**File**: `src/handlers/tools/dispatcher/operations/crud.ts` (line 86)

```typescript
// Dispatcher calls: await toolConfig.handler(id, attributes)
handler: (id: string, attributes: AttributesType) => Promise<ResultType>
```

**Examples**:
- `src/handlers/tool-configs/companies/crud.ts` - `updateCompany`
- `src/handlers/tool-configs/people/` - update handlers

### Update Attribute Operations

**File**: `src/handlers/tools/dispatcher/operations/crud.ts` (line 152)

```typescript
// Dispatcher calls: await toolConfig.handler(id, attributeName, value)
handler: (id: string, attributeName: string, value: any) => Promise<ResultType>
```

**Examples**:
- `src/handlers/tool-configs/companies/crud.ts` - `updateCompanyAttribute`

### Delete Operations

**File**: `src/handlers/tools/dispatcher/operations/crud.ts` (line 193)

```typescript
// Dispatcher calls: await toolConfig.handler(id)
handler: (id: string) => Promise<boolean | void>
```

**Examples**:
- `src/handlers/tool-configs/companies/crud.ts` - `deleteCompany`

### Details/Get Operations

Used for retrieving single records by ID.

```typescript
// Dispatcher calls: await toolConfig.handler(id)
handler: (id: string) => Promise<ResultType>
```

### Search Operations

**File**: `src/handlers/tools/dispatcher/operations/search.ts`

```typescript
// Dispatcher calls: await toolConfig.handler(searchTerm, filters?)
handler: (searchTerm: string, filters?: FilterType) => Promise<ResultType[]>
```

## Common Mistakes

### ❌ Incorrect: Extra Parameters

```typescript
// WRONG - Extra unused parameter
handler: async (_slug: string, attributes: PersonCreateAttributes) => {
  // This will cause runtime errors when dispatcher calls handler(attributes)
}
```

### ✅ Correct: Matching Dispatcher Expectations

```typescript
// CORRECT - Matches dispatcher call
handler: async (attributes: PersonCreateAttributes) => {
  // Dispatcher calls this as: handler(attributes)
}
```

## Verification Process

1. **Type Checking**: Run `npm run check` to verify TypeScript compilation
2. **Unit Tests**: Run `npm test` to ensure all handlers work correctly
3. **Manual Verification**: Check dispatcher calls in `/operations/` files

## Handler Configuration Structure

All handlers should be defined using this structure:

```typescript
export const crudToolConfigs = {
  create: {
    name: 'operation-name',
    handler: operationFunction, // Must match required signature
    formatResult: (result) => `formatted response`,
  } as ToolConfig,
  // ... other operations
};
```

## Testing Handler Signatures

When implementing new handlers:

1. Verify the dispatcher call pattern in relevant `/operations/` file
2. Implement handler with matching signature
3. Run tests to verify integration
4. Check TypeScript compilation passes

## Historical Issues

- **Issue #263**: People create handler had extra `_slug` parameter that didn't match dispatcher expectations
- **Resolution**: Removed unused parameter to match `handler(attributes)` signature

## Related Files

- `src/handlers/tools/dispatcher/operations/crud.ts` - CRUD operation dispatcher
- `src/handlers/tools/dispatcher/operations/search.ts` - Search operation dispatcher
- `src/handlers/tool-configs/companies/crud.ts` - Company handler implementations
- `src/handlers/tool-configs/people/crud.ts` - People handler implementations