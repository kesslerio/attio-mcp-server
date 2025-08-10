# Concrete Tool Consolidation Examples

This document provides detailed examples of how tool consolidation would work in practice, with actual schema designs and implementation patterns.

## Example 1: People Search Consolidation (Phase 1)

### Current State (10 tools)
- `search-people` - Basic people search
- `advanced-search-people` - Advanced filtering
- `search-people-by-email` - Email-specific search
- `search-people-by-phone` - Phone-specific search
- `search-people-by-activity` - Activity-based search
- `search-people-by-notes` - Notes-based search
- `search-people-by-creation-date` - Date range search
- `search-people-by-modification-date` - Modified date search
- `search-people-by-last-interaction` - Interaction date search
- `search-people-by-company` - Company relationship search

### Proposed State (3 tools)

#### 1. Enhanced `search-people` Tool
```typescript
{
  name: 'search-people',
  description: 'Search people with basic and field-specific filters',
  inputSchema: {
    type: 'object',
    properties: {
      // Basic search
      query: { type: 'string', description: 'General search query' },
      
      // Field-specific searches (consolidates 4 tools)
      email: { type: 'string', description: 'Search by email address' },
      phone: { type: 'string', description: 'Search by phone number' },
      
      // Pagination
      limit: { type: 'number', default: 10, maximum: 100 },
      offset: { type: 'number', default: 0 }
    }
  }
}
```

#### 2. Enhanced `advanced-search-people` Tool
```typescript
{
  name: 'advanced-search-people',
  description: 'Advanced people search with temporal and content filters',
  inputSchema: {
    type: 'object',
    properties: {
      // Basic search
      query: { type: 'string', description: 'General search query' },
      
      // Temporal filters (consolidates 3 tools)
      date_filter: {
        type: 'object',
        properties: {
          type: { 
            type: 'string', 
            enum: ['created', 'modified', 'last_interaction'],
            description: 'Type of date to filter by'
          },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' }
        }
      },
      
      // Content filters
      activity_type: { type: 'string', description: 'Filter by activity type' },
      notes_content: { type: 'string', description: 'Search within notes content' },
      
      // Advanced filtering
      filters: { 
        type: 'array',
        items: { type: 'object' },
        description: 'Complex filter conditions'
      },
      
      // Pagination
      limit: { type: 'number', default: 10, maximum: 100 },
      offset: { type: 'number', default: 0 }
    }
  }
}
```

#### 3. Specialized `search-people-by-company` Tool
```typescript
{
  name: 'search-people-by-company',
  description: 'Search people by company relationships (specialized)',
  inputSchema: {
    type: 'object',
    properties: {
      company_id: { type: 'string', description: 'Company ID to search by' },
      company_name: { type: 'string', description: 'Company name to search by' },
      relationship_type: { 
        type: 'string', 
        enum: ['employee', 'contact', 'decision_maker'],
        description: 'Type of relationship to company'
      },
      include_former: { 
        type: 'boolean', 
        default: false, 
        description: 'Include former employees/contacts'
      },
      limit: { type: 'number', default: 10, maximum: 100 },
      offset: { type: 'number', default: 0 }
    },
    required: ['company_id']
  }
}
```

### Migration Strategy
1. **Phase 1**: Add new parameters to existing tools (backward compatible)
2. **Phase 2**: Mark old tools as deprecated with migration warnings
3. **Phase 3**: Remove deprecated tools after transition period

## Example 2: Company Attribute Consolidation (Phase 1)

### Current State (8 tools)
- `get-company-attributes` - General attributes
- `get-company-basic-info` - Basic company info
- `get-company-business-info` - Business-specific fields
- `get-company-contact-info` - Contact information
- `get-company-social-info` - Social media links
- `get-company-fields` - Custom fields
- `discover-company-attributes` - Schema discovery
- `update-company-attribute` - Attribute updates

### Proposed State (4 tools)

