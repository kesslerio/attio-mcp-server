# Dynamic Field Type Detection

## Overview

The Attio MCP Server implements dynamic field type detection to automatically handle custom attributes in your Attio workspace. This feature ensures that data is formatted correctly for Attio's API without requiring hardcoded field mappings.

## Why Dynamic Field Detection?

Every Attio workspace can have different custom fields with various types:
- Text fields
- Select fields (single and multiselect)
- Number fields
- Date fields
- Boolean fields
- And more...

Since we can't know in advance what custom attributes exist in each workspace, the system dynamically queries Attio's API to understand field types and format data accordingly.

## How It Works

### 1. Field Type Detection

When updating or creating records, the system:
1. Fetches attribute metadata from Attio's API
2. Caches the metadata to avoid repeated API calls
3. Determines the correct format for each field type

### 2. Value Formatting

Different field types require different formatting:

#### Text Fields
```javascript
// Input: "Some text"
// Formatted: { value: "Some text" }
```

#### Select Fields (Single)
```javascript
// Input: "Option Title"
// Formatted: "Option Title"  // Direct string value
```

#### Select Fields (Multiselect)
```javascript
// Input: ["Option1", "Option2"]
// Formatted: ["Option1", "Option2"]  // Array of strings
```

#### Number Fields
```javascript
// Input: 123
// Formatted: { value: 123 }
```

### 3. API Integration

The system uses the following core functions:

#### `getAttributeTypeInfo(objectSlug, attributeSlug)`
Retrieves detailed information about an attribute including:
- Field type (text, select, number, etc.)
- Whether it accepts multiple values
- Validation rules

#### `formatAttributeValue(objectSlug, attributeSlug, value)`
Formats a value according to the field's expected format.

#### `formatAllAttributes(objectSlug, attributes)`
Formats all attributes in an object for API submission.

## Usage Examples

### Basic Update
```javascript
import { updateCompany } from './objects/companies.js';

// The system automatically detects field types and formats values
const result = await updateCompany(companyId, {
  services: 'CoolSculpting, Botox',  // Text field
  type_persona: 'Medical Spa',      // Select field
  referrer: ['Trade Show', 'Web']   // Multiselect field
});
```

### Custom Field Detection
```javascript
import { getAttributeTypeInfo } from './api/attribute-types.js';

// Check field type before updating
const typeInfo = await getAttributeTypeInfo('companies', 'custom_field');
console.log(`Field type: ${typeInfo.attioType}`);
console.log(`Accepts multiple values: ${typeInfo.isArray}`);
```

## Supported Field Types

The system supports all Attio field types:

| Attio Type | Internal Type | Format |
|------------|---------------|---------|
| text | string | `{ value: "text" }` |
| select | string/array | Direct string or array |
| number | number | `{ value: 123 }` |
| currency | number | `{ value: 123.45 }` |
| date | string | `{ value: "2024-01-15" }` |
| checkbox | boolean | Direct boolean |
| email | string | `{ value: "email@example.com" }` |
| phone-number | string | `{ value: "+1234567890" }` |
| url | string | `{ value: "https://example.com" }` |
| record-reference | object | Reference object |

## Caching

To improve performance, the system caches attribute metadata:
- Cache duration: 1 hour
- Cache can be cleared manually if needed
- Reduces API calls for frequently accessed fields

## Error Handling

The system includes robust error handling:
- Validates field types before submission
- Provides clear error messages for type mismatches
- Falls back to safe defaults when metadata unavailable

## Best Practices

1. **Let the system handle formatting**: Don't manually wrap values unless necessary
2. **Check field types**: Use `getAttributeTypeInfo` to understand field requirements
3. **Handle arrays properly**: Multiselect fields should receive arrays
4. **Clear cache when needed**: If field definitions change, clear the cache

## Troubleshooting

### Common Issues

1. **"Invalid value passed to attribute"**: Check if the field type matches the value format
2. **"Cannot find select option"**: Ensure the option title exists in Attio
3. **Type mismatch errors**: Use `getAttributeTypeInfo` to verify expected type

### Debug Mode

Enable debug logging to see field type detection in action:
```javascript
process.env.NODE_ENV = 'development';
```

This will log:
- Detected field types
- Value transformations
- API payloads

## Future Enhancements

Planned improvements include:
- Support for complex field types (e.g., computed fields)
- Automatic option discovery for select fields
- Batch field type detection
- Extended caching options