# Fix: Search People API Error - Unknown attribute slug: email

## Problem Description

When attempting to search for people using the `search-people` tool with email addresses, the following error occurred:

```
ERROR [validation_error]: Bad Request: Unknown attribute slug: email.

Details: {
  "status": 400,
  "method": "POST",
  "path": "/objects/people/records/query",
  "detail": "No additional details",
  "responseData": {
    "status_code": 400,
    "type": "invalid_request_error",
    "code": "unknown_filter_attribute_slug",
    "message": "Unknown attribute slug: email.",
    "path": [
      "$or",
      "1",
      "email"
    ]
  }
}
```

## Root Cause

The issue was in the search query structure in the `searchPeople`, `searchPeopleByQuery`, `searchPeopleByEmail`, and `searchPeopleByPhone` functions. The API was rejecting the query because it does not recognize `email` or `phone` as valid attribute slugs in the filter object.

### Original Implementation

In `src/objects/people.ts`, the search query was structured as:

```typescript
filter: {
  "$or": [
    { name: { "$contains": query } },
    { email: { "$contains": query } }, // This field was causing the error
    { phone: { "$contains": query } }  // This field was also problematic
  ]
}
```

## Solution

The solution involved two key changes:

1. **Server-side filtering**: Modified the API calls to only use the `name` attribute in the server-side filter, which is confirmed to work with the Attio API.

2. **Client-side filtering**: Implemented client-side filtering for email and phone searches by:
   - Fetching more records (limit: 100) to ensure we get potential matches
   - Filtering the results in memory based on the email/phone values

### Updated Implementation

```typescript
// For general search:
const response = await api.post(path, {
  filter: {
    name: { "$contains": query }
  }
});

// For email-specific search:
const response = await api.post(path, {
  limit: 100 // Increased limit to get more potential matches
});

// Filter the results client-side by email
const results = (response.data.data || []) as Person[];
return results.filter((person: Person) => 
  person.values?.email?.some((emailObj: {value: string}) => 
    emailObj.value?.toLowerCase().includes(email.toLowerCase())
  )
);
```

## Documentation Updates

The API documentation in `docs/api/people-api.md` has been updated to:

1. Clarify that direct filtering by email or phone is not supported by the API
2. Show the correct response structure with the `values` array format
3. Provide an example of client-side filtering for email searches

## Lessons Learned

1. The Attio API has specific requirements for attribute filtering that may not be obvious from the documentation.
2. The response structure uses a nested array format for attribute values, not direct key-value pairs.
3. Client-side filtering is sometimes necessary when API limitations exist.
4. Always test API integrations with various query types to ensure compatibility.

## Related Issues

- GitHub Issue #29: [Fix: Search People API Error - Unknown attribute slug: email](https://github.com/kesslerio/attio-mcp-server/issues/29)
