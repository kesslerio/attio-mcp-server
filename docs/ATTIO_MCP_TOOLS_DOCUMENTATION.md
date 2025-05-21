# Attio MCP Tools Documentation

## Overview

The Attio MCP server is an implementation of the Model Context Protocol (MCP) that integrates with the Attio CRM API, providing comprehensive access to Attio's CRM capabilities. This server enables Claude to manage contacts, companies, lists, and notes through natural language interactions, making it easy to perform CRM operations directly from conversations.

## Key Features

- 🔍 **Comprehensive Search**: Search for companies, people, and lists with flexible criteria
- 📋 **List Management**: View, create, and manage lists and list entries
- 🏢 **Company Management**: Create, update, retrieve, and manage company records
- 👤 **People Management**: Create, update, retrieve, and manage people records
- 📝 **Notes Management**: Create and retrieve notes for companies and people
- 🔄 **Advanced Filtering**: Filter records using complex criteria and relationships
- 🔎 **Attribute Discovery**: Discover and explore available attributes across objects
- 📊 **Batch Operations**: Perform bulk operations on multiple records

## Available Tools

The Attio MCP server provides a wide range of tools organized by resource type:

### Company Tools

#### 1. search-companies

Search for companies in Attio.

**Parameters**:
- `query` (string, required): Search query for companies

**Example**:
```
search-companies(query: "acme")
```

#### 2. advanced-search-companies

Search for companies using advanced filtering capabilities.

**Parameters**:
- `filters` (object, required): Complex filter object for advanced searching
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
advanced-search-companies(
  filters: {
    "filters": [
      {
        "attribute": {"slug": "industry"},
        "condition": "equals",
        "value": "Technology"
      }
    ],
    "matchAny": false
  },
  limit: 10
)
```

#### 3. get-company-basic-info

Get basic information about a company in Attio.

**Parameters**:
- `companyId` (string, required): ID of the company to retrieve

**Example**:
```
get-company-basic-info(companyId: "12345abc-6789-def0-1234-56789abcdef")
```

#### 4. create-company

Create a new company in Attio.

**Parameters**:
- `attributes` (object, required): Company attributes to set

**Example**:
```
create-company(
  attributes: {
    "name": "New Tech Solutions",
    "website": "https://newtechsolutions.com",
    "industry": "Technology",
    "description": "Leading provider of innovative tech solutions"
  }
)
```

#### 5. update-company

Update an existing company in Attio.

**Parameters**:
- `companyId` (string, required): ID of the company to update
- `attributes` (object, required): Attributes to update on the company

**Example**:
```
update-company(
  companyId: "12345abc-6789-def0-1234-56789abcdef",
  attributes: {
    "description": "Updated company description",
    "website": "https://updated-website.com"
  }
)
```

#### 6. update-company-attribute

Update a specific attribute of a company.

**Parameters**:
- `companyId` (string, required): ID of the company to update
- `attributeName` (string, required): Name of the attribute to update
- `value` (any, required): New value for the attribute

**Example**:
```
update-company-attribute(
  companyId: "12345abc-6789-def0-1234-56789abcdef",
  attributeName: "industry",
  value: "Software & Technology"
)
```

#### 7. delete-company

Delete a company from Attio.

**Parameters**:
- `companyId` (string, required): ID of the company to delete

**Example**:
```
delete-company(companyId: "12345abc-6789-def0-1234-56789abcdef")
```

#### 8. get-company-fields

Get specific fields from a company by field names.

**Parameters**:
- `companyId` (string, required): ID of the company
- `fields` (array, required): Array of field names to retrieve

**Example**:
```
get-company-fields(
  companyId: "12345abc-6789-def0-1234-56789abcdef",
  fields: ["name", "website", "industry", "description"]
)
```

#### 9. get-company-custom-fields

Get custom fields for a company.

**Parameters**:
- `companyId` (string, required): ID of the company
- `customFieldNames` (string or array, optional): Specific custom field names to retrieve

**Example**:
```
get-company-custom-fields(
  companyId: "12345abc-6789-def0-1234-56789abcdef",
  customFieldNames: ["typpe", "body_composition_technologies"]
)
```

#### 10. discover-company-attributes

Discover all available company attributes in the workspace.

**Parameters**: None

**Example**:
```
discover-company-attributes()
```

#### 11. get-company-attributes

Get all available attributes for a company or the value of a specific attribute.

**Parameters**:
- `companyId` (string, required): ID of the company
- `attributeName` (string, optional): Name of specific attribute to retrieve

**Example**:
```
get-company-attributes(
  companyId: "12345abc-6789-def0-1234-56789abcdef",
  attributeName: "typpe"
)
```

#### 12. get-company-notes

Get notes for a company.

**Parameters**:
- `companyId` (string, required): ID of the company to get notes for
- `limit` (number, optional): Maximum number of notes to fetch (default: 10)
- `offset` (number, optional): Number of notes to skip for pagination (default: 0)

**Example**:
```
get-company-notes(
  companyId: "12345abc-6789-def0-1234-56789abcdef",
  limit: 5
)
```

#### 13. create-company-note

Create a note for a specific company.

**Parameters**:
- `companyId` (string, required): ID of the company to create a note for
- `content` (string, required): Content of the note
- `title` (string, optional): Title of the note

**Example**:
```
create-company-note(
  companyId: "12345abc-6789-def0-1234-56789abcdef",
  title: "Sales Meeting",
  content: "Met with CEO to discuss enterprise pricing. They are interested in our premium plan."
)
```

#### 14. search-companies-by-people

Search for companies based on attributes of their associated people.

**Parameters**:
- `peopleFilter` (object, required): Filter conditions to apply to people
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
search-companies-by-people(
  peopleFilter: {
    "filters": [
      {
        "attribute": {"slug": "job_title"},
        "condition": "contains",
        "value": "CEO"
      }
    ],
    "matchAny": false
  },
  limit: 10
)
```

