# Structured Logging System Guide

## Overview

The Attio MCP Server now includes an enhanced structured logging system that provides consistent, traceable, and performance-monitored logging across all operations. This system replaces the previous basic logging implementation with a comprehensive solution that supports correlation tracking, performance monitoring, and flexible output formats.

## Key Features

### 1. **Structured Log Format**
All logs now include consistent metadata with timestamps, log levels, module information, and contextual data.

```typescript
{
  message: "Operation successful: search-companies",
  metadata: {
    timestamp: "2024-01-15T10:30:45.123Z",
    level: "INFO",
    module: "tool:search-companies",
    operation: "execute",
    operationType: "tool_execution",
    correlationId: "uuid-correlation-id",
    sessionId: "session-uuid",
    duration: "150ms"
  },
  data: {
    success: true,
    hasContent: true,
    contentLength: 25,
    resultType: "array"
  }
}
```

### 2. **Correlation Tracking**
Each tool execution gets a unique correlation ID that tracks all related log entries, making it easy to trace the complete flow of an operation.

### 3. **Performance Monitoring**
Built-in timing utilities automatically track and log operation durations.

### 4. **Operation Categorization**
Operations are categorized by type for better filtering and analysis:
- `api_call` - External API interactions
- `tool_execution` - MCP tool executions  
- `data_processing` - Data transformation operations
- `validation` - Input validation operations
- `transformation` - Data format transformations
- `system` - Internal system operations

### 5. **Flexible Output Formats**
Supports both human-readable and JSON formats based on environment configuration.

## Usage

### Basic Logging Functions

```typescript
import { debug, info, warn, error, OperationType } from '../utils/logger.js';

// Simple logging
debug('my-module', 'Debug message', { data: 'value' });
info('my-module', 'Info message');
warn('my-module', 'Warning message', { context: 'important' });
error('my-module', 'Error occurred', errorObject, { additionalContext: 'data' });

// With operation type and operation name
debug(
  'my-module', 
  'Processing data', 
  { records: 100 },
  'process-records',
  OperationType.DATA_PROCESSING
);
```

### Context Management

```typescript
import { setLogContext, generateCorrelationId, clearLogContext } from '../utils/logger.js';

// Set context for correlation tracking
setLogContext({
  correlationId: generateCorrelationId(),
  sessionId: 'user-session-123',
  operation: 'bulk-import',
  operationType: OperationType.DATA_PROCESSING
});

// All subsequent logs will include this context
info('import-module', 'Starting bulk import');

// Clear context when done
clearLogContext();
```

### Scoped Loggers

```typescript
import { createScopedLogger, OperationType } from '../utils/logger.js';

// Create a logger with pre-configured context
const logger = createScopedLogger(
  'company-search', 
  'search-operation', 
  OperationType.API_CALL
);

// Use the scoped logger
logger.debug('Starting search', { query: 'tech companies' });
logger.info('Search completed', { results: 50 });
```

### Operation Timing

```typescript
import { operationStart, operationSuccess, operationFailure, OperationType } from '../utils/logger.js';

// Manual timing
const timer = operationStart('api-client', 'fetch-companies', OperationType.API_CALL, { limit: 100 });

try {
  const result = await fetchCompanies();
  const duration = timer.end();
  operationSuccess('api-client', 'fetch-companies', { count: result.length }, OperationType.API_CALL, duration);
} catch (error) {
  const duration = timer.end();
  operationFailure('api-client', 'fetch-companies', error, { attempted: true }, OperationType.API_CALL, duration);
}
```

### Automatic Operation Wrapping

```typescript
import { withLogging, OperationType } from '../utils/logger.js';

// Automatically wrap async operations with logging
const result = await withLogging(
  'data-processor',
  'transform-records',
  OperationType.DATA_PROCESSING,
  async () => {
    return await processRecords(data);
  },
  { inputCount: data.length }
);
```

## Tool Execution Logging

### Enhanced Tool Dispatcher

The tool dispatcher now automatically handles logging for all tool executions:

```typescript
import { 
  initializeToolContext, 
  logToolRequest, 
  logToolSuccess, 
  logToolError 
} from './logging.js';

// Initialize context for tool execution
const correlationId = initializeToolContext(toolName);

// Start timing and log request
const timer = logToolRequest(toolType, toolName, request);

try {
  const result = await executeOperation();
  
  // Log success with timing
  logToolSuccess(toolName, toolType, result, timer);
  return result;
} catch (error) {
  // Log error with timing and context
  logToolError(toolName, toolType, error, timer, additionalContext);
  throw error;
}
```

