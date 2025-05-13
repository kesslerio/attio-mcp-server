# Attio Companies API

The Companies API allows you to manage company records in Attio. Companies are a standard object type that represents organizations in your CRM.

## Using Claude with the Companies API

Claude can help you interact with company records in Attio through the MCP server. Here are some common tasks and example prompts:

### Advanced Filtering Capabilities

The MCP server now provides enhanced filtering capabilities for company records through the `advanced-search-companies` tool. This feature supports:

- Complex filtering with multiple conditions
- Logical operators (AND/OR)
- All comparison operators (equals, contains, starts_with, etc.)
- Filtering by any company attribute including name, website, and industry

See the [Advanced Filtering documentation](./advanced-filtering.md) for detailed information about these capabilities.

### Searching for Companies

You can ask Claude to search for companies using various criteria:

```
Find companies in the technology industry
```

```
Search for companies with "software" in their name
```

```
Look up Microsoft in our CRM
```

### Viewing Company Details

Once Claude has found a company, you can ask for specific details:

```
Tell me more about attio://companies/record_01abcdefghijklmnopqrstuv
```

```
What's the website for Acme Corporation?
```

### Working with Company Notes

Claude can read and create notes for companies:

```
What are the recent notes for Acme Corporation?
```

```
Add a note to Microsoft about our recent sales call
```

### Example Workflow

Here's an example of a complete workflow with Claude:

1. **Search**: "Find technology companies we added in the last month"
2. **Select**: "Tell me more about NewTech Inc."
3. **Notes**: "What notes do we have for them?"
4. **Create**: "Add a note that they're interested in our enterprise plan"

## Version Information
- **API Version**: v2
- **Last Updated**: 2023-07-10

## Required Scopes

Companies operations require the following scopes:
- `companies:read` - For reading company records
- `companies:read-write` - For creating, updating, or deleting company records

## Endpoints

### List Companies

```
GET /v2/companies
```

Retrieves a list of companies with pagination support.

#### Query Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| page      | number | Page number to retrieve (starting at 1) |
| pageSize  | number | Number of items per page (default 25, max 100) |
| sort      | string | Field to sort by (e.g., 'name', 'created_at') |
| order     | string | Sort order ('asc' or 'desc', default 'asc') |
| query     | string | Full-text search query |
| filter    | object | Filter criteria in JSON format |

#### Response

```json
{
  "data": [
    {
      "id": "company_01abcdefghijklmnopqrstuv",
      "attributes": {
        "name": {
          "value": "Acme Corporation"
        },
        "domain": {
          "value": "acme.com"
        },
        "industry": {
          "value": "Technology"
        },
        "created_at": {
          "value": "2023-01-15T09:30:00.000Z"
        }
      }
    },
    {
      "id": "company_01wxyzabcdefghijklmnopq",
      "attributes": {
        "name": {
          "value": "XYZ Industries"
        },
        "domain": {
          "value": "xyzindustries.com"
        },
        "industry": {
          "value": "Manufacturing"
        },
        "created_at": {
          "value": "2023-02-20T14:45:00.000Z"
        }
      }
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 52
  }
}
```

### Get Company

```
GET /v2/companies/{company_id}
```

Retrieves a specific company by ID.

#### Path Parameters

| Parameter  | Type   | Description |
|------------|--------|-------------|
| company_id | string | The ID of the company to retrieve |

#### Response

```json
{
  "id": "company_01abcdefghijklmnopqrstuv",
  "attributes": {
    "name": {
      "value": "Acme Corporation"
    },
    "domain": {
      "value": "acme.com"
    },
    "description": {
      "value": "A leading provider of innovative solutions."
    },
    "industry": {
      "value": "Technology"
    },
    "size": {
      "value": "501-1000"
    },
    "linkedin_url": {
      "value": "https://www.linkedin.com/company/acme-corp"
    },
    "website": {
      "value": "https://www.acme.com"
    },
    "location": {
      "value": {
        "street": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "postal_code": "94105",
        "country": "United States"
      }
    },
    "created_at": {
      "value": "2023-01-15T09:30:00.000Z"
    },
    "updated_at": {
      "value": "2023-06-10T16:20:00.000Z"
    }
  }
}
```

### Create Company

```
POST /v2/companies
```

Creates a new company record.

#### Request Body

