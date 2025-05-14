# Relationship-Based Filtering

The Attio MCP server provides powerful relationship-based filtering capabilities that allow you to find records based on their relationships with other records. This enables more advanced query patterns and helps you discover connections between different types of records in your Attio CRM.

## Overview

Relationship-based filtering makes it possible to:

- Find people based on attributes of their associated companies
- Find companies based on attributes of their associated people
- Find records that belong to specific lists
- Find records that have notes containing specific text

## People-Company Relationship Filtering

### Finding People by Company Attributes

You can search for people who work at companies matching specific criteria:

```json
{
  "companyFilter": {
    "filters": [
      {
        "attribute": { "slug": "industry" },
        "condition": "equals",
        "value": "Technology"
      }
    ]
  }
}
```

This example finds all people who work at companies in the Technology industry.

### Finding Companies by People Attributes

Similarly, you can search for companies that have employees matching specific criteria:

```json
{
  "peopleFilter": {
    "filters": [
      {
        "attribute": { "slug": "job_title" },
        "condition": "contains",
        "value": "Engineer"
      }
    ]
  }
}
```

This example finds all companies that have employees with "Engineer" in their job title.

## List Membership Filtering

### Finding People in Companies from a List

You can find people who work at companies that belong to a specific list:

```json
{
  "listId": "list_abc123"
}
```

This finds all people who work at companies in the specified list.

### Finding Companies with People from a List

Similarly, you can find companies that have employees in a specific list:

```json
{
  "listId": "list_xyz789"
}
```

This finds all companies that have employees in the specified list.

## Note Content Filtering

### Finding People by Note Content

You can search for people who have notes containing specific text:

```json
{
  "searchText": "follow up next quarter"
}
```

This finds all people who have notes containing the phrase "follow up next quarter".

### Finding Companies by Note Content

Similarly, you can search for companies that have notes containing specific text:

```json
{
  "searchText": "potential partnership"
}
```

This finds all companies that have notes containing the phrase "potential partnership".

## Examples

### Example 1: Find all people at technology companies with more than 100 employees

```json
{
  "companyFilter": {
    "filters": [
      {
        "attribute": { "slug": "industry" },
        "condition": "equals",
        "value": "Technology"
      },
      {
        "attribute": { "slug": "employee_count" },
        "condition": "greater_than",
        "value": 100
      }
    ],
    "matchAny": false
  }
}
```

### Example 2: Find all companies with executives in San Francisco

```json
{
  "peopleFilter": {
    "filters": [
      {
        "attribute": { "slug": "job_title" },
        "condition": "contains",
        "value": "CEO"
      },
      {
        "attribute": { "slug": "location" },
        "condition": "contains",
        "value": "San Francisco"
      }
    ],
    "matchAny": false
  }
}
```

### Example 3: Find all companies with notes mentioning acquisition

```json
{
  "searchText": "acquisition"
}
```

## Tool Reference

### People Relationship Tools

| Tool Name | Description |
|-----------|-------------|
| `search-people-by-company` | Search for people based on attributes of their associated companies |
| `search-people-by-company-list` | Search for people who work at companies in a specific list |
| `search-people-by-notes` | Search for people that have notes containing specific text |

### Company Relationship Tools

| Tool Name | Description |
|-----------|-------------|
| `search-companies-by-people` | Search for companies based on attributes of their associated people |
| `search-companies-by-people-list` | Search for companies that have employees in a specific list |
| `search-companies-by-notes` | Search for companies that have notes containing specific text |

## Combining Filters

You can combine relationship-based filters with other filtering capabilities to create more powerful and targeted queries. For example, you can combine date-based filtering with relationship filtering to find records created within a specific time range that also have specific relationships.