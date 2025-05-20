# Attio MCP Tools Reference

This document provides a comprehensive guide to all Attio MCP tools available, their capabilities, and when to use each one.

## People Tools

### Basic Search Tools

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `search-people` | Simple text-based search across people records | Quick searches by name, email, or phone | `query`: Text to search for |
| `search-people-by-email` | Search specifically for people by email address | When you need to find people with a specific email address | `email`: Email to search for |
| `search-people-by-phone` | Search specifically for people by phone number | When you need to find people with a specific phone number | `phone`: Phone number to search for |

### Advanced Search Tools

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `advanced-search-people` | Complex, multi-attribute filtering with logical operators | Precise searches with multiple criteria | `filters`: Object with filter conditions, `matchAny`: Boolean for OR/AND logic |
| `search-people-by-creation-date` | Find people created within a date range | When you need to find people based on when they were created | `dateRange`: Date range object |
| `search-people-by-modification-date` | Find people modified within a date range | When you need to find people based on when they were last updated | `dateRange`: Date range object |
| `search-people-by-last-interaction` | Find people with interactions in a date range | When you need to find people based on interaction history | `dateRange`: Date range object, `interactionType`: Type of interaction |
| `search-people-by-activity` | Find people with specific activity history | For detailed activity-based filtering | `activityFilter`: Activity filter configuration |

### Relationship-Based Search Tools

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `search-people-by-company` | Find people associated with specific companies | When you need to find people who work at particular companies | `companyFilter`: Company filter criteria |
| `search-people-by-company-list` | Find people associated with companies in a list | When you need to find people who work at companies in a particular list | `listId`: ID of list containing companies |
| `search-people-by-notes` | Find people with notes containing specific text | When you need to find people based on note content | `searchText`: Text to search for in notes |

### Person Details and Notes

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `get-person-details` | Get comprehensive information about a person | When you need complete details for a specific person | `personId`: Person record ID |
| `get-person-notes` | Get notes associated with a person | When you need to see the note history for a person | `personId`: Person record ID |
| `create-person-note` | Create a new note for a person | When you need to add a note to a person's record | `personId`: Person ID, `content`: Note text |

## Company Tools

### Basic Search Tools

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `search-companies` | Simple text-based search across company records | Quick searches by company name | `query`: Text to search for |
| `search-companies-by-website` | Search specifically for companies by website URL | When you need to find companies with a specific website | `website`: Website to search for |
| `search-companies-by-industry` | Search specifically for companies by industry | When you need to find companies in a specific industry | `industry`: Industry to search for |

### Advanced Search Tools

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `advanced-search-companies` | Complex, multi-attribute filtering with logical operators | Precise searches with multiple criteria | `filters`: Object with filter conditions, `matchAny`: Boolean for OR/AND logic |
| `search-companies-by-creation-date` | Find companies created within a date range | When you need to find companies based on when they were created | `dateRange`: Date range object |
| `search-companies-by-modification-date` | Find companies modified within a date range | When you need to find companies based on when they were last updated | `dateRange`: Date range object |

### Relationship-Based Search Tools

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `search-companies-by-people` | Find companies with employees matching criteria | When you need to find companies based on their people | `peopleFilter`: Filter criteria for people |
| `search-companies-by-people-list` | Find companies with employees in a specific list | When you need to find companies with people in a list | `listId`: List ID containing people |
| `search-companies-by-notes` | Find companies with notes containing specific text | When you need to find companies based on note content | `searchText`: Text to search for in notes |

### Company Details and Notes

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `get-company-details` | Get comprehensive information about a company | When you need complete details for a specific company | `companyId`: Company record ID |
| `get-company-basic-info` | Get basic information about a company | When you only need essential details for a company | `companyId`: Company record ID |
| `get-company-business-info` | Get business information about a company | When you need industry, revenue, and employee data | `companyId`: Company record ID |
| `get-company-contact-info` | Get contact information for a company | When you need address and phone details | `companyId`: Company record ID |
| `get-company-social-info` | Get social media information for a company | When you need links to social profiles | `companyId`: Company record ID |
| `get-company-json` | Get raw JSON representation of a company | When you need the complete data structure for a company | `companyId`: Company record ID |
| `get-company-notes` | Get notes associated with a company | When you need to see the note history for a company | `companyId`: Company record ID |
| `create-company-note` | Create a new note for a company | When you need to add a note to a company's record | `companyId`: Company ID, `title`: Optional note title, `content`: Note text |