```json
{
  "attributes": {
    "name": {
      "value": "New Horizons Ltd"
    },
    "domain": {
      "value": "newhorizons.com"
    },
    "industry": {
      "value": "Consulting"
    },
    "website": {
      "value": "https://www.newhorizons.com"
    },
    "location": {
      "value": {
        "city": "London",
        "country": "United Kingdom"
      }
    }
  }
}
```

#### Response

Returns the created company with a 201 status code.

### Update Company

```
PATCH /v2/companies/{company_id}
```

Updates an existing company record.

#### Path Parameters

| Parameter  | Type   | Description |
|------------|--------|-------------|
| company_id | string | The ID of the company to update |

#### Request Body

```json
{
  "attributes": {
    "industry": {
      "value": "Technology Consulting"
    },
    "size": {
      "value": "51-200"
    }
  }
}
```

#### Response

Returns the updated company record.

### Delete Company

```
DELETE /v2/companies/{company_id}
```

Deletes a company record.

#### Path Parameters

| Parameter  | Type   | Description |
|------------|--------|-------------|
| company_id | string | The ID of the company to delete |

#### Response

Returns a 204 status code with no content on success.

### Search Companies

```
POST /v2/companies/search
```

Performs an advanced search for companies.

#### Request Body

```json
{
  "query": "technology",
  "filters": [
    {
      "attribute": "industry",
      "operator": "contains",
      "value": "tech"
    },
    {
      "attribute": "size",
      "operator": "equals",
      "value": "501-1000"
    }
  ],
  "sort": {
    "attribute": "created_at",
    "order": "desc"
  },
  "page": 1,
  "pageSize": 50
}
```

#### Response

Returns a list of matching companies with pagination.

## Standard Attributes

Companies in Attio have the following standard attributes:

| Attribute    | Data Type | Description |
|--------------|-----------|-------------|
| name         | text      | Company name (required) |
| domain       | text      | Primary domain name |
| description  | text      | Company description |
| industry     | select    | Industry category |
| size         | select    | Company size (number of employees) |
| linkedin_url | url       | LinkedIn company page URL |
| website      | url       | Company website URL |
| location     | object    | Company headquarters location |
| created_at   | date      | Record creation timestamp |
| updated_at   | date      | Record last update timestamp |

## Example Usage

### Searching for Companies by Domain with JavaScript (Node.js)

```javascript
const axios = require('axios');

async function findCompanyByDomain(domain) {
  try {
    const response = await axios.post('https://api.attio.com/v2/companies/search', {
      filters: [
        {
          attribute: "domain",
          operator: "equals",
          value: domain
        }
      ],
      pageSize: 1
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.data[0] || null;
  } catch (error) {
    console.error('Error searching for company:', error);
    return null;
  }
}

// Example usage
findCompanyByDomain('acme.com').then(company => {
  if (company) {
    console.log('Found company:', company.attributes.name.value);
  } else {
    console.log('No company found with that domain');
  }
});
```

### Creating a Company with TypeScript

```typescript
import axios from 'axios';
import { Company } from './types';

interface CompanyCreateParams {
  name: string;
  domain?: string;
  industry?: string;
  website?: string;
}

async function createCompany(params: CompanyCreateParams): Promise<Company> {
  const { name, domain, industry, website } = params;
  
  try {
    const response = await axios.post('https://api.attio.com/v2/companies', {
      attributes: {
        name: { value: name },
        ...(domain && { domain: { value: domain } }),
        ...(industry && { industry: { value: industry } }),
        ...(website && { website: { value: website } })
      }
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
}
```

## Error Handling

The Companies API uses standard HTTP status codes and returns detailed error information:

```json
{
  "error": {
    "type": "validation_error",
    "message": "Company name is required",
    "details": [
      {
        "field": "attributes.name",
        "message": "This field is required"
      }
    ]
  }
}
```

## Testing

When testing the Companies API, you can use the test mode with the test API key:

```javascript
// Headers for test mode
const headers = {
  'Authorization': 'Bearer YOUR_TEST_API_KEY',
  'Content-Type': 'application/json',
  'X-Attio-Mode': 'test'
};
```

All operations performed in test mode will be isolated from your production data.

## Related Resources

- [People API](./people-api.md) - For managing individual contacts
- [Objects API](./objects-api.md) - For customizing the Companies object schema
- [Lists API](./lists-api.md) - For managing custom views of Companies