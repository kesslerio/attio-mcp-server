# Consolidated Implementation Instructions for Issues #176, #178, #179, #181, #182

## Introduction

This document provides comprehensive implementation instructions for a set of related issues in the attio-mcp-server project. These issues focus on improving attribute handling, fixing API errors, and enhancing validation for the Attio MCP server integration. Following these instructions will address critical bugs and implement important enhancements for better LLM integration with Attio.

## Table of Contents

1. [Issue #176: Fix Incorrect Industry Field](#issue-176-fix-incorrect-industry-field)
2. [Issue #178: Fix Boolean Attribute Updates](#issue-178-fix-boolean-attribute-updates)
3. [Issue #179: Fix get-list-details Tool](#issue-179-fix-get-list-details-tool)
4. [Issue #181: Add Attribute Type Validation](#issue-181-add-attribute-type-validation)
5. [Issue #182: Fix advanced-search-companies Tool](#issue-182-fix-advanced-search-companies-tool)
6. [Implementation Strategy](#implementation-strategy)
7. [Testing Requirements](#testing-requirements)

## Issue #176: Fix Incorrect Industry Field

### Description

When creating companies through the MCP, Claude consistently attempts to use the field name 'industry' which fails with the error: 'Cannot find attribute with slug/ID "industry".'

### Root Cause Analysis

1. In `src/handlers/tool-configs/companies/crud.ts` (lines 89-92), 'industry' is defined in the company creation schema
2. In `config/mappings/default.json`, 'Industry' maps to 'industry' in common mappings (line 12)
3. In `src/objects/companies/types.ts`, both 'industry' and 'categories' are defined as separate fields
4. Integration tests in `test/integration/company-write-operations.test.ts` successfully use 'industry'
5. PR #175 implemented attribute name mapping for create/update operations, but there's no mapping for 'industry'

The issue appears to be that 'industry' exists in test environments but not in production Attio accounts, or it's been renamed.

### Implementation Instructions

1. Add 'industry' mapping to 'categories' in the special cases mapping:

```typescript
// In src/utils/attribute-mapping/mapping-utils.ts
const specialCases: Record<string, string> = {
  'b2b_segment': 'type_persona',
  // ...existing mappings...
  'industry': 'categories',        // Add this line
  'industry type': 'categories',   // Add this line
};
```

2. Update the schema definition to clarify this mapping:

```typescript
// In src/handlers/tool-configs/companies/crud.ts
industry: {
  type: "string",
  description: "Industry classification (maps to 'categories' in Attio API)"
}
```

3. Update documentation to clarify this mapping
4. Add tests to verify the mapping works correctly

## Issue #178: Fix Boolean Attribute Updates

### Description

When attempting to update boolean attributes in Attio through the MCP server, passing string values like 'false' or 'No' fails with type errors.

### Steps to Reproduce

1. Use the update-company-attribute tool
2. Set a boolean field (e.g., uses_body_composition) with a string value 'false'
3. Observe the error: Invalid company data: Field 'uses_body_composition' must be of type boolean, but got string

### Implementation Instructions

1. Enhance the attribute mapping module to detect and convert string boolean representations to actual boolean values:

```typescript
// Add to src/utils/attribute-mapping/attribute-mappers.ts
export function convertToBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    if (['true', 'yes', 'y', '1'].includes(lowerValue)) return true;
    if (['false', 'no', 'n', '0'].includes(lowerValue)) return false;
  }
  if (typeof value === 'number') return value !== 0;
  
  // If we can't determine, return the original value
  return value;
}

// Add type conversion to the mapping process
// This should be integrated with the attribute mapping flow
```

2. Implement type checking and conversion in the update process for company attributes
3. Add error handling with clear messages for invalid type conversions
4. Create tests to verify string-to-boolean conversion for attributes

## Issue #179: Fix get-list-details Tool

### Description

When using the get-list-details tool through the MCP server, it fails with an API error instead of returning list details.

### Steps to Reproduce

1. Use the mcp__attio__get-list-details tool with a valid listId
2. Tool returns error: Error calling tool get-list-details: [object Object]

### Implementation Instructions

1. Debug the get-list-details implementation to identify the exact API error
2. Fix the API call structure in the lists module:

```typescript
// In src/objects/lists.ts or appropriate file
export async function getListDetails(listId: string): Promise<any> {
  try {
    // Check if the implementation is consistent with other working list functions
    // Ensure proper error handling
    // Check response formatting
    // Verify authentication is passed correctly
    
    const response = await attioClient.get(`/lists/${listId}`);
    return formatListResponse(response.data);
  } catch (error) {
    // Improve error handling with detailed messages
    const enhancedError = enhanceError(error, {
      context: `Error fetching details for list ${listId}`,
      action: 'getListDetails'
    });
    throw enhancedError;
  }
}
```

3. Add proper error logging to help diagnose issues
4. Create tests to verify the fixed implementation works with real API calls

## Issue #181: Add Attribute Type Validation

### Description

The MCP server should validate attribute types before sending update requests to the Attio API to prevent errors and improve usability, especially for LLM integrations.

### Implementation Instructions

1. Create a validation module for attribute types:

```typescript
// In src/validators/attribute-validator.ts
import { AttributeType, AttributeValue } from '../types/attio';

export interface ValidationResult {
  valid: boolean;
  convertedValue?: any;
  error?: string;
}

export function validateAttributeValue(
  attributeName: string, 
  value: any, 
  expectedType: AttributeType
): ValidationResult {
  // Implement validation logic per attribute type
  switch(expectedType) {
    case 'boolean':
      return validateBooleanValue(value);
    case 'number':
      return validateNumberValue(value);
    case 'string':
      return validateStringValue(value);
    case 'date':
      return validateDateValue(value);
    // Add other type validations as needed
    default:
      return { valid: true, convertedValue: value };
  }
}

// Implement specific validation functions for each type
```

2. Integrate validation with attribute mapping process
3. Add auto-conversion for common type mismatches
4. Implement user-friendly error messages for type validation failures
5. Write tests for the validation module

## Issue #182: Fix advanced-search-companies Tool

### Description

When using the advanced-search-companies tool through the MCP server, it fails with an API error instead of returning search results.

### Steps to Reproduce

1. Use the mcp__attio__advanced-search-companies tool with valid filter parameters
2. Tool returns error: Error calling tool advanced-search-companies: [object Object]

### Implementation Instructions

1. Debug the advanced-search-companies implementation to identify the exact API error
2. Fix the API call structure:

```typescript
// In appropriate file handling advanced company search
export async function advancedSearchCompanies(filters: any, limit?: number, offset?: number): Promise<any> {
  try {
    // Verify filter structure conforms to Attio API requirements
    // Ensure proper parameter validation
    
    const response = await attioClient.post('/companies/search', {
      filters,
      limit: limit || 20,
      offset: offset || 0
    });
    
    return formatCompanySearchResponse(response.data);
  } catch (error) {
    // Enhance error detail
    const enhancedError = enhanceError(error, {
      context: 'Error performing advanced company search',
      action: 'advancedSearchCompanies',
      data: { filters, limit, offset }
    });
    throw enhancedError;
  }
}
```

3. Verify filter translation is working correctly
4. Add logging to track API request/response details
5. Create tests with various filter combinations

## Implementation Strategy

These issues are related to attribute mapping, type validation, and API error handling. The recommended implementation order is:

1. First implement #176 (Industry Field Fix) as it's a simple mapping change
2. Then implement #181 (Attribute Type Validation) as it creates the foundation for #178
3. Next implement #178 (Boolean Attribute Updates) which will use the validation framework
4. Finally fix the API errors in #179 and #182 which may benefit from the improved error handling

## Testing Requirements

For each issue, create or update the following tests:

1. Unit tests for new validation functions
2. Integration tests using mock API responses
3. End-to-end tests with the actual Attio API (with SKIP_INTEGRATION_TESTS option)

All tests should be placed in the `/test` directory following the project structure:

- Unit tests in `/test/utils/` or appropriate subdirectory
- Integration tests in `/test/integration/`
- API-specific tests in `/test/api/`

Remember to follow the project's testing conventions:
- Use Jest for TypeScript tests (*.test.ts)
- Manual test scripts should use -test.js suffix
- Test files should mirror the structure of the source code they test