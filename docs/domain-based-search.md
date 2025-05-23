# Domain-Based Company Search Enhancement

## Overview

The Attio MCP server now includes enhanced company search functionality that automatically prioritizes domain-based matching when available. This ensures more accurate company identification by matching companies based on their website domains rather than just company names.

## Features

### Automatic Domain Detection
The search system automatically detects and extracts domains from various input formats:
- **Direct domains**: `example.com`
- **URLs**: `https://example.com/path`
- **Email addresses**: `user@example.com`
- **URLs with subdomains**: `www.example.com`

### Enhanced Search Functions

#### `searchCompanies(query, options?)`
The main search function now includes domain prioritization:
- When a domain is detected in the query, it searches by domain first
- Domain matches are returned before name-based matches
- Falls back to name-based search when no domain is found
- Supports configuration options for advanced control

```typescript
// Domain-based search (prioritized)
const results = await searchCompanies("stripe.com");

// Name-based search (fallback)
const results = await searchCompanies("Technology Solutions");

// Disable domain prioritization
const results = await searchCompanies("stripe.com", { prioritizeDomains: false });

// Limit results and enable debug logging
const results = await searchCompanies("stripe.com", { 
  maxResults: 10, 
  debug: true 
});
```

**Search Options:**
- `prioritizeDomains`: Enable/disable domain prioritization (default: `true`)
- `maxResults`: Maximum number of results to return
- `debug`: Enable debug logging (default: follows NODE_ENV)

#### `searchCompaniesByDomain(domain)`
Direct domain-only search for highest accuracy:
```typescript
const results = await searchCompaniesByDomain("example.com");
```

#### `smartSearchCompanies(query)`
Intelligent search that handles complex queries with multiple domains:
```typescript
const results = await smartSearchCompanies("Contact support@acme.com or visit stripe.com");
```

### New MCP Tools

#### `search-companies`
Enhanced with domain prioritization:
```json
{
  "name": "search-companies",
  "description": "Search for companies with automatic domain prioritization",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Company name, domain, URL, or email address"
      }
    }
  }
}
```

#### `search-companies-by-domain`
Direct domain search:
```json
{
  "name": "search-companies-by-domain",
  "inputSchema": {
    "properties": {
      "domain": {
        "type": "string",
        "description": "Domain to search for (e.g., 'example.com')"
      }
    }
  }
}
```

#### `smart-search-companies`
Multi-domain intelligent search:
```json
{
  "name": "smart-search-companies",
  "inputSchema": {
    "properties": {
      "query": {
        "type": "string",
        "description": "Complex query with names, domains, emails, or URLs"
      }
    }
  }
}
```

## Benefits

### Improved Accuracy
- **Exact domain matching** reduces false positives
- **Prioritized results** ensure most relevant companies appear first
- **Fallback mechanism** maintains functionality for name-based searches

### Better User Experience
- **Automatic detection** requires no special syntax
- **Multiple input formats** supported (domains, URLs, emails)
- **Consistent results** through domain normalization

### Enhanced CRM Operations
- **Lead qualification** through accurate company identification
- **Data enrichment** with precise company matching
- **Contact management** with reliable company associations

## Usage Examples

### Basic Domain Search
```typescript
// Input: "stripe.com"
// Returns: Companies with "stripe.com" in website field first
const companies = await searchCompanies("stripe.com");
```

### Email-Based Search
```typescript
// Input: "support@example.com"
// Extracts: "example.com"
// Returns: Companies with "example.com" domain
const companies = await searchCompanies("support@example.com");
```

### Mixed Content Search
```typescript
// Input: "Contact john@acme.com for Acme Corporation details"
// Extracts: "acme.com"
// Returns: Companies with "acme.com" domain first, then name matches
const companies = await smartSearchCompanies("Contact john@acme.com for Acme Corporation details");
```

### Complex Multi-Domain Search
```typescript
// Input: "Visit https://stripe.com or email support@example.com"
// Extracts: ["stripe.com", "example.com"]
// Returns: Companies from both domains, prioritized by extraction order
const companies = await smartSearchCompanies("Visit https://stripe.com or email support@example.com");
```

## Technical Implementation

### Domain Extraction
- **URL parsing** with proper hostname extraction
- **Email domain extraction** from email addresses
- **Domain validation** using regex patterns
- **Normalization** (lowercase, www removal)

### Search Prioritization
1. **Domain detection** in query
2. **Domain-based search** execution
3. **Name-based search** for additional results
4. **Result merging** with domain matches first
5. **Deduplication** by company ID

### Error Handling
- **Graceful fallback** to name search on domain search failure
- **Validation** of domain formats
- **Logging** of domain extraction and search operations

## Testing

### Unit Tests
- Domain extraction utility functions
- Validation and normalization logic
- Edge case handling

### Integration Tests
- Real API domain searches
- Search prioritization verification
- Tool configuration testing

### Manual Testing
Run the manual test script:
```bash
node test/manual/test-domain-based-company-search.js
```

## Configuration

The enhancement works automatically with existing configurations. No additional setup required beyond having a valid `ATTIO_API_KEY`.

## Related Files

- `src/utils/domain-utils.ts` - Domain extraction utilities
- `src/objects/companies/search.ts` - Enhanced search functions
- `src/handlers/tool-configs/companies/search.ts` - Tool configurations
- `test/manual/test-domain-based-company-search.js` - Manual testing
- `test/integration/domain-based-search.integration.test.ts` - Integration tests
- `test/utils/domain-utils.test.ts` - Unit tests