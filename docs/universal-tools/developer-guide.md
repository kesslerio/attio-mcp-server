# Universal Tools Developer Guide

Learn how to extend, customize, and contribute to the universal tools system. This guide covers architecture, implementation patterns, and best practices for developers working with the universal tool consolidation.

## Architecture Overview

### System Design

The universal tools system uses parameter-based routing to consolidate 40+ resource-specific tools into 13 universal operations:

```typescript
// Core architecture components
src/handlers/tool-configs/universal/
├── index.ts              // Main module exports and mappings
├── types.ts              // TypeScript type definitions
├── schemas.ts            // MCP-compliant JSON schemas
├── core/
│   ├── search-operations.ts        // Universal search tools
│   ├── record-details-operations.ts // Record detail retrieval
│   ├── crud-operations.ts          // Create/update/delete operations
│   ├── metadata-operations.ts      // Attribute discovery
│   ├── detailed-info-operations.ts // Detailed info formatting
│   ├── notes-operations.ts         // Note creation/listing
│   └── index.ts                    // Core tool aggregator exports
├── advanced-operations.ts // 5 advanced search/batch operations
└── shared-handlers.ts    // Common handler utilities
```

### Key Design Principles

1. **Parameter-Based Routing**: Use `resource_type` to route to appropriate handlers
2. **Schema Compliance**: Follow MCP protocol requirements (no oneOf/allOf at top level)
3. **Error Isolation**: Individual operation failures don't affect others
4. **Performance Optimization**: Built-in rate limiting and batch processing
5. **Type Safety**: Comprehensive TypeScript typing throughout

### Tool Configuration Pattern

Each universal tool follows this structure:

```typescript
export const toolConfig: UniversalToolConfig = {
  name: 'tool-name',
  handler: async (params: ToolParams): Promise<Result> => {
    // 1. Validate parameters
    validateUniversalToolParams('tool-name', params);

    // 2. Route to resource-specific handler
    return await handleUniversalOperation(params);
  },
  formatResult: (
    result: Result,
    resourceType?: UniversalResourceType
  ): string => {
    // ✅ NEW ARCHITECTURE (PR #483): Always returns string
    // - No environment-dependent behavior
    // - 89.7% performance improvement
    // - Type-safe Record<string, unknown> patterns
    return formatResult(result, resourceType);
  },
};
```

### formatResult Architecture Update (PR #483)

**CRITICAL CHANGE**: All formatResult functions now use consistent `: string` return types:

```typescript
// ✅ CORRECT: Consistent string return type
formatResult: (
  data: AttioRecord | AttioRecord[],
  resourceType?: UniversalResourceType
): string => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return `No ${resourceType || 'records'} found`;
  }

  const records = Array.isArray(data) ? data : [data];
  return records
    .map((record, index) => {
      const name = record.values?.name?.[0]?.value || 'Unknown';
      const id = record.id?.record_id || 'Unknown ID';
      return `${index + 1}. ${name} (ID: ${id})`;
    })
    .join('\n');
};

// ❌ ELIMINATED: Dual-mode anti-pattern
formatResult: (data: any): string | object => {
  if (process.env.NODE_ENV === 'test') return data; // REMOVED
  return formatString(data);
};
```

**Benefits Achieved**:

- **Performance**: 89.7% speed improvement
- **Memory**: 227KB reduction through optimized string templates
- **Type Safety**: 59% ESLint warning reduction (957→395)
- **Quality**: 97.15/100 production readiness score

## Adding New Resource Types

### Step 1: Extend UniversalResourceType Enum

```typescript
// src/handlers/tool-configs/universal/types.ts
export enum UniversalResourceType {
  COMPANIES = 'companies',
  PEOPLE = 'people',
  RECORDS = 'records',
  TASKS = 'tasks',
  PROJECTS = 'projects', // New resource type
  DEALS = 'deals', // New resource type
}
```

### Step 2: Update Resource Type Mappings

```typescript
// src/handlers/tool-configs/universal/index.ts
export const resourceTypeMappings: Record<string, string> = {
  // Existing mappings...

  // New resource type mappings
  'create-project': 'projects',
  'search-projects': 'projects',
  'get-project-details': 'projects',
  'create-deal': 'deals',
  'search-deals': 'deals',
};
```

### Step 3: Implement Resource Handlers

