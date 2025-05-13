# Date and Numeric Range Filtering

This document describes how to use the date and numeric range filtering capabilities of the Attio MCP API.

## Date Range Filtering

### Overview

Date range filtering allows you to search for records based on date fields like creation date, modification date, or last interaction date. You can filter using:

- Absolute date ranges with ISO date strings
- Relative date ranges (e.g., "last 7 days", "next month")
- Before/after specific dates
- Between two dates

### API

#### Date Range Types

```typescript
// Represents a relative date value for date range filtering
enum RelativeDateUnit {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

// Represents a relative date expression for filtering
interface RelativeDate {
  unit: RelativeDateUnit;
  value: number;
  direction: 'past' | 'future';
}

// Represents a date range value for filtering
interface DateRange {
  start?: string | RelativeDate; // ISO date string or relative date
  end?: string | RelativeDate; // ISO date string or relative date
}
```

#### Date Range Filter Conditions

The following filter conditions are supported for date fields:

- `EQUALS`: Exact date match
- `GREATER_THAN`: After a date (exclusive)
- `LESS_THAN`: Before a date (exclusive)
- `GREATER_THAN_OR_EQUALS`: On or after a date (inclusive)
- `LESS_THAN_OR_EQUALS`: On or before a date (inclusive)
- `BETWEEN`: Between two dates (inclusive)

#### Helper Functions

The API provides several helper functions to simplify creating date filters:

```typescript
// Create a date range filter
createDateRangeFilter(attributeSlug: string, dateRange: DateRange): ListEntryFilters

// Create a "before date" filter
createBeforeDateFilter(attributeSlug: string, date: string | DateRange): ListEntryFilters

// Create an "after date" filter
createAfterDateFilter(attributeSlug: string, date: string | DateRange): ListEntryFilters

// Create common date filters for People and Companies
createCreatedDateFilter(dateRange: DateRange): ListEntryFilters
createModifiedDateFilter(dateRange: DateRange): ListEntryFilters
createLastInteractionFilter(dateRange: DateRange): ListEntryFilters
```

### Examples

#### Filtering People Created in the Last 30 Days

```typescript
import { createCreatedDateFilter } from '../objects/people.js';
import { RelativeDateUnit } from '../types/attio.js';

// Using a relative date
const filter = createCreatedDateFilter({
  start: {
    unit: RelativeDateUnit.DAY,
    value: 30,
    direction: 'past'
  }
});

// Get people created in the last 30 days
const recentPeople = await advancedSearchPeople(filter);
```

#### Filtering Companies Modified Between Two Dates

```typescript
import { createModifiedDateFilter } from '../objects/companies.js';

// Using absolute dates
const filter = createModifiedDateFilter({
  start: '2023-01-01',
  end: '2023-06-30'
});

// Get companies modified in the first half of 2023
const modifiedCompanies = await advancedSearchCompanies(filter);
```

#### Using Date Presets

```typescript
import { createDateRangeFromPreset } from '../utils/date-utils.js';
import { createLastInteractionFilter } from '../objects/people.js';

// Get the date range for "This Month"
const thisMonthRange = createDateRangeFromPreset('this_month');

// Create a filter for people with interactions this month
const filter = createLastInteractionFilter(thisMonthRange);

// Get people with interactions this month
const activePeople = await advancedSearchPeople(filter);
```

## Numeric Range Filtering

### Overview

Numeric range filtering allows you to search for records based on numeric fields like employee count, revenue, or any other numeric attribute.

### API

#### Numeric Range Filter Conditions

The following filter conditions are supported for numeric fields:

- `EQUALS`: Exact number match
- `GREATER_THAN`: Greater than a number (exclusive)
- `LESS_THAN`: Less than a number (exclusive)
- `GREATER_THAN_OR_EQUALS`: Greater than or equal to a number (inclusive)
- `LESS_THAN_OR_EQUALS`: Less than or equal to a number (inclusive)
- `BETWEEN`: Between two numbers (inclusive)

#### Helper Functions

The API provides helper functions to create numeric range filters:

```typescript
// Create a numeric range filter
createNumericRangeFilter(attributeSlug: string, min?: number, max?: number): ListEntryFilters

// For companies specifically
createNumericFilter(attribute: string, min?: number, max?: number): ListEntryFilters
```

### Examples

#### Filtering Companies by Employee Count Range

```typescript
import { createNumericFilter } from '../objects/companies.js';

// Companies with 50-200 employees
const filter = createNumericFilter('employee_count', 50, 200);

// Get medium-sized companies
const mediumCompanies = await advancedSearchCompanies(filter);
```

#### Filtering Records by Revenue

```typescript
import { createNumericRangeFilter } from '../utils/record-utils.js';

// Companies with revenue over 1M
const filter = {
  filters: [
    ...createNumericRangeFilter('annual_revenue', 1000000).filters
  ]
};

// Get high-revenue companies
const highRevenueCompanies = await advancedSearchCompanies(filter);
```

## Combining Multiple Filters

You can combine multiple filters to create complex queries:

```typescript
import { 
  createNameFilter, 
  createNumericFilter, 
  createCreatedDateFilter 
} from '../objects/companies.js';
import { RelativeDateUnit } from '../types/attio.js';

// Tech companies with 100+ employees created in the last year
const techFilter = createNameFilter('Tech', 'contains');
const sizeFilter = createNumericFilter('employee_count', 100);
const dateFilter = createCreatedDateFilter({
  start: {
    unit: RelativeDateUnit.YEAR,
    value: 1,
    direction: 'past'
  }
});

// Combine filters
const combinedFilter = {
  filters: [
    ...techFilter.filters,
    ...sizeFilter.filters,
    ...dateFilter.filters
  ]
};

// Search with combined filters
const results = await advancedSearchCompanies(combinedFilter);
```

## Advanced Usage

### Using OR Logic Between Filters

By default, filters are combined with AND logic (all conditions must match). To use OR logic:

```typescript
const filter = {
  filters: [
    /* your filters here */
  ],
  matchAny: true // Use OR logic
};
```

### Creating Custom Filter Groups

For more complex filter combinations:

```typescript
import { 
  createNameFilter, 
  createIndustryFilter 
} from '../objects/companies.js';

// Companies in "Tech" OR "Finance" industry
const techFilter = createIndustryFilter('Tech');
const financeFilter = createIndustryFilter('Finance');

const filter = {
  filters: [
    ...techFilter.filters,
    ...financeFilter.filters
  ],
  matchAny: true // Use OR logic between these filters
};

const results = await advancedSearchCompanies(filter);
```