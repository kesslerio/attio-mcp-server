# Attio API Limitations and Workarounds

This document outlines known limitations of the Attio API and provides practical workarounds for common use cases.

## Overview

While the Attio API provides comprehensive functionality for most CRM operations, certain advanced features are not directly supported. This guide helps developers understand these limitations and implement effective workarounds.

## Known Limitations

### 1. Tasks Attribute Discovery (✅ RESOLVED)

**Previous Limitation**: The `/objects/tasks/attributes` endpoint was not available, causing field filtering failures.

**Status**: **FIXED** - Implemented special case handling with predefined task attribute metadata.

**Solution Implemented**:

```typescript
// Special handling for tasks attributes
const TASKS_ATTRIBUTES = [
  { slug: 'content', type: 'text', name: 'Content' },
  { slug: 'status', type: 'select', name: 'Status' },
  { slug: 'due_date', type: 'date', name: 'Due Date' },
  { slug: 'assignee', type: 'person', name: 'Assignee' },
  { slug: 'linked_records', type: 'record', name: 'Linked Records' },
  { slug: 'created_at', type: 'date', name: 'Created At' },
  { slug: 'updated_at', type: 'date', name: 'Updated At' },
];
```

### 2. Task Relationship Filtering

**Limitation**: The API does not support filtering tasks by linked records (people or companies).

**Affected Operations**:

- `PERSON_TO_TASKS` relationship search
- `COMPANY_TO_TASKS` relationship search

**Workaround**:

```typescript
// Instead of direct filtering, retrieve all tasks and filter programmatically
import { filterTasksByPerson, filterTasksByCompany } from './utils/workarounds';

// Get all tasks
const allTasks = await searchRecords({ resource_type: 'tasks' });

// Filter by person
const personTasks = filterTasksByPerson(allTasks, personId);

// Filter by company
const companyTasks = filterTasksByCompany(allTasks, companyId);
```

### 2. Date Filtering for Non-People Resources

**Limitation**: Native date filtering is only available for people records. Companies, records, and tasks do not support timeframe searches.

**Affected Operations**:

- Company creation/modification date filtering
- Task date range queries
- Custom record timeframe searches

**Workaround**:

```typescript
import { filterRecordsByDate } from './utils/workarounds';

// Get all records
const allCompanies = await searchRecords({ resource_type: 'companies' });

// Filter by date range
const recentCompanies = filterRecordsByDate(
  allCompanies,
  'created_at',
  '2024-01-01',
  '2024-03-31'
);
```

### 3. Interaction Content Search

**Limitation**: Limited ability to search interaction content directly through the API.

**Affected Operations**:

- Full-text search across interactions
- Content-based interaction filtering

**Workaround**:

```typescript
import { searchRecordsContent } from './utils/workarounds';

// Get all interactions
const interactions = await getInteractions();

// Search content
const matchingInteractions = searchRecordsContent(
  interactions,
  'meeting notes',
  ['content', 'subject', 'description']
);
```

## Advanced Workarounds

### Relative Date Support

While not natively supported, you can use the date parser utilities to handle natural language dates:

```typescript
import { parseRelativeDate, normalizeDate } from './utils/date-parser';

// Parse relative dates
const lastWeek = parseRelativeDate('last week');
// Returns: { start: '2024-03-04', end: '2024-03-10' }

// Normalize various date formats
const isoDate = normalizeDate('yesterday');
// Returns: '2024-03-14'
```

### Batch Operations with Relationship Handling

When performing batch operations that involve relationships:

```typescript
import { groupRecordsByField } from './utils/workarounds';

// Group tasks by company for batch processing
const tasksByCompany = groupRecordsByField(tasks, 'company');

// Process each company's tasks
for (const [companyId, companyTasks] of tasksByCompany) {
  await processTasks(companyTasks);
}
```

### Data Aggregation

For aggregation not provided by the API:

```typescript
import {
  createRecordsSummary,
  getUniqueFieldValues,
} from './utils/workarounds';

// Get summary statistics
const summary = createRecordsSummary(records, ['status', 'priority', 'owner']);

// Get unique values for a field
const uniqueStatuses = getUniqueFieldValues(records, 'status');
```

## Best Practices

### 1. Minimize API Calls

Since many workarounds require fetching all records, implement caching where possible:

```typescript
class RecordCache {
  private cache = new Map();
  private ttl = 5 * 60 * 1000; // 5 minutes

  async get(resourceType: string) {
    const cached = this.cache.get(resourceType);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const data = await searchRecords({ resource_type: resourceType });
    this.cache.set(resourceType, { data, timestamp: Date.now() });
    return data;
  }
}
```

### 2. Implement Progressive Loading

For large datasets, implement progressive loading:

```typescript
async function* loadRecordsProgressive(resourceType: string, limit = 100) {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = await searchRecords({
      resource_type: resourceType,
      limit,
      offset,
    });

    yield batch;

    hasMore = batch.length === limit;
    offset += limit;
  }
}
```

### 3. Error Handling

Always provide clear error messages that guide users to workarounds:

```typescript
throw new Error(
  `Task relationship search (${relationship_type}) is not currently available. ` +
    `This feature requires enhanced API filtering capabilities. ` +
    `As a workaround, you can use the 'records.search' tool with resource_type='tasks' ` +
    `to find all tasks, then filter the results programmatically.`
);
```

## Future Improvements

The following features may be added as the Attio API evolves:

1. **Native task filtering by relationships**: Direct API support for PERSON_TO_TASKS and COMPANY_TO_TASKS
2. **Enhanced date filtering**: Timeframe operations for all resource types
3. **Advanced content search**: Full-text search across all record types
4. **GraphQL-style field selection**: Reduce payload size by selecting specific fields
5. **Webhook support**: Real-time updates for record changes

## Migration Guide

When API improvements become available, migration from workarounds should be straightforward:

```typescript
// Current workaround
const tasks = await searchRecords({ resource_type: 'tasks' });
const personTasks = filterTasksByPerson(tasks, personId);

// Future API (when available)
const personTasks = await searchRecords({
  resource_type: 'tasks',
  filter: {
    person_id: personId,
  },
});
```

## Support

For questions about these limitations or workarounds:

1. Check the [official Attio API documentation](https://docs.attio.com/api)
2. Review the workaround utilities in `/src/utils/workarounds.ts`
3. See examples in the test files: `/test/utils/`

## Contributing

If you discover new limitations or develop effective workarounds:

1. Document the limitation clearly
2. Provide a tested workaround
3. Submit a PR with tests
4. Update this documentation