## List Tools

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `get-lists` | Get all available lists | When you need to see all lists in the workspace | None |
| `get-list-entries` | Get entries from a specific list | When you need to see the contents of a list | `listId`: List ID |
| `add-record-to-list` | Add a record to a list | When you need to add a person or company to a list | `listId`: List ID, `recordId`: Record ID |
| `remove-record-from-list` | Remove a record from a list | When you need to remove a person or company from a list | `listId`: List ID, `entryId`: Entry ID |
| `advanced-filter-list-entries` | Filter list entries with complex criteria | When you need to filter entries in a list with specific conditions | `listId`: List ID, `filters`: Filter criteria |

## Record Tools

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `create-record` | Create a generic record in any object type | When you need to create a custom record | `objectSlug`: Object type, `recordData`: Record attributes |
| `get-record` | Get a generic record by ID | When you need to retrieve a record by ID | `objectSlug`: Object type, `recordId`: Record ID |
| `update-record` | Update a generic record | When you need to modify an existing record | `objectSlug`: Object type, `recordId`: Record ID, `recordData`: Updated attributes |
| `delete-record` | Delete a generic record | When you need to remove a record | `objectSlug`: Object type, `recordId`: Record ID |
| `list-records` | List records of a specific object type | When you need to list records of a specific type | `objectSlug`: Object type |

## Object-Specific Operations

### People Operations

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `create-person` | Create a new person record | When you need to add a person to the system | `attributes`: Person attributes |
| `update-person` | Update an existing person record | When you need to modify a person's information | `personId`: Person ID, `attributes`: Updated attributes |
| `delete-person` | Delete a person record | When you need to remove a person | `personId`: Person ID |

### Company Operations

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `create-company` | Create a new company record | When you need to add a company to the system | `attributes`: Company attributes |
| `update-company` | Update an existing company record | When you need to modify a company's information | `companyId`: Company ID, `attributes`: Updated attributes |
| `update-company-attribute` | Update a specific attribute of a company | When you need to modify just one field | `companyId`: Company ID, `attributeName`: Name of attribute, `value`: New value |
| `delete-company` | Delete a company record | When you need to remove a company | `companyId`: Company ID |

### Batch Company Operations

| Tool Name | Description | When to Use | Key Parameters |
|-----------|-------------|------------|----------------|
| `batch-create-companies` | Create multiple companies in a single operation | When you need to add many companies at once | `companies`: Array of company data |
| `batch-update-companies` | Update multiple companies in a single operation | When you need to modify many companies at once | `updates`: Array of company updates with IDs |
| `batch-delete-companies` | Delete multiple companies in a single operation | When you need to remove many companies at once | `companyIds`: Array of company IDs |
| `batch-search-companies` | Perform multiple company searches at once | When you need to run multiple search queries | `queries`: Array of search terms |
| `batch-get-company-details` | Get details for multiple companies at once | When you need details for many companies | `companyIds`: Array of company IDs |

## Search Tool Comparison

### `search-people` vs `advanced-search-people`

The main differences between these tools are:

1. **Search Scope**:
   - `search-people`: General search across common fields (name, email, phone)
   - `advanced-search-people`: Can search across any attribute with precise control

2. **Filtering Capabilities**:
   - `search-people`: Simple text match, primarily for names
   - `advanced-search-people`: Complex filters with multiple conditions and operators

3. **Input Structure**:
   - `search-people`: Simple string query
   - `advanced-search-people`: Structured filter object with conditions

4. **When to Use Each**:
   - Use `search-people` for quick, simple searches by name, email, or phone
   - Use `advanced-search-people` when you need precise filtering with multiple criteria, logical operators, or specific attribute matching

### `search-companies` vs `advanced-search-companies`

Similar differences apply to company search tools:

1. **Search Scope**:
   - `search-companies`: Primarily searches company names
   - `advanced-search-companies`: Can search across any company attribute

2. **Filtering Capabilities**:
   - `search-companies`: Simple text match on company name
   - `advanced-search-companies`: Complex filters with multiple conditions and operators

3. **When to Use Each**:
   - Use `search-companies` for quick searches by company name
   - Use `advanced-search-companies` for precise filtering by industry, size, revenue, etc.

## Best Practices

1. **Start Simple**: Begin with the basic search tools. If your search needs are straightforward, they provide the simplest interface.

2. **Use Advanced Search Thoughtfully**: The advanced search tools are powerful but require more complex input. Use them when you need precise filtering or multiple conditions.

3. **Relationship Filtering**: When searching for people related to companies or in lists, use the specialized relationship search tools rather than trying to construct complex filters.

4. **Date-Based Searching**: For time-sensitive queries, use the date-specific search tools which handle date formatting and relative date expressions.

5. **Consider Performance**: More complex filters may take longer to process. When possible, use more specific filters to reduce the result set size.

6. **Tool Selection Guide**:
   - For general searches: Use basic search tools
   - For multi-criteria searches: Use advanced search tools
   - For date-based filters: Use date-specific search tools
   - For relationship-based queries: Use relationship search tools