```typescript
// src/handlers/tool-configs/universal/shared-handlers.ts
export async function handleUniversalSearch(
  params: UniversalSearchParams
): Promise<AttioRecord[]> {
  const { resource_type, query, filters, limit, offset } = params;

  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      return await searchCompanies(query, filters, limit, offset);

    case UniversalResourceType.PEOPLE:
      return await searchPeople(query, filters, limit, offset);

    case UniversalResourceType.PROJECTS: // New handler
      return await searchProjects(query, filters, limit, offset);

    case UniversalResourceType.DEALS: // New handler
      return await searchDeals(query, filters, limit, offset);

    default:
      throw new Error(`Unsupported resource type: ${resource_type}`);
  }
}
```

### Step 4: Create Resource-Specific Operations

```typescript
// src/objects/projects/operations.ts
export async function searchProjects(
  query?: string,
  filters?: any,
  limit?: number,
  offset?: number
): Promise<AttioRecord[]> {
  const projectList = await getListByType('projects');

  return await searchListEntries({
    list: projectList,
    query,
    filters,
    limit: limit || 10,
    offset: offset || 0,
  });
}

export async function createProject(projectData: any): Promise<AttioRecord> {
  const projectList = await getListByType('projects');

  return await createListEntry({
    list: projectList,
    data: projectData,
  });
}

export async function getProjectDetails(
  recordId: string
): Promise<AttioRecord> {
  const projectList = await getListByType('projects');

  return await getListEntry({
    list: projectList,
    record_id: recordId,
  });
}
```

### Step 5: Update Schema Validation

```typescript
// src/handlers/tool-configs/universal/schemas.ts
const resourceTypeProperty = {
  type: 'string' as const,
  enum: Object.values(UniversalResourceType), // Automatically includes new types
  description:
    'Type of resource to operate on (companies, people, records, tasks, projects, deals)',
};
```

### Step 6: Add Format Support

```typescript
// src/handlers/tool-configs/universal/shared-handlers.ts
export function formatResourceType(
  resourceType: UniversalResourceType
): string {
  switch (resourceType) {
    case UniversalResourceType.COMPANIES:
      return 'company';
    case UniversalResourceType.PEOPLE:
      return 'person';
    case UniversalResourceType.RECORDS:
      return 'record';
    case UniversalResourceType.TASKS:
      return 'task';
    case UniversalResourceType.PROJECTS:
      return 'project'; // New
    case UniversalResourceType.DEALS:
      return 'deal'; // New
    default:
      return 'record';
  }
}
```

## Extending Universal Operations

### Adding New Operation Types

Example: Adding a `duplicate-record` operation to core tools:

#### Step 1: Define Operation Schema

```typescript
// src/handlers/tool-configs/universal/schemas.ts
export const duplicateRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    source_record_id: {
      type: 'string' as const,
      description: 'ID of record to duplicate',
    },
    modifications: {
      type: 'object' as const,
      description: 'Fields to modify in the duplicate',
      additionalProperties: true,
    },
  },
  required: ['resource_type' as const, 'source_record_id' as const],
  additionalProperties: false,
};
```

#### Step 2: Create Handler Function

```typescript
// src/handlers/tool-configs/universal/shared-handlers.ts
export async function handleUniversalDuplicate(params: {
  resource_type: UniversalResourceType;
  source_record_id: string;
  modifications?: Record<string, any>;
}): Promise<AttioRecord> {
  const { resource_type, source_record_id, modifications = {} } = params;

  // Get original record
  const original = await handleUniversalGetDetails({
    resource_type,
    record_id: source_record_id,
  });

  // Create duplicate with modifications
  const duplicateData = {
    ...original.values,
    ...modifications,
    // Remove ID and system fields
    id: undefined,
    created_at: undefined,
    updated_at: undefined,
  };

  return await handleUniversalCreate({
    resource_type,
    record_data: duplicateData,
  });
}
```

#### Step 3: Create Tool Configuration

```typescript
// src/handlers/tool-configs/universal/core/crud-operations.ts
export const duplicateRecordConfig: UniversalToolConfig = {
  name: 'duplicate-record',
  handler: async (params: any): Promise<AttioRecord> => {
    try {
      validateUniversalToolParams('duplicate-record', params);
      return await handleUniversalDuplicate(params);
    } catch (error) {
      throw createUniversalError('duplicate', params.resource_type, error);
    }
  },
  formatResult: (record: AttioRecord, resourceType?: UniversalResourceType) => {
    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';
    const name = record.values?.name?.[0]?.value || 'Unnamed';
    const id = record.id?.record_id || 'unknown';

    return `✅ Successfully duplicated ${resourceTypeName}: ${name} (ID: ${id})`;
  },
};
```

