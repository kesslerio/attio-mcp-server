# Advanced Filtering in Attio MCP

The Attio MCP server provides enhanced filtering capabilities that extend beyond the standard Attio API. This document outlines the advanced filtering features available for People, Companies, and Lists objects, which are now implemented as part of the advanced filtering suite (Issue #57).

## Overview

Advanced filtering enables you to:

1. Create complex filter conditions with multiple criteria
2. Combine conditions using logical operators (AND/OR)
3. Apply various comparison operators to different attribute types
4. Filter by any available attribute, including special handling for email and phone

## Supported Resources

- **People**: Enhanced searching with client-side support for email/phone
- **Companies**: Advanced filtering by name, website, industry, and other attributes
- **Lists**: Comprehensive filtering for list entries

## Filter Structure

Advanced filters follow a consistent structure across all resources:

```typescript
interface ListEntryFilters {
  filters?: ListEntryFilter[]; // Array of individual filter conditions
  matchAny?: boolean; // When true, uses OR logic between conditions; when false/omitted, uses AND logic
  filterGroups?: Array<{
    // Optional groups for nested conditions
    filters: ListEntryFilter[];
    matchAny?: boolean;
  }>;
}

interface ListEntryFilter {
  attribute: {
    slug: string; // Attribute name to filter on
  };
  condition: string; // Condition operator from FilterConditionType
  value: any; // Value to compare against
  logicalOperator?: 'and' | 'or'; // Optional operator to combine with next filter
}
```

## Filter Conditions

All resources support the same set of filter conditions:

| Condition              | Description                       | Applicable Data Types  |
| ---------------------- | --------------------------------- | ---------------------- |
| equals                 | Exact match                       | All types              |
| not_equals             | Not an exact match                | All types              |
| contains               | Contains the given string         | Text, Email, URL       |
| not_contains           | Does not contain the given string | Text, Email, URL       |
| starts_with            | Starts with the given string      | Text, Email, URL       |
| ends_with              | Ends with the given string        | Text, Email, URL       |
| greater_than           | Greater than the given value      | Number, Currency, Date |
| less_than              | Less than the given value         | Number, Currency, Date |
| greater_than_or_equals | Greater than or equal to value    | Number, Currency, Date |
| less_than_or_equals    | Less than or equal to value       | Number, Currency, Date |
| is_empty               | Value is empty                    | All types              |
| is_not_empty           | Value is not empty                | All types              |
| is_set                 | Attribute has a value             | All types              |
| is_not_set             | Attribute does not have a value   | All types              |

## People Filtering

### Special Considerations for Email and Phone

The Attio API has limitations with filtering directly by email or phone attributes. The MCP server provides enhanced capabilities to overcome these limitations by implementing client-side filtering when necessary.

When filtering People records by email or phone:

1. If the filter includes only standard attributes (name, job_title, etc.), server-side filtering is used
2. If the filter includes email or phone attributes, the MCP server:
   - Removes those filters from the API request
   - Fetches a larger result set using the remaining filters
   - Applies email/phone filtering client-side
   - Returns the filtered results

### Example: Filtering People

```typescript
// Basic filter by name
const nameFilter = createNameFilter('John Smith', FilterConditionType.EQUALS);
const people = await advancedSearchPeople(nameFilter);

// Filter by email domain (handled client-side)
const emailFilter = createEmailFilter(
  'gmail.com',
  FilterConditionType.CONTAINS
);
const gmailUsers = await advancedSearchPeople(emailFilter);

// Combined filter with AND logic
const filter = {
  filters: [
    {
      attribute: { slug: 'name' },
      condition: FilterConditionType.CONTAINS,
      value: 'Smith',
    },
    {
      attribute: { slug: 'job_title' },
      condition: FilterConditionType.EQUALS,
      value: 'CEO',
    },
  ],
};
const results = await advancedSearchPeople(filter);
```

### Helper Functions for People Filtering

```typescript
// Create a name filter
const nameFilter = createNameFilter('John', FilterConditionType.CONTAINS);

// Create an email filter
const emailFilter = createEmailFilter(
  'john@example.com',
  FilterConditionType.EQUALS
);

// Create a phone filter
const phoneFilter = createPhoneFilter('+1234', FilterConditionType.STARTS_WITH);
```

## Companies Filtering

Company filtering supports all standard attributes including name, website, industry, etc.

### Example: Filtering Companies

```typescript
// Basic filter by company name
const nameFilter = createNameFilter('Acme', FilterConditionType.CONTAINS);
const companies = await advancedSearchCompanies(nameFilter);

// Filter by website domain
const websiteFilter = createWebsiteFilter(
  'acme.com',
  FilterConditionType.EQUALS
);
const acmeCompanies = await advancedSearchCompanies(websiteFilter);

// Filter by industry with OR logic
const filter = {
  filters: [
    {
      attribute: { slug: 'industry' },
      condition: FilterConditionType.EQUALS,
      value: 'Technology',
    },
    {
      attribute: { slug: 'industry' },
      condition: FilterConditionType.EQUALS,
      value: 'Software',
    },
  ],
  matchAny: true, // OR logic
};
const techCompanies = await advancedSearchCompanies(filter);
```

### Helper Functions for Companies Filtering

```typescript
// Create a name filter
const nameFilter = createNameFilter('Acme', FilterConditionType.CONTAINS);

// Create a website filter
const websiteFilter = createWebsiteFilter(
  'acme.com',
  FilterConditionType.EQUALS
);

// Create an industry filter
const industryFilter = createIndustryFilter(
  'Technology',
  FilterConditionType.EQUALS
);
```

## Using with MCP Tools

For Claude interactions, advanced filtering is available through the following MCP tools:

### People Filtering

```
Use the records.search_advanced-people tool with filters:
- name contains "Smith"
- job_title equals "CEO"
```

### Companies Filtering

```
Use the records.search_advanced-companies tool with filters:
- industry equals "Technology" OR
- annual_revenue greater_than 10000000
```

## Performance Considerations

1. **Email/Phone Filtering**:
   - Client-side filtering for email and phone may impact performance for large result sets
   - When using email or phone filters, the system fetches up to 100 records by default

2. **Combined Filters**:
   - Using more specific filters first can improve performance
   - Combine server-side filters (name, job_title, etc.) with client-side filters (email, phone) when possible

## Advanced Filter Examples

### Complex AND/OR Logic

```typescript
// Companies in Technology industry with revenue > $10M OR
// Companies in Healthcare industry with > 100 employees
const complexFilter = {
  filterGroups: [
    {
      filters: [
        {
          attribute: { slug: 'industry' },
          condition: FilterConditionType.EQUALS,
          value: 'Technology',
        },
        {
          attribute: { slug: 'annual_revenue' },
          condition: FilterConditionType.GREATER_THAN,
          value: 10000000,
        },
      ],
      matchAny: false, // AND logic within this group
    },
    {
      filters: [
        {
          attribute: { slug: 'industry' },
          condition: FilterConditionType.EQUALS,
          value: 'Healthcare',
        },
        {
          attribute: { slug: 'employee_count' },
          condition: FilterConditionType.GREATER_THAN,
          value: 100,
        },
      ],
      matchAny: false, // AND logic within this group
    },
  ],
  matchAny: true, // OR logic between groups
};
```

### Date Range Filtering (Issue #475)

The Attio MCP server provides enhanced timeframe filtering capabilities that support both absolute date ranges and relative timeframes. This functionality works with the Universal Search tools for companies, people, and other resource types.

#### **Using Absolute Date Ranges**

```typescript
// Search companies created between specific dates
const searchParams = {
  resource_type: 'companies',
  date_from: '2023-08-01T00:00:00Z',
  date_to: '2023-08-15T23:59:59Z',
  date_field: 'created_at', // Attribute to filter on
};

// Search people updated after a specific date
const searchParams = {
  resource_type: 'people',
  updated_after: '2023-08-01T00:00:00Z', // Only records updated after this date
};

// Search companies created before a specific date
const searchParams = {
  resource_type: 'companies',
  created_before: '2023-08-15T23:59:59Z', // Only records created before this date
};
```

#### **Using Relative Timeframes**

```typescript
// Search companies created in the last 7 days
const searchParams = {
  resource_type: 'companies',
  timeframe: 'last_7_days',
  date_field: 'created_at',
};

// Search people updated this month
const searchParams = {
  resource_type: 'people',
  timeframe: 'this_month',
  date_field: 'updated_at',
};

// Search companies created yesterday
const searchParams = {
  resource_type: 'companies',
  timeframe: 'yesterday',
  date_field: 'created_at',
};
```

#### **Supported Relative Timeframes**

| Timeframe      | Description                                      |
| -------------- | ------------------------------------------------ |
| `today`        | Records from today (current date)                |
| `yesterday`    | Records from yesterday                           |
| `this_week`    | Records from Monday of current week to now       |
| `last_week`    | Records from Monday to Sunday of previous week   |
| `this_month`   | Records from first day of current month to now   |
| `last_month`   | Records from first to last day of previous month |
| `last_7_days`  | Records from 7 days ago to now                   |
| `last_30_days` | Records from 30 days ago to now                  |
| `last_90_days` | Records from 90 days ago to now                  |

#### **Date Field Options**

| Field        | Description                           |
| ------------ | ------------------------------------- |
| `created_at` | When the record was created (default) |
| `updated_at` | When the record was last updated      |

#### **Combining with Other Filters**

Date filtering can be combined with other search parameters and filters:

```typescript
// Search tech companies created in the last 30 days
const searchParams = {
  resource_type: 'companies',
  timeframe: 'last_30_days',
  date_field: 'created_at',
  filters: {
    filters: [
      {
        attribute: { slug: 'industry' },
        condition: 'contains',
        value: 'Technology',
      },
    ],
  },
};

// Search people by name and date range
const searchParams = {
  resource_type: 'people',
  query: 'John Smith',
  date_from: '2023-01-01T00:00:00Z',
  date_to: '2023-12-31T23:59:59Z',
  date_field: 'updated_at',
};
```

#### **MCP Tool Usage**

When using Claude Desktop, you can use natural language with the Universal Search tools:

```
"Find all companies created in the last 7 days"
"Search for people updated this month"
"Show me companies created between August 1st and 15th"
"Find all contacts added yesterday"
```

#### **Technical Notes**

- All dates must be in ISO 8601 format (e.g., `2023-08-15T12:00:00Z`)
- Relative timeframes take precedence over absolute dates when both are provided
- Timeframe filtering uses UTC timezone for consistent results
- Date validation is performed to ensure proper format and logical date ranges

### Numeric Range Filtering

```typescript
// Companies with revenue between $1M and $10M
const revenueFilter = {
  filters: [
    {
      attribute: { slug: 'annual_revenue' },
      condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
      value: 1000000,
    },
    {
      attribute: { slug: 'annual_revenue' },
      condition: FilterConditionType.LESS_THAN_OR_EQUALS,
      value: 10000000,
    },
  ],
};

// Using the createNumericFilter helper function
const revenueFilter = createNumericFilter('annual_revenue', {
  min: 1000000,
  max: 10000000,
});

// Companies with exactly 500 employees
const exactEmployeeFilter = createNumericFilter('employee_count', {
  equals: 500,
});

// Companies with at least 100 employees
const minEmployeeFilter = createNumericFilter('employee_count', {
  min: 100,
});

// Companies with at most 1000 employees
const maxEmployeeFilter = createNumericFilter('employee_count', {
  max: 1000,
});
```

```

## Related Documentation

- [People API](./people-api.md) - For managing person records
- [Companies API](./companies-api.md) - For managing company records
- [Lists API](./lists-api.md) - For managing lists and list entries
- [Objects API](./objects-api.md) - For understanding object schemas
```