### Tool-Specific Logging

```typescript
import { createToolLogger } from './logging.js';

const logger = createToolLogger('search-companies', 'search');

logger.debug('Validating search parameters', { query, limit });
logger.info('Executing company search', { filters: appliedFilters });
```

## Configuration

### Environment Variables

- `NODE_ENV` - Controls log level (development = DEBUG, production = INFO)
- `LOG_FORMAT` - Set to `json` for JSON output format
- `DEBUG` - Additional debug output when set

### Log Levels

- `DEBUG` (0) - Detailed debugging information (development only)
- `INFO` (1) - General information about operation flow
- `WARN` (2) - Warning conditions that don't stop execution
- `ERROR` (3) - Error conditions that require attention
- `NONE` (4) - Disable all logging

## Best Practices

### 1. **Use Appropriate Log Levels**
- `DEBUG` for detailed tracing and debugging
- `INFO` for important operational milestones
- `WARN` for recoverable issues
- `ERROR` for failures that require attention

### 2. **Include Contextual Data**
Always include relevant context that helps with debugging:

```typescript
// Good
debug('user-service', 'Validating user input', { 
  userId: user.id, 
  operation: 'update-profile',
  fieldsChanged: ['email', 'name'] 
});

// Poor
debug('user-service', 'Validating input');
```

### 3. **Use Operation Types Consistently**
Classify operations appropriately for better filtering and analysis.

### 4. **Leverage Correlation IDs**
Always set correlation context for operations that span multiple modules:

```typescript
// At the start of a complex operation
const correlationId = generateCorrelationId();
setLogContext({ 
  correlationId,
  operation: 'user-onboarding',
  operationType: OperationType.DATA_PROCESSING 
});
```

### 5. **Use Scoped Loggers for Modules**
Create module-specific loggers to avoid repeating module names:

```typescript
const logger = createScopedLogger('email-service', 'send-notification');
logger.info('Preparing email', { to: recipient.email });
logger.debug('Using template', { templateId: template.id });
```

## Monitoring and Analysis

### Log Correlation
Use correlation IDs to trace related operations across modules:

```bash
# Filter logs by correlation ID
grep "correlation-id-123" application.log

# In JSON format, use jq
cat application.log | jq 'select(.metadata.correlationId == "correlation-id-123")'
```

### Performance Analysis
Track operation durations and identify bottlenecks:

```bash
# Find slow operations
cat application.log | jq 'select(.metadata.duration) | select(.metadata.duration | tonumber > 1000)'
```

### Error Analysis
Group and analyze errors by type and module:

```bash
# Count errors by module
cat application.log | jq 'select(.metadata.level == "ERROR") | .metadata.module' | sort | uniq -c
```

## Migration from Old Logging

### Before (Old System)
```typescript
console.error(`[${toolName}] Tool execution request:`);
console.error(`- Tool type: ${toolType}`);
console.error(`- Arguments:`, JSON.stringify(args));
```

### After (New System)
```typescript
const timer = logToolRequest(toolType, toolName, request);
// ... operation execution ...
logToolSuccess(toolName, toolType, result, timer);
```

The new system automatically includes timing, correlation tracking, and structured metadata while maintaining the same essential information.

## Examples

### Complete Tool Execution Flow
```typescript
export async function executeToolRequest(request: CallToolRequest) {
  const toolName = request.params.name;
  
  // Initialize correlation context
  const correlationId = initializeToolContext(toolName);
  
  try {
    // Find and validate tool configuration
    const toolInfo = findToolConfig(toolName);
    if (!toolInfo) {
      logToolConfigError(toolName, 'Tool configuration not found');
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    const { resourceType, toolConfig, toolType } = toolInfo;
    
    // Start execution timing
    const timer = logToolRequest(toolType, toolName, request);
    
    // Execute operation
    const result = await executeOperation(request, toolConfig, resourceType);
    
    // Log success
    logToolSuccess(toolName, toolType, result, timer);
    return result;
    
  } catch (error) {
    // Log error with full context
    logToolError(toolName, toolType || 'unknown', error, timer!, {
      correlationId,
      hasArguments: !!request.params.arguments
    });
    
    throw error;
  }
}
```

This structured logging system provides comprehensive visibility into the application's behavior while maintaining performance and readability.