#### Step 4: Register Tool

```typescript
// src/handlers/tool-configs/universal/core/index.ts
export const coreOperationsToolConfigs = {
  'search-records': searchRecordsConfig,
  'get-record-details': getRecordDetailsConfig,
  'create-record': createRecordConfig,
  'update-record': updateRecordConfig,
  'delete-record': deleteRecordConfig,
  'duplicate-record': duplicateRecordConfig, // New tool
  'get-attributes': getAttributesConfig,
  'discover-attributes': discoverAttributesConfig,
  'get-detailed-info': getDetailedInfoConfig,
};

export const coreOperationsToolDefinitions = {
  // ... existing definitions
  'duplicate-record': {
    name: 'duplicate-record',
    description: 'Duplicate a record with optional modifications',
    inputSchema: duplicateRecordSchema,
  },
};
```

## Advanced Operation Patterns

### Complex Search Operations

Example: Multi-resource search across different types:

````typescript
// src/handlers/tool-configs/universal/advanced-operations.ts
export const crossResourceSearchConfig: UniversalToolConfig = {
  name: 'cross-resource-search',
  handler: async (params: {
    query: string;
    resource_types: UniversalResourceType[];
    limit?: number;
  }): Promise<{ resource_type: string; results: AttioRecord[] }[]> => {
    const { query, resource_types, limit = 10 } = params;

    const searchPromises = resource_types.map(async (resource_type) => {
      try {
        const results = await handleUniversalSearch({
          resource_type,
          query,
          limit,
        });
        return { resource_type, results };
      } catch (error) {
        console.warn(`Search failed for ${resource_type}:`, error);
        return { resource_type, results: [] };
      }
    });

    return await Promise.all(searchPromises);
  },
  formatResult: (searchResults: any[]) => {
    const totalResults = searchResults.reduce(
      (sum, r) => sum + r.results.length,
      0
    );

    let output = `Cross-resource search found ${totalResults} total results:\n\n`;

    for (const { resource_type, results } of searchResults) {
      if (results.length > 0) {
        output += `${formatResourceType(resource_type)}s (${results.length}):\n`;
        results.forEach((record: any, index: number) => {
          const name = record.values?.name?.[0]?.value || 'Unnamed';
          output += `  ${index + 1}. ${name}\n`;
        });
        output += '\n';
      }
    }

    return output;
  },
};

## Development Tooling

### TypeScript Path Aliases

To keep imports readable the project defines shared TypeScript path aliases in `tsconfig.json` and `test/tsconfig.json`. They are also surfaced to Vitest through `configs/vitest/aliases.ts` and to ESLint via `eslint.config.js`. The most commonly used aliases are:

- `@src/*` → `src/*`
- `@api/*` → `src/api/*`
- `@config/*` → `src/config/*`
- `@constants/*` → `src/constants/*`
- `@handlers/*` → `src/handlers/*`
- `@services/*` → `src/services/*`
- `@errors/*` → `src/errors/*`
- `@shared-types/*` → `src/types/*`
- `@utils/*` → `src/utils/*`
- `@test-support/*` → `src/test-support/*`
- `@test/*` → `test/*`

When adding new modules prefer these aliases over deep relative paths. If you introduce a new top-level folder, update the alias definitions in:

- `tsconfig.json`
- `test/tsconfig.json`
- `configs/vitest/aliases.ts`
- `eslint.config.js`

and run `npx tsc --noEmit` to confirm TypeScript resolves the new paths.

### Batch Operation Extensions

Example: Adding conditional batch operations:

```typescript
export const conditionalBatchConfig: UniversalToolConfig = {
  name: 'conditional-batch-operations',
  handler: async (params: {
    resource_type: UniversalResourceType;
    operation_type: BatchOperationType;
    conditions: any[];
    actions: any[];
  }): Promise<any[]> => {
    const { resource_type, operation_type, conditions, actions } = params;

    // Find records matching conditions
    const candidates = await handleUniversalSearch({
      resource_type,
      filters: { and: conditions },
      limit: 50,
    });

    // Apply actions to matching records
    const results = await processInParallelWithErrorIsolation(
      candidates,
      async (record) => {
        switch (operation_type) {
          case BatchOperationType.UPDATE:
            return await handleUniversalUpdate({
              resource_type,
              record_id: record.id.record_id,
              record_data: actions[0], // First action for updates
            });
          case BatchOperationType.DELETE:
            return await handleUniversalDelete({
              resource_type,
              record_id: record.id.record_id,
            });
          default:
            throw new Error(
              `Unsupported conditional operation: ${operation_type}`
            );
        }
      }
    );

    return results;
  },
  formatResult: (results: any[]) => {
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return `Conditional batch operation completed:\n✅ ${successful} successful\n❌ ${failed} failed`;
  },
};
````

## Testing Strategies

### Unit Testing Universal Tools

```typescript
// test/universal-tools/search-records.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchRecordsConfig } from '../../src/handlers/tool-configs/universal/core/index.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';

