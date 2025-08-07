# Security Limits and DoS Protection

This document describes the security limits implemented to prevent denial-of-service (DoS) attacks through batch operations and large request payloads.

## Overview

The Attio MCP Server implements comprehensive request size validation to prevent:
- Memory exhaustion from large batch operations
- API rate limit violations
- Payload bombs and other DoS attack vectors
- System overload from concurrent requests

## Batch Size Limits

Batch operations are limited to prevent overwhelming the system:

| Resource Type | Default Limit | Environment Variable |
|--------------|---------------|---------------------|
| Default | 100 items | `MAX_BATCH_SIZE` |
| Companies | 100 items | `MAX_BATCH_SIZE_COMPANIES` |
| People | 100 items | `MAX_BATCH_SIZE_PEOPLE` |
| Records | 100 items | `MAX_BATCH_SIZE_RECORDS` |
| Tasks | 50 items | `MAX_BATCH_SIZE_TASKS` |
| Notes | 50 items | `MAX_BATCH_SIZE_NOTES` |
| Lists | 100 items | `MAX_BATCH_SIZE_LISTS` |
| Search Operations | 50 queries | `MAX_BATCH_SIZE_SEARCH` |
| Delete Operations | 50 items | `MAX_BATCH_SIZE_DELETE` |

### Special Operation Limits

- **Delete operations**: Limited to 50 items for safety
- **Search operations**: Limited to 50 queries to prevent excessive API calls
- **Universal batch operations**: Use resource-specific limits

## Payload Size Limits

Payload sizes are restricted to prevent memory issues:

| Limit Type | Default | Environment Variable | Description |
|-----------|---------|---------------------|-------------|
| Single Record | 1 MB | `MAX_RECORD_SIZE` | Maximum size for a single record's data |
| Batch Total | 10 MB | `MAX_BATCH_PAYLOAD` | Maximum total payload for batch operations |
| Search Query | 1 KB | `MAX_SEARCH_QUERY_SIZE` | Maximum length for search query strings |
| Filter Object | 10 KB | `MAX_FILTER_SIZE` | Maximum size for filter objects |

## Rate Limiting

Rate limits help prevent API abuse:

| Setting | Default | Environment Variable | Description |
|---------|---------|---------------------|-------------|
| Concurrent Requests | 5 | `MAX_CONCURRENT_BATCH_REQUESTS` | Maximum parallel batch requests |
| Batch Delay | 100ms | `BATCH_DELAY_MS` | Delay between batch chunks |
| Requests per Minute | 60 | `MAX_BATCH_RPM` | Maximum batch requests per minute |

## Configuration

### Environment Variables

Add these to your `.env` file to customize limits:

```bash
# Batch Size Limits
MAX_BATCH_SIZE=100
MAX_BATCH_SIZE_COMPANIES=100
MAX_BATCH_SIZE_PEOPLE=100
MAX_BATCH_SIZE_RECORDS=100
MAX_BATCH_SIZE_TASKS=50
MAX_BATCH_SIZE_NOTES=50
MAX_BATCH_SIZE_LISTS=100
MAX_BATCH_SIZE_SEARCH=50
MAX_BATCH_SIZE_DELETE=50

# Payload Size Limits (in bytes)
MAX_RECORD_SIZE=1048576      # 1MB
MAX_BATCH_PAYLOAD=10485760   # 10MB
MAX_SEARCH_QUERY_SIZE=1024   # 1KB
MAX_FILTER_SIZE=10240         # 10KB

# Rate Limiting
MAX_CONCURRENT_BATCH_REQUESTS=5
BATCH_DELAY_MS=100
MAX_BATCH_RPM=60
```

### Validation Behavior

When a request exceeds limits:

1. **Batch Size Exceeded**: Returns an error with the actual and maximum allowed sizes
2. **Payload Too Large**: Returns an error with human-readable size information
3. **Rate Limit Hit**: Returns an error suggesting to slow down or use smaller batches

### Error Messages

Error messages are designed to be helpful without exposing internal implementation details:

```javascript
// Example: Batch size exceeded
"Batch create size (150) exceeds maximum allowed (100) for companies. Please split into smaller batches for security and performance."

// Example: Payload too large
"Request payload size (15.2 MB) exceeds maximum allowed (10.0 MB). Please reduce the amount of data in your request."

// Example: Search query too long
"Search query length (2048 characters) exceeds maximum allowed (1024 characters). Please use a shorter search query."
```

## Implementation Details

### Validation Flow

1. **Size Validation**: Check number of items in batch
2. **Payload Validation**: Calculate and check total payload size
3. **Individual Record Validation**: Check each record's size (for create/update)
4. **Rate Limiting**: Apply delays between chunks
5. **Concurrent Processing**: Limit parallel requests

### Files Involved

- `/src/config/security-limits.ts`: Configuration and limits
- `/src/utils/batch-validation.ts`: Validation utilities
- `/src/api/operations/batch.ts`: Batch operation handlers
- `/src/handlers/tool-configs/universal/advanced-operations.ts`: Universal batch operations

### Automatic Chunking

For operations that support it, large batches can be automatically split:

```typescript
import { splitBatchIntoChunks } from './utils/batch-validation.js';

const chunks = splitBatchIntoChunks(largeArray, 'companies');
// Process each chunk separately
```

## Security Considerations

### DoS Attack Prevention

The limits prevent several types of DoS attacks:

1. **Memory Exhaustion**: Large payloads can't exceed memory limits
2. **CPU Exhaustion**: Batch sizes prevent excessive processing
3. **API Rate Limiting**: Prevents overwhelming the Attio API
4. **Payload Bombs**: Nested objects are measured by total size
5. **Regex DoS**: Query length limits prevent complex pattern attacks

### Best Practices

1. **Set Conservative Defaults**: Start with lower limits and increase as needed
2. **Monitor Usage**: Track batch operation metrics
3. **Adjust Per Environment**: Production may need different limits than development
4. **Document Limits**: Ensure API users know the limits
5. **Graceful Degradation**: Provide helpful error messages

## Testing

The validation system includes comprehensive tests:

```bash
# Run validation tests
npm test test/utils/batch-validation.test.ts
```

Tests cover:
- Normal operation validation
- Edge cases and boundary conditions
- DoS attack scenarios
- Error message formatting
- Chunking utilities

## Migration Guide

For existing implementations:

1. **Update Batch Operations**: Add validation before processing
2. **Set Environment Variables**: Configure appropriate limits
3. **Test with Production Data**: Ensure limits work for your use case
4. **Monitor and Adjust**: Fine-tune based on actual usage

## Troubleshooting

### Common Issues

1. **"Batch size exceeds maximum"**
   - Split your batch into smaller chunks
   - Increase the limit via environment variables (if safe)

2. **"Payload size exceeds maximum"**
   - Reduce the amount of data per record
   - Process records in smaller batches

3. **"Rate limit exceeded"**
   - Add delays between requests
   - Reduce concurrent operations

### Performance Impact

The validation adds minimal overhead:
- Size checks: O(1) operation
- Payload calculation: O(n) where n is object properties
- Chunking: O(n) array operations

For most operations, validation takes <1ms.

## Future Enhancements

Potential improvements:

1. **Dynamic Rate Limiting**: Adjust based on API response times
2. **User-Specific Limits**: Different limits per API key
3. **Adaptive Chunking**: Automatically determine optimal chunk sizes
4. **Metrics Collection**: Track validation statistics
5. **Circuit Breaker**: Temporarily disable operations under load