#### 1. Enhanced `get-company-attributes` Tool
```typescript
{
  name: 'get-company-attributes',
  description: 'Get company attributes with field category filtering',
  inputSchema: {
    type: 'object',
    properties: {
      company_id: { type: 'string', description: 'Company ID' },
      
      // Field category filters (consolidates 4 tools)
      categories: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['basic', 'business', 'contact', 'social', 'custom']
        },
        description: 'Categories of fields to retrieve'
      },
      
      // Specific field selection
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific field names to retrieve'
      },
      
      // Response format
      format: {
        type: 'string',
        enum: ['full', 'values_only', 'metadata'],
        default: 'full',
        description: 'Response format'
      }
    },
    required: ['company_id']
  }
}
```

#### 2. Keep `get-company-basic-info` (Optimized)
- Keep for most common use case (performance optimization)
- Focus on essential fields only

#### 3. Keep `discover-company-attributes` (Specialized)
- Keep for schema discovery and API exploration
- Essential for dynamic field detection

#### 4. Keep `update-company-attribute` (Specialized)
- Keep for attribute modifications
- Different operation pattern (write vs read)

## Example 3: CRUD Consolidation (Phase 2)

### Current State - Company CRUD (4 tools)
- `create-company` - Create new company
- `update-company` - Update existing company
- `delete-company` - Delete company
- `get-company-details` - Get company details

### Proposed State (2 tools)

#### 1. Unified `manage-company` Tool
```typescript
{
  name: 'manage-company',
  description: 'Unified company management (create/update/delete operations)',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['create', 'update', 'delete'],
        description: 'Operation to perform'
      },
      
      // Required for update/delete operations
      company_id: { 
        type: 'string', 
        description: 'Company ID (required for update/delete)' 
      },
      
      // Required for create/update operations
      company_data: {
        type: 'object',
        description: 'Company data (required for create/update)',
        properties: {
          name: { type: 'string' },
          domain: { type: 'string' },
          // ... other company fields
        }
      },
      
      // Options
      return_details: {
        type: 'boolean',
        default: true,
        description: 'Return full company details after operation'
      }
    },
    required: ['operation']
  }
}
```

#### 2. Specialized `get-company-details` Tool (Kept)
- Keep for complex queries and performance
- Different operation pattern (read-only with complex filtering)

### Runtime Validation Example
```typescript
function validateManageCompanyArgs(args) {
  const { operation, company_id, company_data } = args;
  
  // Operation-specific validation
  switch (operation) {
    case 'create':
      if (!company_data || !company_data.name) {
        throw new Error('company_data with name is required for create operation');
      }
      break;
      
    case 'update':
      if (!company_id) {
        throw new Error('company_id is required for update operation');
      }
      if (!company_data) {
        throw new Error('company_data is required for update operation');
      }
      break;
      
    case 'delete':
      if (!company_id) {
        throw new Error('company_id is required for delete operation');
      }
      break;
  }
}
```

## MCP Schema Compliance Guidelines

### ✅ Allowed Patterns
```typescript
// Use enum for operation discrimination
operation: {
  type: 'string',
  enum: ['create', 'update', 'delete']
}

// Use conditional descriptions
company_id: {
  type: 'string',
  description: 'Company ID (required for update/delete operations)'
}
```

### ❌ Prohibited Patterns
```typescript
// DON'T use oneOf/allOf/anyOf at top level
{
  oneOf: [
    { properties: { operation: { const: 'create' } } },
    { properties: { operation: { const: 'update' } } }
  ]
}
```

## Performance Considerations

### Benefits of Consolidation
1. **Reduced Context Window**: 71→45 tools (37% reduction)
2. **Faster Tool Selection**: Fewer options for AI to evaluate
3. **Improved Caching**: Fewer tool schemas to validate

### Potential Risks
1. **Parameter Complexity**: More validation logic needed
2. **Schema Size**: Larger, more complex schemas
3. **Error Surface**: More complex validation = more failure points

### Mitigation Strategies
1. **Runtime Validation**: Comprehensive parameter checking
2. **Clear Error Messages**: Operation-specific error descriptions
3. **Performance Testing**: Benchmark tool selection times
4. **Gradual Rollout**: Phased implementation with monitoring

## Testing Strategy

### Unit Tests
- Schema validation for all operation combinations
- Runtime parameter validation
- Error handling for invalid operations

### Integration Tests
- End-to-end tool execution for all operations
- Backward compatibility verification
- Performance benchmarking

### Migration Tests
- Verify deprecated tools still work during transition
- Test tool alias functionality
- Validate data consistency across old/new tools