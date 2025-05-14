# Attio MCP Advanced Filtering Guide

This guide provides comprehensive documentation for the filtering capabilities in the Attio MCP server. It covers all filtering types, from basic text searches to advanced date range, numeric range, and activity filtering.

## Contents

- [Basic Filtering](#basic-filtering)
- [Date Range Filtering](#date-range-filtering)
- [Numeric Range Filtering](#numeric-range-filtering)
- [Activity and Historical Filtering](#activity-and-historical-filtering)
- [Combining Multiple Filters](#combining-multiple-filters)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)

## Basic Filtering

The MCP server supports basic filtering by text attributes like name, email, phone, etc.

### Text Filtering

```typescript
// Simple search by name
const nameFilter = {
  filters: [
    {
      attribute: { slug: 'name' },
      condition: 'contains',
      value: 'Smith'
    }
  ]
};

// Email domain filtering
const emailFilter = {
  filters: [
    {
      attribute: { slug: 'email' },
      condition: 'contains',
      value: '@example.com'
    }
  ]
};
```

### Logical Operators

You can combine multiple conditions with AND logic (default) or OR logic:

```typescript
// AND logic (default) - records must match ALL conditions
const andFilter = {
  filters: [
    {
      attribute: { slug: 'name' },
      condition: 'contains',
      value: 'Smith'
    },
    {
      attribute: { slug: 'email' },
      condition: 'contains',
      value: '@example.com'
    }
  ],
  matchAny: false // AND logic (default if omitted)
};

// OR logic - records must match ANY condition
const orFilter = {
  filters: [
    {
      attribute: { slug: 'name' },
      condition: 'contains',
      value: 'Smith'
    },
    {
      attribute: { slug: 'name' },
      condition: 'contains',
      value: 'Johnson'
    }
  ],
  matchAny: true // OR logic
};
```

## Date Range Filtering

Date range filtering allows you to filter records based on date attributes like creation date, modification date, or other date fields.

### Absolute Date Ranges

You can specify explicit start and end dates in ISO format:

```typescript
const dateRangeFilter = {
  dateRange: {
    start: '2023-01-01T00:00:00Z',
    end: '2023-12-31T23:59:59Z'
  }
};

// Using the helper function
const dateFilter = createDateRangeFilter('created_at', {
  start: '2023-01-01T00:00:00Z',
  end: '2023-12-31T23:59:59Z'
});
```

### Relative Date Ranges

You can also use relative date expressions for more dynamic filtering:

```typescript
// Last 30 days
const last30DaysFilter = {
  dateRange: {
    start: {
      unit: 'day',
      value: 30,
      direction: 'past'
    },
    end: new Date().toISOString()
  }
};

// Next quarter
const nextQuarterFilter = {
  dateRange: {
    start: new Date().toISOString(),
    end: {
      unit: 'quarter',
      value: 1,
      direction: 'future'
    }
  }
};
```

### Date Presets

The system provides convenient presets for common date ranges:

```typescript
// Today
const todayFilter = {
  dateRange: {
    preset: 'today'
  }
};

// Other presets:
// - 'yesterday'
// - 'this_week'
// - 'last_week'
// - 'this_month'
// - 'last_month'
// - 'this_quarter'
// - 'last_quarter'
// - 'this_year'
// - 'last_year'
```

## Numeric Range Filtering

Numeric range filtering allows you to filter records based on numeric fields such as revenue, employee count, etc.

### Exact Match

```typescript
const revenueExactFilter = {
  min: 1000000
};

// Using the helper function
const filter = createNumericFilter('annual_revenue', {
  equals: 1000000
});
```

### Range Filtering

```typescript
// Greater than or equal to
const minRevenueFilter = {
  min: 1000000
};

// Less than or equal to
const maxRevenueFilter = {
  max: 5000000
};

// Between range (inclusive)
const revenueRangeFilter = {
  min: 1000000,
  max: 5000000
};

// Using the helper function
const filter = createNumericFilter('annual_revenue', {
  min: 1000000,
  max: 5000000
});
```

## Activity and Historical Filtering

Activity filtering enables you to find records based on their activity history, such as when they were created, modified, or when specific interactions occurred.

### Creation Date Filtering

```typescript
// Find records created in a specific time period
const creationFilter = {
  dateRange: {
    start: '2023-01-01T00:00:00Z',
    end: '2023-12-31T23:59:59Z'
  }
};

// Search for people created in this time period
const people = await searchPeopleByCreationDate(creationFilter);
```

### Modification Date Filtering

```typescript
// Find records modified recently
const modificationFilter = {
  dateRange: {
    preset: 'this_week'
  }
};

// Search for people modified this week
const people = await searchPeopleByModificationDate(modificationFilter);
```

### Interaction Filtering

```typescript
// Find records with email interactions in the last month
const interactionFilter = {
  dateRange: {
    preset: 'last_month'
  },
  interactionType: 'email'
};

// Search for people with email interactions in the last month
const people = await searchPeopleByLastInteraction(
  interactionFilter.dateRange,
  interactionFilter.interactionType
);
```

### Combined Activity Filtering

```typescript
// Find records with any activity in a specific date range
const activityFilter = {
  dateRange: {
    start: '2023-01-01T00:00:00Z',
    end: '2023-12-31T23:59:59Z'
  },
  interactionType: 'any'
};

// Search for people with any activity in this period
const people = await searchPeopleByActivity(activityFilter);
```

## Combining Multiple Filters

You can create complex queries by combining different filter types.

### Combining with AND Logic

```typescript
// Find people named Smith who were created this year and have annual revenue > $1M
const combinedFilter = combineFiltersWithAnd(
  createContainsFilter('name', 'Smith'),
  createDateRangeFilter('created_at', { preset: 'this_year' }),
  createNumericFilter('annual_revenue', { min: 1000000 })
);

// Search with the combined filter
const results = await advancedSearchPeople(combinedFilter);
```

### Combining with OR Logic

```typescript
// Find people who are either named Smith or have email from example.com
const combinedFilter = combineFiltersWithOr(
  createContainsFilter('name', 'Smith'),
  createContainsFilter('email', '@example.com')
);

// Search with the combined filter
const results = await advancedSearchPeople(combinedFilter);
```

### Complex Example with Both AND and OR Logic

To create more complex filters with nested logic, you can use the raw filter format:

```typescript
// Find:
// - People named Smith who were created this year 
// OR
// - People with example.com email who have revenue > $1M
const complexFilter = {
  filterGroups: [
    {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: 'contains',
          value: 'Smith'
        },
        {
          attribute: { slug: 'created_at' },
          condition: 'greater_than_or_equals',
          value: '2023-01-01T00:00:00Z'
        }
      ],
      matchAny: false // AND logic within this group
    },
    {
      filters: [
        {
          attribute: { slug: 'email' },
          condition: 'contains',
          value: '@example.com'
        },
        {
          attribute: { slug: 'annual_revenue' },
          condition: 'greater_than',
          value: 1000000
        }
      ],
      matchAny: false // AND logic within this group
    }
  ],
  matchAny: true // OR logic between groups
};
```

## Performance Optimization

### Pagination

For better performance with large result sets, use pagination:

```typescript
// First page (20 results)
const firstPage = await searchPeopleByCreationDate(dateRange, 20, 0);

// Second page (next 20 results)
const secondPage = await searchPeopleByCreationDate(dateRange, 20, 20);
```

### Filter Selection Tips

1. **Use Specific Filters First**: Start with the most specific filters to reduce the result set early.
2. **Limit Results**: Always specify a reasonable limit to avoid retrieving unnecessarily large datasets.
3. **Prefer Server-Side Filtering**: When possible, use filters that can be processed server-side rather than client-side filtering.
4. **Avoid Complex OR Queries**: When possible, split complex OR queries into separate requests and combine the results client-side.

## Error Handling

The filtering system provides detailed error messages for invalid inputs:

```typescript
try {
  // Try to use an invalid date range
  const results = await searchPeopleByCreationDate({
    preset: 'invalid_preset'
  });
} catch (error) {
  // Error will contain detailed information about what went wrong
  console.error(error.message);
  // Output: "Failed to search people by creation date: Invalid date preset: "invalid_preset". Valid presets are: today, yesterday, this_week, last_week, this_month, last_month, this_quarter, last_quarter, this_year, last_year"
}
```

### Common Validation Errors

- **Invalid Date Format**: Make sure date strings are in ISO format (YYYY-MM-DDTHH:MM:SSZ).
- **Invalid Presets**: Only use the supported preset values.
- **Invalid Numeric Values**: Make sure min/max values are valid numbers.
- **Invalid Filter Conditions**: Only use the supported condition types for each attribute type.
- **Inconsistent Date Ranges**: Start date must be before or equal to end date.
- **Missing Required Properties**: Ensure all required properties are provided.

## API Reference

For more detailed information about specific filter functions, refer to the following documentation:

- [Advanced Filtering](./advanced-filtering.md) - General filtering capabilities
- [Date and Numeric Range Filtering](./date-numeric-filtering.md) - Detailed documentation for date and numeric filters
- [Activity and Historical Filtering](./activity-historical-filtering.md) - Documentation for activity-based filters