#### 15. search-companies-by-people-list

Search for companies that have employees in a specific list.

**Parameters**:
- `listId` (string, required): ID of the list containing people
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
search-companies-by-people-list(
  listId: "12345abc-6789-def0-1234-56789abcdef",
  limit: 10
)
```

#### 16. search-companies-by-notes

Search for companies that have notes containing specific text.

**Parameters**:
- `searchText` (string, required): Text to search for in notes
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
search-companies-by-notes(
  searchText: "partnership opportunity",
  limit: 10
)
```

#### 17. batch-create-companies

Create multiple companies in a single batch operation.

**Parameters**:
- `companies` (array, required): Array of company data to create
- `config` (object, optional): Optional batch configuration

**Example**:
```
batch-create-companies(
  companies: [
    {
      "name": "Tech Solutions Inc",
      "industry": "Technology"
    },
    {
      "name": "Medical Innovations",
      "industry": "Healthcare"
    }
  ]
)
```

#### 18. batch-update-companies

Update multiple companies in a single batch operation.

**Parameters**:
- `updates` (array, required): Array of company updates
- `config` (object, optional): Optional batch configuration

**Example**:
```
batch-update-companies(
  updates: [
    {
      "id": "12345abc-6789-def0-1234-56789abcdef",
      "attributes": {
        "industry": "Software Development"
      }
    },
    {
      "id": "67890abc-1234-def5-6789-01234abcdef",
      "attributes": {
        "industry": "Healthcare Technology"
      }
    }
  ]
)
```

#### 19. batch-delete-companies

Delete multiple companies in a single batch operation.

**Parameters**:
- `companyIds` (array, required): Array of company IDs to delete
- `config` (object, optional): Optional batch configuration

**Example**:
```
batch-delete-companies(
  companyIds: [
    "12345abc-6789-def0-1234-56789abcdef",
    "67890abc-1234-def5-6789-01234abcdef"
  ]
)
```

#### 20. batch-search-companies

Perform multiple company searches in a single batch operation.

**Parameters**:
- `queries` (array, required): Array of search queries
- `config` (object, optional): Optional batch configuration

**Example**:
```
batch-search-companies(
  queries: ["tech", "healthcare", "finance"]
)
```

#### 21. batch-get-company-details

Get details for multiple companies in a single batch operation.

**Parameters**:
- `companyIds` (array, required): Array of company IDs to get details for
- `config` (object, optional): Optional batch configuration

