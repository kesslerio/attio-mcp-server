# Field Validation Rules

This document describes the field validation rules applied to Attio operations, including required fields, field types, and validation constraints.

> **🔄 Recent Updates**: Enhanced with Issue #473 improvements including category validation, field mapping corrections, and special character handling. See [Field Mapping Improvements](./field-mapping-improvements.md) for comprehensive details.

## Table of Contents
- [Overview](#overview)
- [Required vs Optional Fields](#required-vs-optional-fields)
- [Field Type Validation](#field-type-validation)
- [Standard Field Types](#standard-field-types)
- [Custom Field Validation](#custom-field-validation)
- [Null Value Handling](#null-value-handling)
- [Error Messages](#error-messages)
- [Examples](#examples)

## Overview

Field validation ensures data integrity when creating or updating records in Attio. Validation occurs at multiple levels:

1. **Client-side validation**: Basic type checking and required field validation
2. **API validation**: Attio API validates field types and constraints
3. **Dynamic type detection**: Automatic field type detection for proper formatting

## Required vs Optional Fields

### Companies

**Required Fields:**
- `name` (string): Company name is always required

**Optional Fields:**
- All other fields are optional
- Optional fields can be omitted or set to null
- Custom fields follow their workspace configuration

### People

**Required Fields:**
- None (though at least one identifier is recommended)

**Recommended Fields:**
- `name` (string): Person's full name
- `email` (string): Email address
- `phone` (string): Phone number

### Records (Generic)

**Required Fields:**
- Depends on the object configuration in your workspace
- Check object settings in Attio for required fields

## Field Type Validation

### Type Mapping

| Attio Type | Expected Format | Example |
|------------|-----------------|---------|
| text | string | "Example text" |
| email | valid email string | "user@example.com" |
| url | valid URL string | "https://example.com" |
| phone-number | phone string | "+1-555-0123" |
| number | number | 42.5 |
| currency | number | 1000.00 |
| checkbox | boolean | true/false |
| date | ISO 8601 date | "2024-01-15" |
| datetime | ISO 8601 datetime | "2024-01-15T10:30:00Z" |
| select | string (option ID) | "option_123" |
| multiselect | array of strings | ["opt1", "opt2"] |
| record-reference | object/array | { "target_record_id": "..." } |
| location | object | { "locality": "SF", "country_code": "US" } |

### Validation Rules

1. **String Fields**
   ```javascript
   // Valid
   { name: "Acme Corp" }
   { name: "" }  // Empty string is valid
   
   // Invalid
   { name: 123 }  // Wrong type
   { name: null } // Use null only to clear
   ```

2. **Number Fields**
   ```javascript
   // Valid
   { employee_count: 100 }
   { revenue: 1000000.50 }
   
   // Invalid
   { employee_count: "100" }  // String not auto-converted
   { revenue: "1M" }  // No string formatting
   ```

3. **Boolean Fields**
   ```javascript
   // Valid
   { is_active: true }
   { is_verified: false }
   
   // Invalid
   { is_active: "true" }  // String not accepted
   { is_verified: 1 }  // Number not accepted
   ```

4. **Date Fields**
   ```javascript
   // Valid
   { foundation_date: "2020-01-15" }
   { created_at: "2024-01-15T10:30:00Z" }
   
   // Invalid
   { foundation_date: "01/15/2020" }  // Wrong format
   { created_at: "yesterday" }  // Not parsed
   ```

5. **Select Fields**
   ```javascript
   // Valid
   { status: "active" }  // If "active" is valid option
   { priority: "high" }
   
   // Invalid
   { status: "random_value" }  // Not a valid option
   { priority: ["high", "low"] }  // Not multiselect
   ```

6. **URL Fields**
   ```javascript
   // Valid
   { website: "https://example.com" }
   { website: "http://example.com" }
   { website: "https://sub.example.com:8080/path" }
   
   // Invalid
   { website: "example.com" }  // Missing protocol
   { website: "not a url" }
   ```

## Standard Field Types

### Company Standard Fields

| Field | Type | Validation |
|-------|------|------------|
| name | text | Required, non-empty string |
| website | url | Valid URL format |
| domain | text | Domain name format |
| description | text | Any string |
| industry | text | Any string |
| employee_range | select | Valid option from list |
| foundation_date | date | ISO 8601 date |
| primary_location | location | Location object |

### People Standard Fields

| Field | Type | Validation |
|-------|------|------------|
| name | text | Any string |
| email | email | Valid email format |
| phone_numbers | phone-number | Phone format |
| job_title | text | Any string |
| company | record-reference | Valid company ID |

## Custom Field Validation

Custom fields follow their configured validation rules:

```javascript
// Check field configuration
const fieldConfig = await getAttributeMetadata('companies', 'custom_field');

// Validate based on configuration
if (fieldConfig.is_required && !value) {
  throw new Error(`${fieldConfig.title} is required`);
}

if (fieldConfig.type === 'select' && fieldConfig.config?.select?.options) {
  const validOptions = fieldConfig.config.select.options.map(o => o.value);
  if (!validOptions.includes(value)) {
    throw new Error(`Invalid option for ${fieldConfig.title}`);
  }
}
```

## Null Value Handling

As of Issue #97 fix, null values are properly handled:

### Setting Null Values

```javascript
// Clear a field
await updateCompanyAttribute(id, "description", null);

// Clear multiple fields
await updateCompany(id, {
  description: null,
  secondary_website: null
});
```

### Null vs Undefined

- `null`: Explicitly clears the field value
- `undefined`: Field is ignored (not updated)

```javascript
await updateCompany(id, {
  name: "New Name",        // Updates the name
  description: null,       // Clears the description
  website: undefined       // Leaves website unchanged
});
```

## Error Messages

### Validation Error Examples

1. **Required Field Missing**
   ```
   Error: Company name is required for create-company tool
   ```

2. **Invalid Type**
   ```
   Error: Invalid value type for field 'employee_count': expected number, got string
   ```

3. **Invalid Format**
   ```
   Error: Invalid email format for field 'contact_email': not-an-email
   ```

4. **Invalid Option**
   ```
   Error: Invalid option 'random' for field 'status'. Valid options: active, inactive, pending
   ```

### Handling Validation Errors

```javascript
try {
  await createCompany({ 
    // Missing required 'name' field
    website: "https://example.com" 
  });
} catch (error) {
  if (error instanceof InvalidCompanyDataError) {
    console.error("Validation failed:", error.message);
    // Handle specific validation error
  }
}
```

## Examples

### Complete Validation Example

```javascript
async function validateAndCreateCompany(data) {
  // Client-side validation
  const errors = [];
  
  // Required field check
  if (!data.name || data.name.trim() === '') {
    errors.push("Company name is required");
  }
  
  // Format validation
  if (data.website && !isValidUrl(data.website)) {
    errors.push("Invalid website URL format");
  }
  
  if (data.email && !isValidEmail(data.email)) {
    errors.push("Invalid email format");
  }
  
  // Type validation
  if (data.employee_count && typeof data.employee_count !== 'number') {
    errors.push("Employee count must be a number");
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors.join(", "));
  }
  
  // Proceed with creation
  return await createCompany(data);
}

// Helper functions
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### Dynamic Field Type Detection

```javascript
// The system automatically detects and formats fields
const company = await createCompany({
  name: "Tech Corp",
  employee_count: 50,  // Detected as number
  is_public: true,     // Detected as boolean
  website: "https://techcorp.com",  // Detected as URL
  founded: "2020-01-15"  // Detected as date
});
```

### Custom Field Validation

```javascript
// Validate custom field against its configuration
async function validateCustomField(objectType, fieldName, value) {
  const metadata = await getAttributeMetadata(objectType, fieldName);
  
  if (!metadata) {
    throw new Error(`Unknown field: ${fieldName}`);
  }
  
  // Check required
  if (metadata.is_required && !value) {
    throw new Error(`${metadata.title} is required`);
  }
  
  // Check type
  switch (metadata.type) {
    case 'select':
      if (!metadata.config?.select?.options) {
        break;
      }
      const validOptions = metadata.config.select.options.map(o => o.value);
      if (!validOptions.includes(value)) {
        throw new Error(`Invalid option for ${metadata.title}`);
      }
      break;
      
    case 'number':
      if (typeof value !== 'number') {
        throw new Error(`${metadata.title} must be a number`);
      }
      break;
      
    case 'email':
      if (!isValidEmail(value)) {
        throw new Error(`${metadata.title} must be a valid email`);
      }
      break;
  }
  
  return true;
}
```

## Best Practices

1. **Validate Early**: Perform client-side validation before API calls
2. **Use Type Guards**: Ensure correct types before operations
3. **Handle Errors**: Catch and handle validation errors appropriately
4. **Document Custom Fields**: Keep documentation of custom field requirements
5. **Test Validation**: Write tests for validation logic

## See Also

- [Company Write Operations](./company-write-operations.md)
- [Error Handling](./error-handling.md)
- [Dynamic Field Detection](../dynamic-field-detection.md)
- [API Overview](./api-overview.md)