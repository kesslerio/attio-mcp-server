# MCP Tool Consolidation Analysis - Issue #352

## Current State Assessment

**Total Tool Count**: 50 exported tools (not 74 as initially estimated)
**Current Architecture**: Modular tool configuration system with clear separation

### Tool Distribution by Category

#### Companies Module (14 tools)
- **Search Operations**: 2 tools
  - `search-companies-toolConfig` / `search-companies-toolDefinition`
  - `domain-based-company-search-toolConfig` / `domain-based-company-search-toolDefinition`
- **CRUD Operations**: 2 tools  
  - `create-company-toolConfig` / `create-company-toolDefinition`
  - `update-company-toolConfig` / `update-company-toolDefinition`
- **Attributes**: 2 tools
  - `discover-company-attributes-toolConfig` / `discover-company-attributes-toolDefinition`
  - `update-company-attribute-toolConfig` / `update-company-attribute-toolDefinition`
- **Notes**: 2 tools
  - `create-company-note-toolConfig` / `create-company-note-toolDefinition`
  - `get-company-notes-toolConfig` / `get-company-notes-toolDefinition`
- **Relationships**: 2 tools
  - `get-company-relationships-toolConfig` / `get-company-relationships-toolDefinition`
  - `create-company-relationship-toolConfig` / `create-company-relationship-toolDefinition`
- **Batch Operations**: 2 tools
  - `batch-update-companies-toolConfig` / `batch-update-companies-toolDefinition`
  - `batch-create-companies-toolConfig` / `batch-create-companies-toolDefinition`
- **Utilities**: 2 tools
  - `get-company-basic-info-toolConfig` / `get-company-basic-info-toolDefinition`
  - `formatCompanyToolDefinition` (formatter only)

#### People Module (14 tools)
- **Search Operations**: 8 tools
  - `search-people-toolConfig` / `search-people-toolDefinition`
  - `advanced-search-people-toolConfig` / `advanced-search-people-toolDefinition` 
  - `search-people-by-activity-toolConfig` / `search-people-by-activity-toolDefinition`
  - `search-people-by-date-range-toolConfig` / `search-people-by-date-range-toolDefinition`
- **CRUD Operations**: 2 tools
  - `create-person-toolConfig` / `create-person-toolDefinition`
  - `update-person-toolConfig` / `update-person-toolDefinition`
- **Notes**: 2 tools
  - `create-person-note-toolConfig` / `create-person-note-toolDefinition`
  - `get-person-notes-toolConfig` / `get-person-notes-toolDefinition`
- **Relationships**: 2 tools
  - `get-person-relationships-toolConfig` / `get-person-relationships-toolDefinition`
  - `create-person-relationship-toolConfig` / `create-person-relationship-toolDefinition`

#### General/Utility Modules (22 tools)
- **Lists**: 2 tools (`get-list-details`, `add-record-to-list`)
- **Tasks**: 2 tools (`get-tasks`, `create-task`)
- **Records**: 2 tools (`get-records`, `update-record`)
- **Relationships**: 2 tools (`get-cross-entity-relationships`, `create-cross-entity-relationship`)
- **General**: 2 tools (`get-workspace-info`, `bulk-operation`)
- **Deprecated/Legacy**: 10+ tools (paginated-people, rate-limited variants, etc.)

## Consolidation Strategy Analysis

### Phase 1: Low-Risk Consolidations (Target: 50→40 tools)

#### Immediate Consolidation Opportunities

1. **Duplicate/Legacy Tools** (Remove 6 tools)
   - Remove `paginated-people` tools - functionality covered by main search
   - Remove `rate-limited-people` tools - handled by core rate limiting
   - Consolidate formatter-only tools

2. **Similar Search Operations** (Consolidate 4 tools)
   - Merge `advanced-search-people` and `search-people` into unified `search-people`
   - Merge activity/date range searches into main search with filters

#### Risk Assessment: **LOW** 
- No functional changes
- Clear duplicates and legacy code
- Minimal schema changes needed

### Phase 2: Medium-Risk CRUD Consolidations (Target: 40→30 tools)

#### CRUD Operation Unification

1. **Company Operations** (8→3 tools)
   - `manage-company`: Unify create/update/get operations
   - `company-attributes`: Unify discover/update attribute operations  
   - `company-relationships`: Unify get/create relationship operations