describe('search-records universal tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should search companies successfully', async () => {
    const params = {
      resource_type: UniversalResourceType.COMPANIES,
      query: 'tech startup',
      limit: 10,
    };

    const mockResults = [
      {
        id: { record_id: 'comp_1' },
        values: { name: [{ value: 'TechCorp' }] },
      },
    ];

    // Mock the handler
    vi.spyOn(searchRecordsConfig, 'handler').mockResolvedValue(mockResults);

    const result = await searchRecordsConfig.handler(params);
    expect(result).toEqual(mockResults);
  });

  it('should validate required parameters', async () => {
    const invalidParams = {
      query: 'tech startup',
      // Missing resource_type
    };

    await expect(searchRecordsConfig.handler(invalidParams)).rejects.toThrow(
      'Missing required parameter: resource_type'
    );
  });

  it('should format results correctly', () => {
    const mockResults = [
      {
        id: { record_id: 'comp_1' },
        values: {
          name: [{ value: 'TechCorp' }],
          website: [{ value: 'https://techcorp.com' }],
        },
      },
    ];

    const formatted = searchRecordsConfig.formatResult(
      mockResults,
      UniversalResourceType.COMPANIES
    );
    expect(formatted).toContain('Found 1 company:');
    expect(formatted).toContain('TechCorp (https://techcorp.com)');
  });
});
```

### Integration Testing

```typescript
// test/integration/universal-tools.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { universalToolConfigs } from '../../src/handlers/tool-configs/universal/index.js';

describe('Universal Tools Integration', () => {
  beforeAll(async () => {
    // Setup test environment
    process.env.ATTIO_API_KEY = 'test-key';
  });

  it('should handle complete CRUD workflow', async () => {
    // Create
    const createResult = await universalToolConfigs['create-record'].handler({
      resource_type: 'companies',
      record_data: {
        name: 'Test Company',
        website: 'https://test.com',
      },
    });

    expect(createResult.id).toBeDefined();
    const recordId = createResult.id.record_id;

    // Read
    const getResult = await universalToolConfigs['get-record-details'].handler({
      resource_type: 'companies',
      record_id: recordId,
    });

    expect(getResult.values.name[0].value).toBe('Test Company');

    // Update
    const updateResult = await universalToolConfigs['update-record'].handler({
      resource_type: 'companies',
      record_id: recordId,
      record_data: {
        industry: 'Technology',
      },
    });

    expect(updateResult.values.industry[0].value).toBe('Technology');

    // Delete
    const deleteResult = await universalToolConfigs['delete-record'].handler({
      resource_type: 'companies',
      record_id: recordId,
    });

    expect(deleteResult.success).toBe(true);
  });
});
```

### Mock Patterns for Testing

```typescript
// test/mocks/universal-handlers.ts
import { vi } from 'vitest';

export const mockUniversalHandlers = {
  handleUniversalSearch: vi.fn(),
  handleUniversalGetDetails: vi.fn(),
  handleUniversalCreate: vi.fn(),
  handleUniversalUpdate: vi.fn(),
  handleUniversalDelete: vi.fn(),
};

// Use importOriginal pattern for proper mocking
vi.mock(
  '../../src/handlers/tool-configs/universal/shared-handlers.js',
  async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      ...mockUniversalHandlers,
    };
  }
);
```

## Performance Optimization

### Caching Strategies

```typescript
// src/handlers/tool-configs/universal/cache.ts
class UniversalToolCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  generateKey(operation: string, params: any): string {
    return `${operation}:${JSON.stringify(params)}`;
  }
}

export const universalCache = new UniversalToolCache();

