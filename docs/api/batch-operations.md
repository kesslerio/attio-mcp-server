# Batch Operations API

The Batch Operations API allows you to perform multiple operations in a single request, optimizing API usage and reducing network overhead. This is especially useful for bulk operations like searching for multiple records or retrieving details for multiple entities.

## Key Benefits

- **Performance**: Significantly reduced API calls for bulk operations
- **Reliability**: Enhanced error handling with partial success capability
- **Flexibility**: Configurable behavior for partial failures and retries
- **Consistency**: Standardized response format for all batch operations

## Batch Configuration

All batch operations support the following configuration options:

```typescript
interface BatchConfig {
  maxBatchSize: number;     // Maximum number of operations in a single batch
  continueOnError: boolean; // Whether to continue processing remaining items on error
  retryConfig?: RetryConfig; // Optional retry configuration for batch operations
}
```

Default configuration:
```typescript
const DEFAULT_BATCH_CONFIG = {
  maxBatchSize: 10,
  continueOnError: true,
  retryConfig: DEFAULT_RETRY_CONFIG
};
```

## Response Format

All batch operations return a standardized response format:

```typescript
interface BatchResponse<R> {
  results: BatchItemResult<R>[];  // Individual results for each request
  summary: {
    total: number;    // Total number of operations attempted
    succeeded: number; // Number of successful operations
    failed: number;    // Number of failed operations
  };
}

interface BatchItemResult<R> {
  id?: string;     // Optional ID matching the request ID if provided
  success: boolean; // Whether this specific operation succeeded
  data?: R;        // The result data if successful
  error?: any;     // Error information if failed
}
```

## Available Batch Operations

### People API

#### batchSearchPeople

Search for multiple people in a single batch request.

```typescript
async function batchSearchPeople(
  queries: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Person[]>>
```

Example:
```typescript
import { batchSearchPeople } from './objects/people';

// Search for multiple people in one batch request
const results = await batchSearchPeople(['John Doe', 'jane@example.com', '+1234567890']);

// Process results
console.log(`Total searches: ${results.summary.total}`);
console.log(`Successful searches: ${results.summary.succeeded}`);
console.log(`Failed searches: ${results.summary.failed}`);

// Access individual results
results.results.forEach((result, index) => {
  if (result.success) {
    console.log(`Search ${index + 1} found ${result.data.length} people`);
    result.data.forEach(person => {
      console.log(`- ${person.values.name?.[0]?.value || 'Unnamed'}`);
    });
  } else {
    console.log(`Search ${index + 1} failed: ${result.error.message}`);
  }
});
```

#### batchGetPeopleDetails

Get details for multiple people in a single batch request.

```typescript
async function batchGetPeopleDetails(
  personIds: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Person>>
```

Example:
```typescript
import { batchGetPeopleDetails } from './objects/people';

// Get details for multiple people in one batch request
const results = await batchGetPeopleDetails(['person123', 'person456', 'person789']);

// Process results
results.results.forEach(result => {
  if (result.success) {
    const person = result.data;
    console.log(`Person: ${person.values.name?.[0]?.value || 'Unnamed'}`);
    console.log(`Email: ${person.values.email?.[0]?.value || 'No email'}`);
  } else {
    console.log(`Failed to get person: ${result.error.message}`);
  }
});
```

### Companies API

#### batchSearchCompanies

Search for multiple companies in a single batch request.

```typescript
async function batchSearchCompanies(
  queries: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Company[]>>
```

Example:
```typescript
import { batchSearchCompanies } from './objects/companies';

// Search for multiple companies in one batch request
const results = await batchSearchCompanies(['Acme Inc', 'Globex Corp']);

// Process results
results.results.forEach((result, index) => {
  if (result.success) {
    console.log(`Search ${index + 1} found ${result.data.length} companies`);
    result.data.forEach(company => {
      console.log(`- ${company.values.name?.[0]?.value || 'Unnamed'}`);
    });
  } else {
    console.log(`Search ${index + 1} failed: ${result.error.message}`);
  }
});
```

#### batchGetCompanyDetails

Get details for multiple companies in a single batch request.

```typescript
async function batchGetCompanyDetails(
  companyIdsOrUris: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Company>>
```

