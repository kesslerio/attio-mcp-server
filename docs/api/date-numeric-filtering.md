# Date, Numeric and Special Field Filtering

This document explains how to use date range filters, numeric filters, and how to handle special fields like B2B Segment (type_persona) that require specific filter operators.

## Special Field Handling

Some fields in the Attio API require special handling. A notable example is the `type_persona` field (mapped from "B2B Segment").

### B2B Segment Filtering

The "type_persona" field uses Attio's shorthand filter format - it doesn't accept standard operators like "$equals" or "$contains". Using standard operators will result in errors:

```
Invalid operator: $equals
Details: { "path": ["type_persona"] }
```

#### How It Works

Unlike regular fields that use operator syntax (`{ "name": { "$contains": "value" }}`), the type_persona field uses direct value assignment (`{ "type_persona": "value" }`).

We've implemented automatic handling for this:

1. **Automatic shorthand format**: When filtering by the "type_persona" field, we automatically use the shorthand format which directly assigns the value to the field without operators.

2. **Helper functions**: We've added dedicated helper functions to make B2B Segment filtering easier:

```typescript
// In utils/filter-utils.js
import { createB2BSegmentFilter } from '../utils/filter-utils.js';

// Example: Search for companies in the 'Enterprise' segment
const enterpriseFilter = createB2BSegmentFilter('Enterprise');
const companies = await advancedSearchCompanies(enterpriseFilter);
```

Or use the specialized companies helper:

```typescript
// In objects/companies.js
import { createB2BSegmentFilter } from '../objects/companies.js';

// Example: Search for companies in the 'Enterprise' segment
const enterpriseFilter = createB2BSegmentFilter('Enterprise');
const companies = await advancedSearchCompanies(enterpriseFilter);
```

Note: Behind the scenes, both of these create a filter with the "equals" condition that our system automatically maps to the required "$eq" operator for the Attio API.

## Date Range Filtering

Our enhanced date utility functions allow for flexible date filtering with:

1. **Absolute dates**: Using ISO strings
2. **Relative dates**: Like "last 7 days" or "next 30 days"
3. **Preset ranges**: Like "this_month", "last_quarter", etc.

Example:

```typescript
import { createDateRangeFilter } from '../utils/filter-utils.js';

// Absolute date range
const absoluteFilter = createDateRangeFilter('created_at', {
  start: '2023-01-01T00:00:00Z',
  end: '2023-12-31T23:59:59Z'
});

// Relative date range
const relativeFilter = createDateRangeFilter('created_at', {
  start: {
    unit: 'day',
    value: 30,
    direction: 'past'
  }
});

// Preset range
const presetFilter = createDateRangeFilter('created_at', {
  preset: 'this_month'
});
```

## Numeric Filtering

Numeric filtering allows for ranges or exact matches:

```typescript
import { createNumericFilter } from '../utils/filter-utils.js';

// Range filtering
const revenueFilter = createNumericFilter('annual_revenue', {
  min: 1000000,
  max: 10000000
});

// Exact match
const employeeFilter = createNumericFilter('employee_count', {
  equals: 500
});

// Or use the specialized helpers
import { createRevenueFilter, createEmployeeCountFilter } from '../utils/filter-utils.js';
const revenueFilter = createRevenueFilter({ min: 1000000, max: 10000000 });
const employeeFilter = createEmployeeCountFilter({ equals: 500 });
```

## Combining Filters

You can combine multiple filters with AND or OR logic:

```typescript
import { 
  combineFiltersWithAnd, 
  combineFiltersWithOr,
  createB2BSegmentFilter,
  createEmployeeCountFilter
} from '../utils/filter-utils.js';

// Enterprise companies with 100-500 employees
const enterpriseFilter = createB2BSegmentFilter('Enterprise');
const employeeFilter = createEmployeeCountFilter({ min: 100, max: 500 });

// Combine with AND logic (both conditions must match)
const combinedFilter = combineFiltersWithAnd(enterpriseFilter, employeeFilter);

// Search companies with the combined filter
const results = await advancedSearchCompanies(combinedFilter);
```