**Example**:
```
batch-get-company-details(
  companyIds: [
    "12345abc-6789-def0-1234-56789abcdef",
    "67890abc-1234-def5-6789-01234abcdef"
  ]
)
```

#### 22. get-company-details

Get details of a company.

**Parameters**:
- `companyId` (string, required): ID of the company to get details for
- `uri` (string, optional): URI of the company in the format 'attio://companies/{id}'

**Example**:
```
get-company-details(
  companyId: "12345abc-6789-def0-1234-56789abcdef"
)
```

#### 23. get-company-json

Get raw JSON representation of a company.

**Parameters**:
- `companyId` (string, required): ID of the company to get JSON for

**Example**:
```
get-company-json(
  companyId: "12345abc-6789-def0-1234-56789abcdef"
)
```

#### 24. get-company-contact-info

Get contact information for a company.

**Parameters**:
- `companyId` (string, required): ID of the company

**Example**:
```
get-company-contact-info(
  companyId: "12345abc-6789-def0-1234-56789abcdef"
)
```

#### 25. get-company-business-info

Get business information about a company.

**Parameters**:
- `companyId` (string, required): ID of the company

**Example**:
```
get-company-business-info(
  companyId: "12345abc-6789-def0-1234-56789abcdef"
)
```

#### 26. get-company-social-info

Get social media information for a company.

**Parameters**:
- `companyId` (string, required): ID of the company

**Example**:
```
get-company-social-info(
  companyId: "12345abc-6789-def0-1234-56789abcdef"
)
```

### People Tools

#### 1. create-person

Create a new person in Attio.

**Parameters**:
- `attributes` (object, required): Person attributes to set

**Example**:
```
create-person(
  attributes: {
    "name": "John Smith",
    "email_addresses": ["john.smith@example.com"],
    "phone_numbers": ["+1 555-123-4567"],
    "job_title": "CTO",
    "company": "Acme Inc"
  }
)
```

#### 2. search-people

Search for people in Attio.

**Parameters**:
- `query` (string, required): Search query for people

**Example**:
```
search-people(query: "john")
```

#### 3. search-people-by-email

Search for people by email in Attio.

**Parameters**:
- `email` (string, required): Email address to search for

**Example**:
```
search-people-by-email(email: "john.smith@example.com")
```

#### 4. search-people-by-phone

Search for people by phone number in Attio.

**Parameters**:
- `phone` (string, required): Phone number to search for

**Example**:
```
search-people-by-phone(phone: "+1 555-123-4567")
```

#### 5. advanced-search-people

Search for people using advanced filtering capabilities.

**Parameters**:
- `filters` (object, required): Complex filter object for advanced searching
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
advanced-search-people(
  filters: {
    "filters": [
      {
        "attribute": {"slug": "job_title"},
        "condition": "contains",
        "value": "CTO"
      }
    ],
    "matchAny": false
  },
  limit: 10
)
```

#### 6. get-person-details

Get details of a person.

**Parameters**:
- `personId` (string, required): ID of the person to get details for

**Example**:
```
get-person-details(
  personId: "12345abc-6789-def0-1234-56789abcdef"
)
```

#### 7. get-person-notes

Get notes for a person.

**Parameters**:
- `personId` (string, required): ID of the person to get notes for

**Example**:
```
get-person-notes(
  personId: "12345abc-6789-def0-1234-56789abcdef"
)
```

#### 8. create-person-note

Create a note for a specific person.

**Parameters**:
- `personId` (string, required): ID of the person to create a note for
- `content` (string, required): Content of the note

**Example**:
```
create-person-note(
  personId: "12345abc-6789-def0-1234-56789abcdef",
  content: "Had an introductory call. Interested in our enterprise solution."
)
```

#### 9. search-people-by-creation-date

Search for people by their creation date.

**Parameters**:
- `dateRange` (object, required): Date range for filtering
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
search-people-by-creation-date(
  dateRange: {
    "start": "2023-01-01",
    "end": "2023-12-31"
  },
  limit: 20
)
```

#### 10. search-people-by-modification-date

Search for people by their last modification date.

