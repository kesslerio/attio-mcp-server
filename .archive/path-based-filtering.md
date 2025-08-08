# Path-Based Filtering for List Entries

This document explains how to use path-based filtering to find list entries based on properties of their parent records.

## Overview

Path-based filtering allows you to filter list entries by traversing relationships between objects. Specifically, you can filter list entries based on attributes of their parent records (the companies or people that the list entries are associated with).

This is particularly useful when you want to find all entries in a list where the parent record matches certain criteria. For example:
- Find all entries in a "Prospects" list where the parent company is in the "Technology" industry
- Find all entries in a "Contacts" list where the parent person has an email from a specific domain
- Find all entries in a "Deals" list where the parent company has more than 100 employees

## API Reference

### Filter List Entries by Parent Record Properties

```
filter-list-entries-by-parent
```

This tool allows you to filter list entries based on any attribute of their parent records.

#### Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| listId | string | ID of the list to filter entries from | Yes |
| parentObjectType | string | Type of the parent record (e.g., 'companies', 'people') | Yes |
| parentAttributeSlug | string | Attribute of the parent record to filter by | Yes |
| condition | string | Filter condition (e.g., 'equals', 'contains', 'greater_than') | Yes |
| value | any | Value to filter by | Yes |
| limit | number | Maximum number of entries to fetch (default: 20) | No |
| offset | number | Number of entries to skip for pagination (default: 0) | No |

#### Example Usage

```javascript
// Find entries in a list where the parent company is in the Technology industry
const results = await filterListEntriesByParent(
  'list_12345',    // listId
  'companies',     // parentObjectType
  'industry',      // parentAttributeSlug
  'contains',      // condition
  'Technology',    // value
  10               // limit
);

// Find entries in a list where the parent person has an email from a specific domain
const results = await filterListEntriesByParent(
  'list_67890',    // listId
  'people',        // parentObjectType
  'email_addresses', // parentAttributeSlug
  'contains',      // condition
  '@example.com',  // value
  20               // limit
);
```

### Filter List Entries by Parent Record ID

```
filter-list-entries-by-parent-id
```

This is a simplified version of the above tool for the common case of filtering by record ID.

#### Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| listId | string | ID of the list to filter entries from | Yes |
| recordId | string | ID of the parent record to filter by | Yes |
| limit | number | Maximum number of entries to fetch (default: 20) | No |
| offset | number | Number of entries to skip for pagination (default: 0) | No |

#### Example Usage

```javascript
// Find all entries in a list associated with a specific company
const results = await filterListEntriesByParentId(
  'list_12345',     // listId
  'company_abcdef', // recordId
  10                // limit
);
```

## Supported Filter Conditions

The following filter conditions are supported for path-based filtering:

| Condition | Description | Example |
|-----------|-------------|---------|
| equals, eq | Exact match | industry equals "Technology" |
| contains | Contains the string | email_addresses contains "@example.com" |
| starts_with | Starts with the string | name starts_with "Acme" |
| ends_with | Ends with the string | domain ends_with ".com" |
| greater_than, gt | Greater than the value | employee_count greater_than 100 |
| less_than, lt | Less than the value | revenue less_than 1000000 |
| greater_than_or_equals, gte | Greater than or equal | age greater_than_or_equals 18 |
| less_than_or_equals, lte | Less than or equal | date less_than_or_equals "2023-12-31" |
| not_equals, ne | Not an exact match | status not_equals "Inactive" |
| is_empty, is_not_set | Value is empty | description is_empty |
| is_not_empty, is_set | Value is not empty | phone_numbers is_not_empty |
| in | Value is in the array | industry in ["Technology", "SaaS"] |

## Special Attribute Handling

Some attributes receive special handling:

### Record ID Filtering

When filtering by `id` or `record_id`, the filter is optimized to use a direct record ID lookup:

```javascript
// These are equivalent
await filterListEntriesByParent('list_12345', 'companies', 'id', 'equals', 'company_abc123');
await filterListEntriesByParentId('list_12345', 'company_abc123');
```

### Name Filtering

When filtering by `name`, the filter uses `full_name` in the query:

```javascript
// This uses full_name in the query
await filterListEntriesByParent('list_12345', 'companies', 'name', 'contains', 'Acme');
```

### Email Address Filtering

When filtering by `email_addresses`, the filter uses `email_address` in the query:

```javascript
// This uses email_address in the query
await filterListEntriesByParent('list_12345', 'people', 'email_addresses', 'contains', '@example.com');
```

## Implementation Details

Path-based filtering is implemented using the Attio API's path filter feature, which allows for filtering by following paths through related objects. This is accomplished by constructing a filter with:

1. A `path` array that specifies the path to follow from the list entry to the parent record attribute
2. A `constraints` object that specifies the filter condition and value

For example, to filter list entries where the parent company's industry contains "Technology":

```javascript
{
  path: [
    ['my_list', 'parent_record'],
    ['companies', 'industry']
  ],
  constraints: { contains: 'Technology' }
}
```

The path array consists of tuples where:
- The first element is the object slug/ID
- The second element is the attribute or relationship to traverse

## Error Handling

The path-based filtering tools handle common errors including:

- Invalid list IDs
- Invalid parent object types
- Invalid attribute slugs
- Invalid filter conditions

All errors include descriptive messages to help troubleshoot issues.

## Performance Considerations

- Path-based filters may be slower than direct attribute filters, especially for large lists
- Consider using pagination (limit and offset) for large result sets
- For best performance when filtering by record ID, use the specialized `filterListEntriesByParentId` function