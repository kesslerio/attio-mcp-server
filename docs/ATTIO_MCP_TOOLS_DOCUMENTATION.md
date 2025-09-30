# Attio MCP Universal Tools Documentation

## 🎯 Universal Tools System

The Attio MCP server has been **significantly improved** with universal tools that consolidate 40+ resource-specific tools into **13 powerful universal operations** - a **68% reduction** that provides better performance and a more consistent API.

## 🚀 Quick Start

**New to universal tools?** Start here:

### [📖 Universal Tools Overview](./universal-tools/README.md)

Complete introduction to the universal tools system with quick navigation and examples.

### [🔄 Migration Guide](./universal-tools/migration-guide.md)

**Upgrading from individual tools?** This guide provides complete mappings for all 40+ deprecated tools to their universal equivalents.

### [📚 API Reference](./universal-tools/api-reference.md)

Comprehensive reference for all 13 universal tools with detailed schemas and examples.

## 🎨 Benefits of Universal Tools

- **68% Tool Reduction**: From 40+ tools to 13 universal operations
- **Consistent API**: Same patterns across all resource types (companies, people, records, tasks)
- **Better Performance**: Fewer tools for AI systems to evaluate and select
- **Future-Proof**: Easy to add new resource types without new tools

## 🛠 The 13 Universal Tools

### Core Operations (8 tools)

- `records.search` - Universal search across all resource types
- `records.get_details` - Get detailed information for any record
- `create-record` - Create records of any supported type
- `update-record` - Update existing records
- `delete-record` - Delete records
- `get-attributes` - Get attributes for any resource type
- `discover-attributes` - Discover available attributes
- `get-detailed-info` - Get specialized information (contact, business, social)

### Advanced Operations (5 tools)

- `advanced-search` - Complex searches with sorting and advanced filtering
- `search-by-relationship` - Cross-resource relationship searches
- `search-by-content` - Content-based searches (notes, activity)
- `search-by-timeframe` - Time-based searches with date ranges
- `batch-operations` - Bulk operations on multiple records

## 🔗 Quick Navigation

| What you need                    | Go here                                                 |
| -------------------------------- | ------------------------------------------------------- |
| **Overview and getting started** | [Universal Tools Overview](./universal-tools/README.md) |
| **Migrate from old tools**       | [Migration Guide](./universal-tools/migration-guide.md) |
| **Complete API reference**       | [API Reference](./universal-tools/api-reference.md)     |
| **Best practices and examples**  | [User Guide](./universal-tools/user-guide.md)           |
| **Extend or customize**          | [Developer Guide](./universal-tools/developer-guide.md) |
| **Troubleshoot issues**          | [Troubleshooting](./universal-tools/troubleshooting.md) |

## ⚠️ Deprecated Individual Tools

The following resource-specific tools have been consolidated into universal operations:

- **Company tools** (27 tools) → Universal tools with `resource_type: 'companies'`
- **People tools** (15 tools) → Universal tools with `resource_type: 'people'`
- **Task tools** (5 tools) → Universal tools with `resource_type: 'tasks'`

**Need help migrating?** See the [Migration Guide](./universal-tools/migration-guide.md) for complete mappings and examples.

## 💡 Example: Before vs After

### Before (deprecated)

```typescript
// Separate tools for each resource type
await client.callTool('search-companies', { query: 'tech' });
await client.callTool('search-people', { query: 'john' });
await client.callTool('create-task', { title: 'Follow up' });
```

### After (universal)

```typescript
// Single tools with resource_type parameter
await client.callTool('records.search', {
  resource_type: 'companies',
  query: 'tech',
});
await client.callTool('records.search', {
  resource_type: 'people',
  query: 'john',
});
await client.callTool('create-record', {
  resource_type: 'tasks',
  record_data: { title: 'Follow up' },
});
```

## 🎉 Get Started

Ready to use the universal tools? Start with the [Universal Tools Overview](./universal-tools/README.md) and experience the improved, streamlined API!

---

_This documentation reflects the universal tools consolidation completed in Issue #352. All functionality from the previous individual tools is preserved and improved in the universal system._