Example:
```typescript
import { batchGetCompanyDetails } from './objects/companies';

// Get details for multiple companies in one batch request
// Supports both direct IDs and URI format
const results = await batchGetCompanyDetails([
  'company123', 
  'attio://companies/company456', 
  'company789'
]);

// Process results
results.results.forEach(result => {
  if (result.success) {
    const company = result.data;
    console.log(`Company: ${company.values.name?.[0]?.value || 'Unnamed'}`);
    console.log(`Website: ${company.values.website?.[0]?.value || 'No website'}`);
  } else {
    console.log(`Failed to get company: ${result.error.message}`);
  }
});
```

### Lists API

#### batchGetListsDetails

Get details for multiple lists in a single batch request.

```typescript
async function batchGetListsDetails(
  listIds: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<AttioList>>
```

Example:
```typescript
import { batchGetListsDetails } from './objects/lists';

// Get details for multiple lists in one batch request
const results = await batchGetListsDetails(['list123', 'list456', 'list789']);

// Process results
results.results.forEach(result => {
  if (result.success) {
    const list = result.data;
    console.log(`List: ${list.title}`);
    console.log(`Object type: ${list.object_slug}`);
    console.log(`Entry count: ${list.entry_count || 'Unknown'}`);
  } else {
    console.log(`Failed to get list: ${result.error.message}`);
  }
});
```

#### batchGetListsEntries

Get entries for multiple lists in a single batch request.

```typescript
async function batchGetListsEntries(
  listConfigs: Array<{ listId: string; limit?: number; offset?: number }>,
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<AttioListEntry[]>>
```

Example:
```typescript
import { batchGetListsEntries } from './objects/lists';

// Get entries for multiple lists with different pagination in one batch request
const results = await batchGetListsEntries([
  { listId: 'list123', limit: 10 },
  { listId: 'list456', limit: 5, offset: 10 },
  { listId: 'list789' }  // Uses default limit/offset
]);

// Process results
results.results.forEach((result, index) => {
  if (result.success) {
    console.log(`List ${index + 1} has ${result.data.length} entries`);
    result.data.forEach(entry => {
      console.log(`- Entry ID: ${entry.id.entry_id}, Record ID: ${entry.record_id}`);
    });
  } else {
    console.log(`Failed to get list entries: ${result.error.message}`);
  }
});
```

## Advanced Usage

### Handling Partial Failures

By default, batch operations will continue processing all items even if some fail. This behavior can be customized using the `continueOnError` configuration option.

```typescript
// Continue on error (default)
const results1 = await batchSearchPeople(['John', 'Jane', 'Invalid Query'], {
  continueOnError: true
});
// Will return results for John and Jane even if Invalid Query fails

// Stop on first error
try {
  const results2 = await batchSearchPeople(['John', 'Jane', 'Invalid Query'], {
    continueOnError: false
  });
} catch (error) {
  console.error('Batch operation failed:', error.message);
}
// Will throw an error if any query fails
```

### Customizing Batch Size

The `maxBatchSize` configuration option controls how many operations are processed in parallel. Adjust this based on your performance requirements and API rate limits.

```typescript
// Process up to 5 operations at a time
const results = await batchGetPeopleDetails(personIds, { maxBatchSize: 5 });
```

### Retry Configuration

You can customize retry behavior for transient errors using the `retryConfig` option.

```typescript
const results = await batchGetCompanyDetails(companyIds, {
  retryConfig: {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 5000,
    useExponentialBackoff: true,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
  }
});
```

## Error Handling

Batch operations provide detailed error information for each individual operation that fails. The overall batch operation will only fail if `continueOnError` is set to `false` and at least one operation fails.

When `continueOnError` is `true` (default), you should check the `success` flag for each result to determine if the operation succeeded or failed. If `success` is `false`, the `error` property will contain the error details.

```typescript
const results = await batchSearchPeople(['John', 'Jane', 'Invalid Query']);

// Process results and handle errors individually
results.results.forEach((result, index) => {
  if (result.success) {
    // Process successful result
    console.log(`Search ${index} succeeded with ${result.data.length} results`);
  } else {
    // Handle individual failure
    console.error(`Search ${index} failed:`, result.error.message);
  }
});

// Check overall success rate
console.log(`Success rate: ${results.summary.succeeded / results.summary.total * 100}%`);
```