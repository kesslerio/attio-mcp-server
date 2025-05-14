# Feature: Implement batch operations for Attio API

## Overview
Implement API call batching to optimize API usage and reduce the number of network requests, building on our enhanced error handling and retry logic.

## Why
- Currently, each operation requires a separate API call
- Batching would reduce API rate limit consumption
- Fewer network requests means lower latency and better reliability
- Complements our retry logic by reducing the need for retries
- Follows modern API best practices

## Implementation Details

### 1. Core Batch Functionality
- Create a batch operations framework with the following components:
  - Generic batch request/response interfaces in `/src/types/attio.ts`
  - Batch operation executor function in `/src/api/attio-operations.ts`
  - Configuration options for batch size, error handling, and retries
  - Support for partial failure handling with detailed error reporting

### 2. Type-Safe Implementations
- Implement strongly-typed batch operations for each resource type:
  - People: `batchSearchPeople`, `batchGetPeopleDetails`
  - Companies: `batchSearchCompanies`, `batchGetCompanyDetails` 
  - Lists: `batchGetListsDetails`, `batchGetListsEntries`
- Ensure consistent interface design across all resource types
- Maintain compatibility with existing single-item operations

### 3. Error Handling Enhancements
- Create `BatchItemResult` interface for tracking individual operation results
- Include success/failure status for each item in the batch
- Provide detailed error information for failed operations
- Implement configurable behavior for partial failures:
  - Continue processing remaining items on error (default)
  - Abort entire batch on first error

### 4. Implementation Phases
- Phase 1: Core batch framework and interfaces
- Phase 2: Resource-specific batch operations
- Phase 3: Testing and refinement
- Phase 4: Documentation and examples

### 5. Key Benefits
- Performance: Significant reduction in API calls for bulk operations
- Reliability: Enhanced error handling with partial success capability
- User Experience: Faster response times and better handling of large datasets

## Acceptance Criteria
- [ ] Implement batch operations for people, companies, lists
- [ ] Support batching for read operations (get, search, list)
- [ ] Ensure proper error handling and reporting for batch operations
- [ ] Maintain retry logic compatibility with batch operations
- [ ] Add tests for batch operations
- [ ] Update documentation with batch operation examples

## Related
Follows up on PR #12 which implemented People API support with enhanced error handling and retry logic.

## Technical Implementation

### 1. New Types and Interfaces
```typescript
// In /src/types/attio.ts
export interface BatchRequestItem<T, R> {
  params: T;
  id?: string;
}

export interface BatchItemResult<R> {
  id?: string;
  success: boolean;
  data?: R;
  error?: any;
}

export interface BatchResponse<R> {
  results: BatchItemResult<R>[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

export interface BatchConfig {
  maxBatchSize: number;
  continueOnError: boolean;
  retryConfig?: RetryConfig;
}
```

### 2. Batch Operation Executor
```typescript
// In /src/api/attio-operations.ts
export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 10,
  continueOnError: true,
  retryConfig: DEFAULT_RETRY_CONFIG
};

export async function executeBatchOperations<T, R>(
  operations: BatchRequestItem<T, R>[],
  apiCall: (params: T) => Promise<R>,
  config: Partial<BatchConfig> = {}
): Promise<BatchResponse<R>> {
  // Implementation with chunk processing, error handling, and retries
}

export async function batchSearchObjects<T extends AttioRecord>(
  objectType: ResourceType,
  queries: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<T[]>> {
  // Implementation for search operations
}

export async function batchGetObjectDetails<T extends AttioRecord>(
  objectType: ResourceType,
  ids: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<T>> {
  // Implementation for get operations
}
```

### 3. Resource-Specific Operations
```typescript
// In /src/objects/people.ts
export async function batchSearchPeople(
  queries: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Person[]>> {
  return batchSearchObjects<Person>(ResourceType.PEOPLE, queries, batchConfig);
}

export async function batchGetPeopleDetails(
  personIds: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Person>> {
  return batchGetObjectDetails<Person>(ResourceType.PEOPLE, personIds, batchConfig);
}

// Similar implementations for companies and lists
```

### 4. Testing Considerations
- Mock API responses for batch operations
- Test successful batch operations
- Test partial failures with mixed results
- Test configuration options including batch size limits
- Test retry behavior for transient errors

### 5. Challenges and Mitigations
- API Rate Limits: Implement configurable delays between batches
- Response Format Consistency: Normalize API responses in the executor
- Error Context: Maintain operation context throughout the batch process