2. **People Operations** (6→3 tools)
   - `manage-person`: Unify create/update operations
   - `person-relationships`: Unify get/create relationship operations
   - `person-notes`: Unify create/get note operations

#### Schema Design Pattern
```typescript
interface ManageEntityTool {
  operation: 'create' | 'update' | 'get' | 'delete';
  entity_id?: string;      // required for update/get/delete
  entity_data?: EntityData; // required for create/update
  // Additional operation-specific fields
}
```

#### Risk Assessment: **MEDIUM**
- Requires careful schema design
- More complex parameter validation
- Backward compatibility considerations

### Phase 3: Advanced Consolidations (Target: 30→25 tools)

#### Cross-Domain Operations

1. **Universal Entity Manager** (6→2 tools)
   - `manage-entity`: Universal CRUD for companies/people/records
   - `entity-relationships`: Universal relationship management

2. **Batch Operations Hub** (4→1 tool)
   - `batch-operations`: Unified batch processing for all entity types

#### Risk Assessment: **HIGH**
- Complex parameter validation
- Significant schema changes
- Performance considerations

## Technical Implementation Details

### Tool Configuration Structure

Current pattern (per tool):
```typescript
// Tool configuration with handler
export const specificToolConfig = {
  name: 'specific-tool-name',
  description: 'Description',
  inputSchema: { /* Schema */ },
  handler: async (args) => { /* Handler */ },
  formatResult: (result) => { /* Formatter */ }
};

// Tool definition for MCP protocol  
export const specificToolDefinition = {
  name: 'specific-tool-name',
  description: 'Description',
  inputSchema: { /* Schema */ }
};
```

Proposed consolidated pattern:
```typescript
export const consolidatedToolConfig = {
  name: 'consolidated-tool-name',
  description: 'Multi-operation tool',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string', 
        enum: ['create', 'update', 'get', 'delete']
      },
      // Dynamic schema based on operation
    },
    required: ['operation']
  },
  handler: async (args) => {
    // Route to specific operation handler
    switch (args.operation) {
      case 'create': return handleCreate(args);
      case 'update': return handleUpdate(args);
      // etc.
    }
  }
};
```

### MCP Schema Compliance

**Critical Requirements**:
- NO `oneOf`/`allOf`/`anyOf` at top level
- Runtime parameter validation for operation-specific requirements
- Clear error messages for invalid operation/parameter combinations

### Backward Compatibility Strategy

1. **Deprecation Phase** (2 weeks)
   - Mark old tools as deprecated in descriptions
   - Maintain full functionality
   - Add migration warnings

2. **Alias Phase** (2 weeks)  
   - Implement tool name aliases
   - Route old names to new consolidated tools
   - Track usage analytics

3. **Removal Phase**
   - Remove deprecated tool definitions
   - Keep handler logic for rollback capability

## Performance Impact Analysis

### Expected Improvements

1. **Reduced Context Window Usage**: 50% reduction in tool definitions
2. **Faster Tool Selection**: AI has fewer options to evaluate
3. **Improved Caching**: Fewer tool schemas to validate

### Potential Risks

1. **Increased Parameter Complexity**: More validation logic needed
2. **Schema Parsing Overhead**: Larger, more complex schemas
3. **Error Surface**: More complex validation = more failure points

## Monitoring and Success Metrics

### Performance Metrics
- Tool selection time (before/after)
- Context window usage reduction
- Error rates per operation type
- Tool usage distribution

### Quality Metrics  
- Functionality coverage (100% target)
- Backward compatibility success rate
- Migration completion rate

## Next Steps for Implementation

1. **Create tool audit script** - Analyze actual usage patterns
2. **Design consolidation schemas** - Following MCP guidelines
3. **Implement Phase 1 consolidations** - Low-risk removals first
4. **Setup monitoring infrastructure** - Track performance metrics
5. **Create rollback mechanisms** - Feature flags and fallbacks

## Recommendation

**Target**: Reduce from 50 to 30 tools (40% reduction) through 3-phase approach
**Timeline**: 8-10 weeks total implementation
**Risk Level**: Manageable with proper testing and rollback strategies

This achieves the performance goals while maintaining system reliability and functionality coverage.