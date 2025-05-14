# Activity and Historical Filtering

This document describes the Activity and Historical Filtering capabilities of the Attio MCP server.

## Overview

Activity and Historical Filtering allows you to search for records based on:

1. **Creation Date**: Find records created within a specific date range
2. **Modification Date**: Find records last modified within a specific date range
3. **Interaction History**: Find records with interactions (email, calendar, etc.) within a specific date range
4. **Activity Filtering**: Combines date ranges with interaction types for advanced activity filtering

These filtering capabilities are particularly useful for finding recently created or updated records, or for identifying records that have had recent activity.

## Date Range Specification

Date ranges can be specified in multiple formats:

### ISO Date Strings

```json
{
  "start": "2023-01-01T00:00:00.000Z",
  "end": "2023-12-31T23:59:59.999Z"
}
```

### Relative Dates

```json
{
  "start": {
    "unit": "month",
    "value": 3,
    "direction": "past"
  },
  "end": "2023-12-31T23:59:59.999Z"
}
```

Supported units: `day`, `week`, `month`, `quarter`, `year`
Directions: `past`, `future`

### Presets

```json
{
  "preset": "this_week"
}
```

Supported presets:
- `today`
- `yesterday`
- `this_week`
- `last_week`
- `this_month`
- `last_month`
- `this_quarter`
- `last_quarter`
- `this_year`
- `last_year`

## Available Filtering Tools

### For People

#### Search by Creation Date

```javascript
// Find people created in the last 30 days
await searchPeopleByCreationDate({
  start: {
    unit: "day",
    value: 30,
    direction: "past"
  },
  end: new Date().toISOString()
});

// Find people created this month
await searchPeopleByCreationDate({
  preset: "this_month"
});
```

#### Search by Modification Date

```javascript
// Find people modified in the last week
await searchPeopleByModificationDate({
  preset: "this_week"
});
```

#### Search by Last Interaction

```javascript
// Find people with email interactions in the last quarter
await searchPeopleByLastInteraction(
  {
    preset: "this_quarter"
  },
  "email"
);
```

#### Search by Activity

```javascript
// Find people with any activity in a specific date range
await searchPeopleByActivity({
  dateRange: {
    start: "2023-01-01T00:00:00.000Z",
    end: "2023-12-31T23:59:59.999Z"
  },
  interactionType: "any"
});
```

### For Companies

The same filtering capabilities are available for companies.

## Implementation Details

### Filtering Functions

The implementation provides several utility functions for creating filters:

- `createDateRangeFilter(attributeSlug, dateRange)`: Creates a date range filter for any attribute
- `createCreatedDateFilter(dateRange)`: Creates a filter for the creation date
- `createModifiedDateFilter(dateRange)`: Creates a filter for the modification date
- `createLastInteractionFilter(dateRange, interactionType)`: Creates a filter for the last interaction
- `createActivityFilter(activityFilter)`: Creates a filter for activity (combining date and interaction type)

### Date Utilities

Date utilities help with handling relative dates and presets:

- `resolveRelativeDate(relativeDate)`: Converts a relative date to an ISO string
- `createDateRangeFromPreset(preset)`: Creates a date range from a preset name
- `resolveDateRange(dateRange)`: Resolves a complete date range specification
- `createRelativeDateRange(value, unit)`: Creates a date range for a specific relative period
- `formatDate(dateString, format)`: Formats a date for display

## Usage Examples

### Example 1: Finding Recently Modified Records

```javascript
// Find people modified in the last 7 days
const recentlyModifiedPeople = await searchPeopleByModificationDate({
  start: {
    unit: "day",
    value: 7,
    direction: "past"
  },
  end: new Date().toISOString()
});
```

### Example 2: Finding Records with Recent Email Interactions

```javascript
// Find people with email interactions in the last month
const peopleWithRecentEmails = await searchPeopleByLastInteraction(
  {
    preset: "last_month"
  },
  "email"
);
```

### Example 3: Advanced Activity Filtering

```javascript
// Find people with calendar interactions in a specific date range
const peopleWithMeetings = await searchPeopleByActivity({
  dateRange: {
    start: "2023-01-01T00:00:00.000Z",
    end: "2023-12-31T23:59:59.999Z"
  },
  interactionType: "calendar"
});
```

## Technical Notes

- Date range filters are implemented using combination of `greater_than_or_equals` and `less_than_or_equals` conditions.
- Activity filters combine date range filters with specific interaction type filters.
- Relative dates are resolved to absolute ISO date strings at the time of query execution.
- Preset date ranges are resolved to appropriate start and end dates based on the current date.