// Usage in handlers
export async function handleUniversalGetDetails(
  params: UniversalRecordDetailsParams
): Promise<AttioRecord> {
  const cacheKey = universalCache.generateKey('get-details', params);
  const cached = universalCache.get(cacheKey);

  if (cached) return cached;

  const result = await getRecordDetails(params);
  universalCache.set(cacheKey, result);

  return result;
}
```

### Rate Limiting Implementation

```typescript
// src/handlers/tool-configs/universal/rate-limiter.ts
class RateLimiter {
  private requests = new Map<string, number[]>();
  private windowMs = 60 * 1000; // 1 minute window
  private maxRequests = 100; // Max requests per window

  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const requestTimes = this.requests.get(identifier) || [];
    const recentRequests = requestTimes.filter((time) => time > windowStart);

    if (recentRequests.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }

    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    return true;
  }

  async waitForSlot(identifier: string): Promise<void> {
    while (!(await this.checkLimit(identifier))) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export const rateLimiter = new RateLimiter();
```

## Error Handling Patterns

### Comprehensive Error Types

```typescript
// src/handlers/tool-configs/universal/errors.ts
export class UniversalToolError extends Error {
  constructor(
    public operation: string,
    public resourceType: string,
    public originalError: Error,
    public code: string = 'UNIVERSAL_TOOL_ERROR'
  ) {
    super(
      `Universal ${operation} failed for ${resourceType}: ${originalError.message}`
    );
    this.name = 'UniversalToolError';
  }
}

export class ValidationError extends UniversalToolError {
  constructor(operation: string, resourceType: string, message: string) {
    super(operation, resourceType, new Error(message), 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ResourceNotFoundError extends UniversalToolError {
  constructor(operation: string, resourceType: string, resourceId: string) {
    super(
      operation,
      resourceType,
      new Error(`Resource not found: ${resourceId}`),
      'RESOURCE_NOT_FOUND'
    );
    this.name = 'ResourceNotFoundError';
  }
}
```

### Error Recovery Strategies

```typescript
// src/handlers/tool-configs/universal/error-recovery.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) break;

      // Exponential backoff
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage
export async function handleUniversalCreate(
  params: UniversalCreateParams
): Promise<AttioRecord> {
  return await withRetry(
    async () => {
      // Actual creation logic
      return await createRecord(params);
    },
    3,
    500
  );
}
```

## Contribution Guidelines

### Code Style

1. **TypeScript**: Use strict typing throughout
2. **Naming**: Follow existing patterns (`handleUniversal*`, `*Config`, `*Schema`)
3. **Documentation**: Include JSDoc comments for public APIs
4. **Error Handling**: Use comprehensive error types and messages

### Testing Requirements

1. **Unit Tests**: Test each handler function independently
2. **Integration Tests**: Test complete workflows
3. **Error Cases**: Test all error conditions
4. **Performance**: Include performance benchmarks for new features

### Pull Request Process

1. **Feature Branch**: Create from `main` branch
2. **Tests**: Ensure all tests pass
3. **Documentation**: Update relevant documentation
4. **Backwards Compatibility**: Maintain compatibility with existing tools

## Migration Utilities

### Tool Mapping Utilities

```typescript
// src/handlers/tool-configs/universal/migration-utils.ts
export function getDeprecatedToolMappings(): Record<string, string> {
  return deprecatedToolMappings;
}

export function getMigrationPath(deprecatedTool: string): {
  universalTool: string;
  resourceType: string;
  additionalParams: Record<string, any>;
} | null {
  const universalTool = deprecatedToolMappings[deprecatedTool];
  const resourceType = resourceTypeMappings[deprecatedTool];

  if (!universalTool || !resourceType) return null;

  const additionalParams: Record<string, any> = {};

  // Add specific parameters based on tool type
  const infoType = infoTypeMappings[deprecatedTool];
  if (infoType) additionalParams.info_type = infoType;

  const contentType = contentTypeMappings[deprecatedTool];
  if (contentType) additionalParams.content_type = contentType;

  const timeframeType = timeframeTypeMappings[deprecatedTool];
  if (timeframeType) additionalParams.timeframe_type = timeframeType;

  return {
    universalTool,
    resourceType,
    additionalParams,
  };
}
```

## Next Steps

- **Start building?** → See practical examples in [User Guide](user-guide.md)
- **Need API reference?** → Check [API Reference](api-reference.md)
- **Migrating existing code?** → Review [Migration Guide](migration-guide.md)
- **Having issues?** → Visit [Troubleshooting](troubleshooting.md)
