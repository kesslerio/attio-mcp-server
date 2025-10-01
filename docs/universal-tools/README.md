# Universal Tools Documentation

This directory contains comprehensive documentation for the Attio MCP Server's universal tool system, which consolidates over 40 resource-specific tools into 13 powerful universal operations.

## Quick Navigation

### 🚀 [Migration Guide](migration-guide.md)

**Start here if you're upgrading from deprecated tools**

- Complete tool mapping reference
- Step-by-step migration examples
- Breaking changes and compatibility notes

### 📚 [API Reference](api-reference.md)

**Complete reference for all universal tools**

- 8 core universal operations
- 5 advanced universal operations
- Parameter schemas and validation rules

### 👩‍💻 [User Guide](user-guide.md)

**Learn how to use universal tools effectively**

- Getting started examples
- Common use cases and patterns
- Performance best practices

### 🛠 [Developer Guide](developer-guide.md)

**Extend and customize universal tools**

- Architecture overview
- Adding new resource types
- Testing strategies

### ❓ [Troubleshooting](troubleshooting.md)

**Solutions for common issues**

- Error messages and fixes
- Migration troubleshooting
- FAQ section

## Overview

### What Are Universal Tools?

Universal tools are consolidated MCP operations that work across multiple resource types (companies, people, records, tasks) using parameter-based routing. Instead of having separate tools for each resource type, you use a single universal tool with a `resource_type` parameter.

### Benefits

- **68% Tool Reduction**: From 40+ tools to 13 universal operations
- **Consistent API**: Same patterns across all resource types
- **Better Performance**: Fewer tools for AI to evaluate and select
- **Easier Maintenance**: Single implementation for multiple resource types

### The 13 Universal Tools

**Core Operations (8 tools)**:

- `records.search` - Find records with flexible filtering
- `records.get_details` - Retrieve detailed record information
- `create-record` - Create new records
- `update-record` - Modify existing records
- `delete-record` - Remove records
- `records.get_attributes` - Retrieve record attributes
- `records.discover_attributes` - Explore available attributes
- `records.get_info` - Get specialized record information

**Advanced Operations (5 tools)**:

- `records.search_advanced` - Complex searches with sorting
- `records.search_by_relationship` - Cross-resource relationship searches
- `records.search_by_content` - Content-based searches (notes, activity)
- `records.search_by_timeframe` - Time-based searches
- `records.batch` - Bulk operations on multiple records

### Quick Example

**Before (deprecated)**:

```typescript
// Separate tools for each resource type
await client.callTool('search-companies', { query: 'tech' });
await client.callTool('search-people', { query: 'john' });
```

**After (universal)**:

```typescript
// Single tool with resource_type parameter
await client.callTool('records.search', {
  resource_type: 'companies',
  query: 'tech',
});
await client.callTool('records.search', {
  resource_type: 'people',
  query: 'john',
});
```

## Getting Started

1. **Migrating?** → Start with the [Migration Guide](migration-guide.md)
2. **New user?** → Check out the [User Guide](user-guide.md)
3. **Need reference?** → See the [API Reference](api-reference.md)
4. **Having issues?** → Visit [Troubleshooting](troubleshooting.md)

## Support

For questions or issues:

- Check the [Troubleshooting Guide](troubleshooting.md)
- Review the [API Reference](api-reference.md)
- Create an issue in the [GitHub repository](https://github.com/kesslerio/attio-mcp-server)
