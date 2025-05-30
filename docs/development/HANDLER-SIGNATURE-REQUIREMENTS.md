# Handler Signature Requirements

This document outlines the required function signatures for handlers used with the CRUD dispatcher system.

## Background

The dispatcher system in `src/handlers/tools/dispatcher/operations/crud.ts` expects specific function signatures for each operation type. Handlers that don't match these signatures will cause runtime errors.

## Required Signatures

### Create Operations
```typescript
handler(attributes: any): Promise<Object>
```
- **Parameters**: `attributes` - Object containing the data to create
- **Returns**: Promise resolving to the created object

### Update Operations  
```typescript
handler(id: string, attributes: any): Promise<Object>
```
- **Parameters**: 
  - `id` - Resource ID to update
  - `attributes` - Object containing the data to update
- **Returns**: Promise resolving to the updated object

### Update Attribute Operations
```typescript
handler(id: string, attributeName: string, value: any): Promise<Object>
```
- **Parameters**:
  - `id` - Resource ID to update
  - `attributeName` - Name of the attribute to update
  - `value` - New value for the attribute
- **Returns**: Promise resolving to the updated object

### Delete Operations
```typescript
handler(id: string): Promise<boolean>
```
- **Parameters**: `id` - Resource ID to delete
- **Returns**: Promise resolving to boolean indicating success

### Details Operations
```typescript
handler(id: string): Promise<Object>
```
- **Parameters**: `id` - Resource ID to retrieve
- **Returns**: Promise resolving to the object details

## Implementation Examples

### Companies (✅ Correct)
```typescript
// From src/objects/companies/basic.ts
export async function createCompany(attributes: CompanyAttributes): Promise<Company>
export async function updateCompany(companyId: string, attributes: Partial<CompanyAttributes>): Promise<Company>
export async function updateCompanyAttribute(companyId: string, attributeName: string, attributeValue: any): Promise<Company>
export async function deleteCompany(companyId: string): Promise<boolean>
```

### People (✅ Fixed)
```typescript
// From src/handlers/tool-configs/people/crud.ts - FIXED
handler: async (attributes: PersonCreateAttributes): Promise<Person>

// Previously incorrect (had extra _slug parameter):
// handler: async (_slug: string, attributes: PersonCreateAttributes): Promise<Person>
```

## Validation

Handler signatures are validated at:
1. **Build time**: TypeScript will catch signature mismatches
2. **Runtime**: The dispatcher will pass the expected parameters

## Common Issues

1. **Extra parameters**: Adding unused parameters (like `_slug`) will cause argument count mismatches
2. **Parameter order**: Changing the order of parameters breaks the dispatcher contract
3. **Missing parameters**: Not accepting required parameters causes runtime errors
4. **Return type mismatches**: Returning unexpected types can break downstream formatting

## Testing

When adding new handlers:
1. Ensure TypeScript build passes
2. Run the full test suite to verify no runtime errors
3. Test actual tool execution through the MCP protocol

## Issue Resolution

**Issue #263**: Fixed signature mismatch in people create handler by removing unused `_slug` parameter.

**Verification**: All handler signatures now match dispatcher expectations. Build passes with no TypeScript errors.