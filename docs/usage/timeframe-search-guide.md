# 📅 Timeframe Search Guide

Complete guide to using timeframe search functionality in the Attio MCP Server.

## 🚀 Quick Start

### Basic Relative Timeframes
```json
{
  "resource_type": "companies",
  "search_type": "timeframe",
  "timeframe_attribute": "created_at",
  "timeframe": "last_7_days",
  "limit": 10
}
```

### Absolute Date Ranges
```json
{
  "resource_type": "people", 
  "search_type": "timeframe",
  "timeframe_attribute": "updated_at",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "date_operator": "between",
  "limit": 50
}
```

## 📖 Parameter Reference

### Required Parameters
- `resource_type`: `"companies" | "people" | "tasks" | "lists"`
- `search_type`: `"timeframe"` (for timeframe searches)
- `timeframe_attribute`: The date field to filter on

### Timeframe Options

#### Relative Timeframes
| Timeframe | Description | Example Range |
|-----------|-------------|---------------|
| `today` | Current day | 2024-01-15 00:00:00 - 23:59:59 |
| `yesterday` | Previous day | 2024-01-14 00:00:00 - 23:59:59 |
| `this_week` | Monday of current week to now | 2024-01-08 00:00:00 - now |
| `last_week` | Previous Monday-Sunday | 2024-01-01 00:00:00 - 2024-01-07 23:59:59 |
| `this_month` | First of month to now | 2024-01-01 00:00:00 - now |
| `last_month` | Previous month | 2023-12-01 00:00:00 - 2023-12-31 23:59:59 |
| `last_7_days` | Rolling 7-day window | 7 days ago - now |
| `last_30_days` | Rolling 30-day window | 30 days ago - now |
| `last_90_days` | Rolling 90-day window | 90 days ago - now |

#### Date Fields
| Field | Description | Supported Resources |
|-------|-------------|-------------------|
| `created_at` | Record creation date | All resources |
| `updated_at` | Record last modified date | All resources |
| `last_interaction` | Last interaction/activity date | People, Companies |

#### Date Operators
| Operator | Description | Usage |
|----------|-------------|-------|
| `between` | Date range (inclusive) | Requires `start_date` and `end_date` |
| `greater_than` | After specified date | Requires `start_date` |
| `less_than` | Before specified date | Requires `end_date` |
| `equals` | Exact date match | Requires `start_date` |

## 🎯 Usage Examples

### 1. Companies Created This Week
```json
{
  "resource_type": "companies",
  "search_type": "timeframe", 
  "timeframe_attribute": "created_at",
  "timeframe": "this_week"
}
```

### 2. People Updated in Last 30 Days
```json
{
  "resource_type": "people",
  "search_type": "timeframe",
  "timeframe_attribute": "updated_at", 
  "timeframe": "last_30_days",
  "limit": 25
}
```

### 3. Custom Date Range with Text Search
```json
{
  "resource_type": "companies",
  "search_type": "timeframe",
  "timeframe_attribute": "created_at",
  "start_date": "2024-06-01T00:00:00Z",
  "end_date": "2024-06-30T23:59:59Z",
  "date_operator": "between",
  "query": "tech",
  "limit": 20
}
```

### 4. People with Recent Interactions
```json
{
  "resource_type": "people",
  "search_type": "timeframe",
  "timeframe_attribute": "last_interaction",
  "timeframe": "last_7_days",
  "offset": 20,
  "limit": 10
}
```

### 5. Tasks Created After Specific Date
```json
{
  "resource_type": "tasks",
  "search_type": "timeframe",
  "timeframe_attribute": "created_at",
  "start_date": "2024-07-01T00:00:00Z", 
  "date_operator": "greater_than"
}
```

## 🔍 Advanced Filtering

### Combining Timeframe with Other Filters
```json
{
  "resource_type": "companies",
  "search_type": "timeframe",
  "timeframe_attribute": "created_at",
  "timeframe": "last_30_days",
  "filters": {
    "filters": [
      {
        "attribute": {"slug": "industry"},
        "condition": "equals", 
        "value": "Technology"
      }
    ]
  }
}
```

### Pagination with Timeframe Search
```json
{
  "resource_type": "people",
  "search_type": "timeframe",
  "timeframe_attribute": "updated_at",
  "timeframe": "this_month",
  "limit": 50,
  "offset": 100
}
```

## ⚠️ Common Mistakes

### ❌ Wrong Parameter Names
```json
// DON'T USE: date_field with relative timeframes
{
  "timeframe": "last_7_days",
  "date_field": "updated_at",  // ❌ Wrong parameter name
  "resource_type": "people"
}
```

```json
// ✅ CORRECT: timeframe_attribute with relative timeframes
{
  "resource_type": "people",
  "search_type": "timeframe",
  "timeframe_attribute": "updated_at",  // ✅ Correct parameter name
  "timeframe": "last_7_days"
}
```

### ❌ Missing search_type
```json
// DON'T FORGET: search_type is required for timeframe searches
{
  "resource_type": "companies",
  // "search_type": "timeframe",  // ❌ Missing required parameter
  "timeframe": "yesterday"
}
```

### ❌ Invalid Date Formats
```json
// DON'T USE: Non-ISO date formats
{
  "start_date": "01/15/2024",  // ❌ Wrong format
  "end_date": "2024-01-31"     // ❌ Missing time component
}

// ✅ CORRECT: ISO 8601 format
{
  "start_date": "2024-01-15T00:00:00Z",  // ✅ Full ISO format
  "end_date": "2024-01-31T23:59:59Z"     // ✅ With timezone
}
```

## 🚀 Performance Tips

### 1. Use Appropriate Limits
```json
// For large datasets, use reasonable limits
{
  "limit": 100,  // ✅ Good for most cases
  "offset": 0
}
```

### 2. Combine Multiple Filters
```json
// More efficient than separate queries
{
  "timeframe": "last_30_days",
  "query": "technology",
  "filters": {...}
}
```

### 3. Use Specific Date Fields
```json
// Choose the most relevant date field
{
  "timeframe_attribute": "last_interaction",  // ✅ For activity-based searches
  "timeframe": "this_week"
}
```

## 🛠️ Troubleshooting

### Common Error Messages

#### "Found 0 results" when expecting data
- ✅ Check parameter names (`timeframe_attribute` not `date_field`)
- ✅ Verify `search_type: "timeframe"` is included
- ✅ Ensure date ranges are realistic

#### "Invalid condition" errors
- ✅ Use Query API routing (automatic for timeframe searches)
- ✅ Check date field exists for the resource type

#### "Unknown attribute slug" errors  
- ✅ Verify the date field is supported for your resource type
- ✅ Use standard fields: `created_at`, `updated_at`, `last_interaction`

### Validation Steps
1. **Parameter Check**: Ensure all required parameters are present
2. **Date Format**: Use ISO 8601 format for all dates
3. **Field Validation**: Confirm the date field exists for your resource type
4. **Range Logic**: Verify start date is before end date

## 📚 API Reference

For complete API documentation, see:
- [Universal Search Service](../src/services/UniversalSearchService.ts)
- [Timeframe Utils](../src/utils/filters/timeframe-utils.ts)
- [MCP Test Examples](../test/e2e/mcp/comprehensive-timeframe-validation.test.ts)

## 🔗 Related Documentation

- [Universal Tools Guide](./UNIVERSAL_TOOLS.md)
- [Search API Reference](./SEARCH_API.md)
- [MCP Testing Guide](./MCP_TESTING.md)