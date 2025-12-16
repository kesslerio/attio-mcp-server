# Advanced Search Filters

Build precise CRM queries with multi-criteria filtering using AND/OR logic.

**Example query**: "Find all AI companies with 50+ employees that we haven't contacted in 30 days"

## Filter Architecture

This is the supported structure used by the `advanced-search` tool:

```json
{
  "resource_type": "companies",
  "filters": {
    "filters": [
      {
        "attribute": { "slug": "field_name" },
        "condition": "operator",
        "value": "search_value"
      }
    ]
  }
}
```

## Real-World Examples

### Single Criteria Search

```json
{
  "resource_type": "companies",
  "filters": {
    "filters": [
      {
        "attribute": { "slug": "name" },
        "condition": "contains",
        "value": "Tech"
      }
    ]
  }
}
```

### Multi-Criteria Power Search (AND Logic)

```json
{
  "resource_type": "companies",
  "filters": {
    "filters": [
      {
        "attribute": { "slug": "name" },
        "condition": "contains",
        "value": "Tech"
      },
      {
        "attribute": { "slug": "employee_count" },
        "condition": "greater_than",
        "value": 50
      },
      {
        "attribute": { "slug": "industry" },
        "condition": "equals",
        "value": "AI/Machine Learning"
      }
    ]
  }
}
```

### Flexible OR Logic

```json
{
  "resource_type": "companies",
  "filters": {
    "filters": [
      {
        "attribute": { "slug": "name" },
        "condition": "contains",
        "value": "Tech"
      },
      {
        "attribute": { "slug": "name" },
        "condition": "contains",
        "value": "AI"
      }
    ],
    "matchAny": true
  }
}
```

## Smart Filter Operators

| Operator       | Perfect For         | Example Use Case                      |
| -------------- | ------------------- | ------------------------------------- |
| `contains`     | Text searches       | Finding companies with "Tech" in name |
| `equals`       | Exact matches       | Specific industry classification      |
| `starts_with`  | Prefix searches     | Companies beginning with "Acme"       |
| `ends_with`    | Suffix searches     | Companies ending with "Inc"           |
| `greater_than` | Numerical analysis  | Companies with 100+ employees         |
| `less_than`    | Size filtering      | Startups under 50 people              |
| `is_empty`     | Data cleanup        | Find records missing key information  |
| `is_not_empty` | Completeness checks | Records with populated fields         |

## Example Fields by Team

> **Note**: These are example attribute names. Your workspace may have different field slugs. Use the `attio-workspace-schema` skill or `records_discover_attributes` tool to find your actual attribute names.

### Sales Teams

Common filter attributes:

- **Companies**: `name`, `industry`, `employee_count`, `website`
- **People**: `full_name`, `job_title`, `email`

### Marketing Teams

Common engagement attributes:

- **Activity**: `last_interaction`, `email_status`
- **Segmentation**: `industry`, `company_size`, `location`

### Customer Success

Common health metrics:

- **Account**: `renewal_date`, `contract_value`
- **Risk**: `last_contact`, `satisfaction_score`

## Avoid These Common Mistakes

**Wrong** (Flat object structure):

```json
{
  "filters": {
    "name": { "operator": "contains", "value": "Test" }
  }
}
```

**Correct** (Nested array structure):

```json
{
  "filters": {
    "filters": [
      {
        "attribute": { "slug": "name" },
        "condition": "contains",
        "value": "Test"
      }
    ]
  }
}
```

## Quick Troubleshooting

**Getting "Filters must include a 'filters' array property"?**

1. Ensure your filters object contains a `filters` array
2. Each array item needs `attribute`, `condition`, and `value`
3. The `attribute` must be an object with a `slug` property
4. Double-check your JSON structure matches the examples above

**Pro Tip**: Start with simple single-filter searches, then build complexity once you're comfortable with the structure.

## Related Documentation

- [API Overview](../api/api-overview.md)
- [Advanced Filtering API](../api/advanced-filtering.md)
- [Troubleshooting Guide](../troubleshooting.md)
