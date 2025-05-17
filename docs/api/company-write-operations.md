# Company Write Operations

This document provides comprehensive documentation for company write operations in the Attio MCP server, including creation, updates, and deletion of company records.

## Table of Contents
- [Overview](#overview)
- [Operations](#operations)
  - [Create Company](#create-company)
  - [Update Company](#update-company)
  - [Update Company Attribute](#update-company-attribute)
  - [Delete Company](#delete-company)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Field Validation](#field-validation)
- [Concurrent Operations](#concurrent-operations)
- [Best Practices](#best-practices)

## Overview

Company write operations allow you to create, update, and delete company records in Attio. All operations include automatic retry logic with exponential backoff and comprehensive error handling.

## Operations

### Create Company

Creates a new company record in Attio.

**Tool Name:** `create-company`

**Function:** `createCompany(attributes)`

**Parameters:**
- `attributes` (object): Company attributes to set
  - `name` (string, **required**): Company name
  - `website` (string): Company website URL
  - `description` (string): Company description
  - `industry` (string): Industry classification
  - `employee_range` (string): Employee count range (e.g., "11-50", "51-200")
  - `primary_location` (object): Company location
  - `foundation_date` (string): Date company was founded (ISO 8601)
  - Plus any custom attributes defined in your workspace

**Example:**
```javascript
const company = await createCompany({
  name: "Acme Corporation",
  website: "https://acme.com",
  industry: "Technology",
  employee_range: "51-200",
  primary_location: {
    locality: "San Francisco",
    region: "CA",
    country_code: "US"
  }
});
```

**Response:**
```json
{
  "id": {
    "workspace_id": "...",
    "object_id": "...",
    "record_id": "..."
  },
  "values": {
    "name": [{ "value": "Acme Corporation" }],
    "website": [{ "value": "https://acme.com" }],
    // ... other fields
  }
}
```

### Update Company

Updates multiple attributes of an existing company.

**Tool Name:** `update-company`

**Function:** `updateCompany(companyId, attributes)`

**Parameters:**
- `companyId` (string, **required**): ID of the company to update
- `attributes` (object): Attributes to update (same as create)

**Example:**
```javascript
const updated = await updateCompany("company-id-123", {
  website: "https://new-website.com",
  description: "Updated company description",
  industry: "Finance"
});
```

**Note:** Null values can be used to clear attributes:
```javascript
const result = await updateCompany("company-id-123", {
  description: null  // This will clear the description
});
```

### Update Company Attribute

Updates a single attribute of a company. This is more efficient than `updateCompany` when modifying only one field.

**Tool Name:** `update-company-attribute`

**Function:** `updateCompanyAttribute(companyId, attributeName, attributeValue)`

**Parameters:**
- `companyId` (string, **required**): ID of the company to update
- `attributeName` (string, **required**): Name of the attribute to update
- `attributeValue` (any, **required**): New value for the attribute (can be null)

**Example:**
```javascript
// Update website
const result = await updateCompanyAttribute(
  "company-id-123",
  "website",
  "https://updated-website.com"
);

// Clear a field by setting to null
const cleared = await updateCompanyAttribute(
  "company-id-123",
  "description",
  null
);
```

### Delete Company

Permanently deletes a company record.

**Tool Name:** `delete-company`

**Function:** `deleteCompany(companyId)`

**Parameters:**
- `companyId` (string, **required**): ID of the company to delete

**Example:**
```javascript
const success = await deleteCompany("company-id-123");
// Returns: true if successful
```

**Warning:** This operation is permanent and cannot be undone.

## Error Handling

All operations include comprehensive error handling:

### Error Types

1. **InvalidCompanyDataError**: Validation errors
   - Missing required fields
   - Invalid field values
   - Type mismatches

2. **CompanyOperationError**: Operation failures
   - API errors
   - Network issues
   - Permission problems

3. **CompanyNotFoundError**: Record not found
   - Invalid company ID
   - Deleted company

### Example Error Handling

```javascript
try {
  const company = await createCompany({
    name: "New Company"
  });
} catch (error) {
  if (error instanceof InvalidCompanyDataError) {
    console.error("Validation failed:", error.message);
  } else if (error instanceof CompanyOperationError) {
    console.error("Operation failed:", error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Rate Limiting

All operations include automatic rate limit handling:

- **Retry Logic**: Automatic retry with exponential backoff
- **Default Configuration**:
  - Max retries: 3
  - Initial delay: 1 second
  - Max delay: 10 seconds
  - Retryable status codes: 408, 429, 500, 502, 503, 504

### Custom Retry Configuration

```javascript
// Custom retry config (not yet exposed in public API)
const retryConfig = {
  maxRetries: 5,
  initialDelay: 2000,
  maxDelay: 30000,
  useExponentialBackoff: true
};
```

## Field Validation

### Required Fields

- `name`: Required for company creation

### Field Types

Common field types and their expected formats:

| Field | Type | Format | Example |
|-------|------|--------|---------|
| name | string | Any text | "Acme Corp" |
| website | string | Valid URL | "https://acme.com" |
| email | string | Valid email | "info@acme.com" |
| phone | string | Phone number | "+1-555-0100" |
| employee_range | select | Predefined options | "11-50" |
| foundation_date | date | ISO 8601 | "2020-01-15" |
| industry | string | Any text | "Technology" |

### Custom Fields

Custom fields follow the same validation rules as their configured types in Attio.

## Concurrent Operations

When performing concurrent operations on the same company:

### Behavior

- **Last Write Wins**: No optimistic locking (yet)
- **Atomic Updates**: Each operation is atomic
- **No Transactions**: Operations are independent

### Best Practices

```javascript
// Avoid concurrent updates to the same field
// Bad:
await Promise.all([
  updateCompanyAttribute(id, "name", "Name 1"),
  updateCompanyAttribute(id, "name", "Name 2")
]);

// Good:
await updateCompany(id, {
  name: "Final Name",
  website: "https://example.com"
});
```

## Best Practices

### 1. Use Appropriate Operations

- Use `updateCompanyAttribute` for single field updates
- Use `updateCompany` for multiple field updates
- Use `createCompany` with all known fields at once

### 2. Handle Errors Gracefully

```javascript
async function safeCreateCompany(data) {
  try {
    return await createCompany(data);
  } catch (error) {
    if (error.message.includes("rate limit")) {
      // Wait and retry
      await sleep(5000);
      return await createCompany(data);
    }
    throw error;
  }
}
```

### 3. Validate Before Operations

```javascript
function validateCompanyData(data) {
  if (!data.name || data.name.trim() === "") {
    throw new Error("Company name is required");
  }
  
  if (data.website && !isValidUrl(data.website)) {
    throw new Error("Invalid website URL");
  }
  
  return true;
}
```

### 4. Use Null Values Appropriately

```javascript
// Clear optional fields
await updateCompany(id, {
  description: null,
  secondary_website: null
});

// Don't use undefined (it will be ignored)
await updateCompany(id, {
  description: undefined  // This won't clear the field
});
```

### 5. Monitor Rate Limits

Track API usage to avoid hitting rate limits:

```javascript
const metrics = {
  calls: 0,
  retries: 0,
  failures: 0
};

// Wrap operations
async function trackedOperation(fn) {
  metrics.calls++;
  try {
    return await fn();
  } catch (error) {
    if (error.message.includes("retry")) {
      metrics.retries++;
    }
    metrics.failures++;
    throw error;
  }
}
```

## See Also

- [Companies API](./companies-api.md)
- [Error Handling](./error-handling.md)
- [API Overview](./api-overview.md)
- [Batch Operations](./batch-operations.md)