**Parameters**:
- `dateRange` (object, required): Date range for filtering
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
search-people-by-modification-date(
  dateRange: {
    "preset": "this_month"
  },
  limit: 20
)
```

#### 11. search-people-by-last-interaction

Search for people by their last interaction date.

**Parameters**:
- `dateRange` (object, required): Date range for filtering
- `interactionType` (string, optional): Type of interaction to filter by
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
search-people-by-last-interaction(
  dateRange: {
    "start": "2023-01-01",
    "end": "2023-12-31"
  },
  interactionType: "email",
  limit: 20
)
```

#### 12. search-people-by-activity

Search for people by their activity history.

**Parameters**:
- `activityFilter` (object, required): Activity filter configuration
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
search-people-by-activity(
  activityFilter: {
    "dateRange": {
      "start": "2023-01-01",
      "end": "2023-12-31"
    },
    "interactionType": "meeting"
  },
  limit: 20
)
```

#### 13. search-people-by-company

Search for people based on attributes of their associated companies.

**Parameters**:
- `companyFilter` (object, required): Filter conditions to apply to companies
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
search-people-by-company(
  companyFilter: {
    "filters": [
      {
        "attribute": {"slug": "companies.name"},
        "condition": "contains",
        "value": "Acme"
      }
    ],
    "matchAny": false
  },
  limit: 20
)
```

#### 14. search-people-by-company-list

Search for people who work at companies in a specific list.

