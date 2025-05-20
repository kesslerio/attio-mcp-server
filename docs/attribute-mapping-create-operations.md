# Attribute Mapping in Create/Update Operations

This document explains how user-friendly attribute names are automatically translated to Attio API attribute names during create and update operations.

## Overview

The MCP server now automatically maps user-friendly attribute names to the correct Attio API field names when creating or updating records. This means users can use familiar terms like `b2b_segment` and the system will automatically translate them to the actual Attio field names like `type_persona`.

## How It Works

### Automatic Translation Process

1. **Input**: User provides attributes with friendly names
2. **Validation**: Optional validation is performed on the original attribute names
3. **Translation**: Attribute names are mapped using `getAttributeSlug()` 
4. **Formatting**: Values are formatted according to Attio's field type requirements
5. **API Call**: Final request is made with correct attribute names and formats

### Example Transformation

```javascript
// User Input
{
  name: "Acme Corp",
  b2b_segment: "Plastic Surgeon",
  business_type: "Healthcare"
}

// After Attribute Mapping
{
  name: "Acme Corp", 
  type_persona: "Plastic Surgeon",
  business_type: "Healthcare"  // No mapping needed
}

// After Value Formatting (final API payload)
{
  name: "Acme Corp",
  type_persona: { value: "Plastic Surgeon" },
  business_type: { value: "Healthcare" }
}
```

## Supported Operations

Attribute mapping is applied to:

- ✅ `createCompany()` and `batchCreateCompanies()`
- ✅ `updateCompany()` and `batchUpdateCompanies()`
- ✅ `updateCompanyAttribute()`
- ✅ `createPerson()` (when implemented)
- ✅ All object creation/update operations via `createObjectWithDynamicFields()`

## Configuration

### Mapping Configuration Files

Attribute mappings are defined in:
- `config/mappings/default.json` - Default mappings shipped with the server
- `config/mappings/user.json` - User-specific mappings (overrides defaults)

### Common Mappings

| User-Friendly Name | API Attribute | Object Type |
| ------------------ | ------------- | ----------- |
| `b2b_segment` | `type_persona` | companies |
| `business_segment` | `type_persona` | companies |
| `industry` | `categories` | companies |
| `email` | `email_addresses` | people |
| `phone` | `phone_numbers` | people |

### Special Case Handling

The system includes special case handling for commonly problematic attribute names:

```javascript
// These all map to "type_persona"
"b2b_segment" -> "type_persona"
"b2b segment" -> "type_persona"  
"b2bsegment" -> "type_persona"
"business segment" -> "type_persona"
"company segment" -> "type_persona"
```

## Development and Debugging

### Debug Logging

Set `NODE_ENV=development` to see detailed mapping logs:

```bash
export NODE_ENV=development
```

You'll see logs like:
```
[translateAttributeNames:companies] Mapped "b2b_segment" -> "type_persona"
[createObjectWithDynamicFields:companies] Original attributes: {"name":"Test","b2b_segment":"Healthcare"}
[createObjectWithDynamicFields:companies] Mapped attributes: {"name":"Test","type_persona":"Healthcare"}
[createObjectWithDynamicFields:companies] Final transformed attributes: {"name":"Test","type_persona":{"value":"Healthcare"}}
```

### Testing Mapping

Use the manual test script to verify mappings:

```bash
cd /path/to/attio-mcp-server
node test/manual/test-attribute-mapping-create.js
```

## Implementation Details

### Code Location

The attribute mapping functionality is implemented in:

- **Core Function**: `src/objects/base-operations.ts` - `translateAttributeNames()`
- **Mapping Logic**: `src/utils/attribute-mapping/attribute-mappers.ts` - `getAttributeSlug()`
- **Applied In**: `createObjectWithDynamicFields()` and `updateObjectWithDynamicFields()`

### Integration Points

```typescript
// In createObjectWithDynamicFields()
const validatedAttributes = validator ? await validator(attributes) : attributes;
const mappedAttributes = translateAttributeNames(objectType, validatedAttributes);
const transformedAttributes = await formatAllAttributes(objectType, mappedAttributes);
```

## Error Handling

### Validation Timing

- **Before Mapping**: Validation happens on original user-friendly names
- **After Mapping**: API calls use translated names
- **Error Messages**: Show original user-friendly names for better UX

### Fallback Behavior

If no mapping is found:
- Original attribute name is used unchanged
- System logs a debug message (in development mode)
- Operation continues normally

## Best Practices

### For Users

1. **Use Friendly Names**: Prefer `b2b_segment` over `type_persona`
2. **Check Mappings**: Review available mappings in config files
3. **Test First**: Use manual test scripts to verify your mappings work

### For Developers

1. **Add New Mappings**: Update config files for new user-friendly names
2. **Test Mappings**: Always test both mapped and direct attribute names
3. **Debug Logging**: Use development mode to trace mapping behavior
4. **Document Changes**: Update this file when adding new mapping features

## Backward Compatibility

- ✅ Existing code using direct API attribute names continues to work
- ✅ No breaking changes to existing API calls
- ✅ Optional feature - can be bypassed by using direct attribute names
- ✅ Gradual migration supported - mix of mapped and direct names in same call

## Future Enhancements

Potential improvements:
- [ ] Bi-directional mapping (API names back to user-friendly names in responses)
- [ ] Dynamic mapping discovery from Attio metadata
- [ ] Custom mapping validation and suggestions
- [ ] Mapping analytics and usage reporting