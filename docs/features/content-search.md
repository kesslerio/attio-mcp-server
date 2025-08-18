# Content Search Feature

## Overview

The Content Search feature (Issue #474) enables comprehensive full-text searching across multiple fields in Attio records. This goes beyond basic field matching to search within descriptions, notes, comments, and other text content.

## Features

- **Full-text search** across multiple fields
- **Partial word matching** for flexible searches
- **Relevance ranking** to surface the most relevant results
- **Case-insensitive** search for better usability
- **Field selection** to target specific content areas
- **Multiple resource types** supported (companies, people)

## Usage

### Basic Content Search

Search across all default content fields:

```javascript
// Search companies for content containing "artificial intelligence"
const results = await mcp.callTool('search-records', {
  resource_type: 'companies',
  query: 'artificial intelligence',
  search_type: 'content'
});
```

### Targeted Field Search

Search specific fields only:

```javascript
// Search only in description and notes fields
const results = await mcp.callTool('search-records', {
  resource_type: 'companies',
  query: 'machine learning',
  search_type: 'content',
  fields: ['description', 'notes']
});
```

### Partial Match Search

Find records with partial word matches:

```javascript
// Find records containing "automat" (matches "automation", "automatic", etc.)
const results = await mcp.callTool('search-records', {
  resource_type: 'companies',
  query: 'automat',
  search_type: 'content',
  match_type: 'partial'
});
```

### Exact Match Search

Search for exact field matches:

```javascript
// Find records with exact match
const results = await mcp.callTool('search-records', {
  resource_type: 'companies',
  query: 'Alpha Technologies',
  search_type: 'content',
  match_type: 'exact'
});
```

### Relevance-Ranked Results

Get results sorted by relevance:

```javascript
// Get results ranked by relevance score
const results = await mcp.callTool('search-records', {
  resource_type: 'companies',
  query: 'AI',
  search_type: 'content',
  sort: 'relevance'
});
```

## Searchable Fields by Resource Type

### Companies
- `name` - Company name
- `description` - Company description
- `notes` - Additional notes and comments

### People
- `name` - Person's full name
- `bio` - Biography or description
- `notes` - Additional notes
- `email_addresses` - Email addresses

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resource_type` | string | Yes | Type of resource to search (`companies`, `people`) |
| `query` | string | No | Search query text |
| `search_type` | string | No | Search type: `basic` (default) or `content` |
| `fields` | array | No | Specific fields to search (defaults to all content fields) |
| `match_type` | string | No | Match type: `partial` (default), `exact`, or `fuzzy` |
| `sort` | string | No | Sort order: `name` (default), `relevance`, `created`, or `modified` |
| `limit` | number | No | Maximum results to return (default: 10, max: 100) |
| `offset` | number | No | Number of results to skip for pagination (default: 0) |

## Relevance Scoring

The relevance ranking algorithm scores results based on:

1. **Exact matches** (100 points) - Query exactly matches field value
2. **Starts with query** (50 points) - Field value starts with the query
3. **Contains query** (25 points + 10 per additional occurrence)
4. **Partial word matches** (5 points per matching word)

Results are sorted by total score, with secondary sorting by name for equal scores.

## Examples

### Search for AI Companies

```javascript
// Find all companies working with AI
const aiCompanies = await mcp.callTool('search-records', {
  resource_type: 'companies',
  query: 'artificial intelligence OR machine learning OR AI',
  search_type: 'content',
  sort: 'relevance'
});
```

### Search People by Expertise

```javascript
// Find people with specific expertise
const experts = await mcp.callTool('search-records', {
  resource_type: 'people',
  query: 'neural networks',
  search_type: 'content',
  fields: ['bio', 'notes']
});
```

### Paginated Content Search

```javascript
// Get paginated results
const page1 = await mcp.callTool('search-records', {
  resource_type: 'companies',
  query: 'technology',
  search_type: 'content',
  limit: 20,
  offset: 0
});

const page2 = await mcp.callTool('search-records', {
  resource_type: 'companies',
  query: 'technology',
  search_type: 'content',
  limit: 20,
  offset: 20
});
```

## Performance Considerations

- Content search performs multiple field searches using the Attio API's advanced search
- Results are fetched from the API and then ranked client-side for relevance
- For large result sets, use pagination to improve performance
- The relevance ranking algorithm has O(n log n) complexity for sorting

## Limitations

- Content search is currently available for companies and people only
- Fuzzy matching is not yet implemented (reserved for future enhancement)
- Search is limited to text fields; structured data fields are not searched
- Maximum of 100 results per request due to API limits

## Migration from Basic Search

To migrate from basic search to content search:

```javascript
// Before (basic search - name field only)
const results = await mcp.callTool('search-records', {
  resource_type: 'companies',
  query: 'tech'
});

// After (content search - all text fields)
const results = await mcp.callTool('search-records', {
  resource_type: 'companies',
  query: 'tech',
  search_type: 'content'  // Add this parameter
});
```

## Testing

The content search functionality includes:
- Comprehensive unit tests in `test/services/content-search.test.ts`
- QA test script in `qa-test-474.js`
- Integration tests for real API calls

To run tests:
```bash
# Run unit tests
npm test test/services/content-search.test.ts

# Run QA test script
node qa-test-474.js
```