**Parameters**:
- `listId` (string, required): ID of the list containing companies
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
search-people-by-company-list(
  listId: "12345abc-6789-def0-1234-56789abcdef",
  limit: 20
)
```

#### 15. search-people-by-notes

Search for people that have notes containing specific text.

**Parameters**:
- `searchText` (string, required): Text to search for in notes
- `limit` (number, optional): Maximum number of results to return (default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example**:
```
search-people-by-notes(
  searchText: "interested in premium plan",
  limit: 10
)
```

### Lists Tools

#### 1. get-lists

Get all lists in Attio.

**Parameters**: None

**Example**:
```
get-lists()
```

#### 2. get-list-details

Get details for a specific list.

**Parameters**:
- `listId` (string, required): ID of the list to get details for

**Example**:
```
get-list-details(
  listId: "12345abc-6789-def0-1234-56789abcdef"
)
```

#### 3. get-list-entries

Get entries for a specific list.

**Parameters**:
- `listId` (string, required): ID of the list to get entries for
- `limit` (number, optional): Maximum number of entries to fetch (default: 20)
- `offset` (number, optional): Number of entries to skip for pagination (default: 0)

**Example**:
```
get-list-entries(
  listId: "12345abc-6789-def0-1234-56789abcdef",
  limit: 10
)
```

#### 4. filter-list-entries

Filter entries in a list by a specific attribute.

**Parameters**:
- `listId` (string, required): ID of the list to filter entries from
- `attributeSlug` (string, required): Slug of the attribute to filter by
- `condition` (string, required): Filter condition
- `value` (any, required): Value to filter by
- `limit` (number, optional): Maximum number of entries to fetch (default: 20)
- `offset` (number, optional): Number of entries to skip for pagination (default: 0)

**Example**:
```
filter-list-entries(
  listId: "12345abc-6789-def0-1234-56789abcdef",
  attributeSlug: "stage",
  condition: "equals",
  value: "Qualified",
  limit: 10
)
```

#### 5. advanced-filter-list-entries

Filter entries in a list with advanced multiple conditions.

**Parameters**:
- `listId` (string, required): ID of the list to filter entries from
- `filters` (object, required): Advanced filter configuration
- `limit` (number, optional): Maximum number of entries to fetch (default: 20)
- `offset` (number, optional): Number of entries to skip for pagination (default: 0)

**Example**:
```
advanced-filter-list-entries(
  listId: "12345abc-6789-def0-1234-56789abcdef",
  filters: {
    "filters": [
      {
        "attribute": {"slug": "stage"},
        "condition": "equals",
        "value": "Qualified"
      },
      {
        "attribute": {"slug": "deal_size"},
        "condition": "greater_than",
        "value": 50000
      }
    ],
    "matchAny": false
  },
  limit: 10
)
```

#### 6. add-record-to-list

Add a record to a list.

**Parameters**:
- `listId` (string, required): ID of the list to add the record to
- `recordId` (string, required): ID of the record to add to the list

**Example**:
```
add-record-to-list(
  listId: "12345abc-6789-def0-1234-56789abcdef",
  recordId: "67890abc-1234-def5-6789-01234abcdef"
)
```

#### 7. remove-record-from-list

Remove a record from a list.

**Parameters**:
- `listId` (string, required): ID of the list to remove the record from
- `entryId` (string, required): ID of the list entry to remove

**Example**:
```
remove-record-from-list(
  listId: "12345abc-6789-def0-1234-56789abcdef",
  entryId: "67890abc-1234-def5-6789-01234abcdef"
)
```

## Best Practices for Using Attio MCP

### 1. Effective Searching

- **Use Specific Identifiers**: When searching for specific records, use unique identifiers like email addresses or company names rather than generic terms
- **Leverage Advanced Search**: For complex queries, use the advanced search tools with filters rather than basic search
- **Filter by Attributes**: Use attribute-specific searches (like by email or phone) when you have this information

### 2. Working with Companies and People

- **Check Before Creating**: Always search for existing records before creating new ones to avoid duplicates
- **Use Batch Operations**: When working with multiple records, use batch operations for better performance
- **Update Specific Attributes**: Use the specific attribute update tools when you only need to change one field

### 3. Lists Management

- **Organize Records**: Use lists to organize companies and people into meaningful groups (e.g., prospects, customers)
- **Filter Lists**: Use list filtering to find specific records within a list
- **Link Companies and People**: Leverage the relationship between companies and people for more effective CRM usage

### 4. Type Handling

- **Boolean Values**: Always use actual boolean values (true/false) not strings ("true"/"false") for boolean fields
- **Select Fields**: Ensure you provide valid options for select fields
- **Date Ranges**: When using date filters, provide dates in ISO format (YYYY-MM-DD) or use preset options like "this_week"

## Common Use Cases

### 1. Lead Management

- Search for potential leads using advanced filters
- Add leads to appropriate lists
- Create notes about interactions
- Update lead status and information as they progress through the pipeline

### 2. Company Research

- Get detailed information about companies
- Search for companies in specific industries or with specific attributes
- Find people associated with target companies
- Create notes about company research findings

### 3. Contact Organization

- Create and update person records
- Search for contacts based on various criteria
- Group contacts into relevant lists
- Track interactions with contacts

### 4. Relationship Management

- Find connections between companies and people
- Track interaction history and activity
- Create and manage notes about relationships
- Organize relationships in lists for better visibility

## Troubleshooting

### Common Issues

1. **API Key Issues**:
   - Ensure your Attio API key is correctly entered in your configuration
   - Check that your API key has the necessary permissions
   - Verify that you haven't exceeded any API rate limits

2. **Record Not Found**:
   - Verify that you're using the correct record ID
   - Check if the record exists using a search operation
   - Ensure you have permission to access the record

3. **Type Errors**:
   - Ensure you're providing the correct data types for fields
   - For boolean fields, use actual boolean values (true/false) not strings
   - For select fields, provide valid option values

4. **Filtering Issues**:
   - Verify the attribute slugs used in filters exist
   - Ensure the condition operators are valid for the attribute type
   - Check that filter values match the expected format for the attribute

## Setup and Configuration

### Prerequisites

1. **Attio Account**:
   - Sign up for an Attio account if you don't have one
   - Ensure you have administrator access to create API keys

2. **Attio API Key**:
   - Generate an API key from the Attio dashboard
   - Ensure the API key has the necessary permissions

### Claude Desktop Configuration

Add the following to your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "attio": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-attio"
      ],
      "env": {
        "ATTIO_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### API Limitations

- **Rate Limits**: The Attio API has rate limits that may affect rapid, high-volume operations
- **Response Size**: Large responses may be paginated
- **Field Types**: Field types must match exactly as expected by the API

## Additional Resources

- [Attio API Documentation](https://docs.attio.com/api-documentation)
- [Model Context Protocol Documentation](https://modelcontextprotocol.github.io/)
- [Attio GitHub Repository](https://github.com/kesslerio/attio-mcp-server)