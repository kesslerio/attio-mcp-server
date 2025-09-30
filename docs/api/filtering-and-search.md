# Filtering and Search Guide

This comprehensive guide covers all filtering and search capabilities in the Attio MCP Server.

## Overview

The Attio MCP Server provides powerful filtering capabilities that allow you to find exactly the data you need. All filtering is done through natural language with the universal tools system.

## Basic Filtering

### Simple Text Searches

```
Find people with "john" in their name
```

### Smarter Query Searches

```
Find Alex Rivera using "Alex Rivera alex.rivera@example.com"
Find a phone number using "+1 (555) 010-4477" or "555-010-4477"
Find companies tied to a domain using "examplecorp.com"
```

### Field-Specific Filtering

```
Find companies where industry is "Technology"
```

### Date-Based Filtering

```
Find deals created after 2024-01-01
```

### Numeric Filtering

```
Find companies with employee count greater than 100
```

## Advanced Filtering

### Multiple Criteria

```
Find people who work at Technology companies and have "manager" in their title
```

### Relationship-Based Filtering

```
Find all deals associated with companies in San Francisco
```

### Activity-Based Filtering

```
Find companies with notes created in the last 30 days
```

## Filter Operators

### Text Operators

- **contains**: Partial text match
- **equals**: Exact match
- **starts_with**: Prefix match
- **ends_with**: Suffix match

### Numeric Operators

- **greater_than**: >
- **less_than**: <
- **greater_than_or_equal**: >=
- **less_than_or_equal**: <=
- **equals**: =

### Date Operators

- **after**: Later than specified date
- **before**: Earlier than specified date
- **on**: Exact date match
- **between**: Within date range

### List Operators

- **in**: Value in list
- **not_in**: Value not in list

## Special Filtering Features

### Domain-Based Search

```
Find all people with email addresses from @google.com
```

### Cross-Record Filtering

```
Find people whose companies have deals worth more than $10,000
```

### Historical Activity Filtering

```
Find records with activity in the last quarter
```

## Performance Optimization

### Indexing

- Use indexed fields when possible
- Combine filters efficiently
- Limit result sets appropriately

### Best Practices

- Start with broad filters, then narrow down
- Use relationship filters judiciously
- Cache frequently used filter results

## Examples by Use Case

### Sales Team

```
Find hot prospects: companies with recent activity and high deal value
```

### Marketing Team

```
Find target accounts: companies in specific industries without recent contact
```

### Customer Success

```
Find at-risk accounts: companies with no activity in the last 60 days
```

## Troubleshooting

### Common Issues

- **Too many results**: Add more specific filters
- **No results**: Check filter criteria and spelling
- **Performance issues**: Use indexed fields and limit result sets

### Error Messages

- **Invalid filter**: Check operator syntax
- **Field not found**: Verify field names
- **Permission denied**: Check API key permissions

For more examples, see the [User Guide](../user-guide.md) and [API Reference](universal-tools.md).
