# Attribute Discovery and Mapping

The `attio-mcp-server` provides tools for discovering attributes from your Attio workspace and creating mappings between human-readable display names and API slugs. This document explains how to use those tools and how the attribute mapping system works.

## Understanding Attribute Mapping

The attribute mapping system allows users to use human-readable attribute names (like "B2B Segment") in queries and filters, which the system automatically translates to their corresponding API slugs (like "type_persona") based on configurable mappings.

### Key Concepts:

1. **Display Names vs. API Slugs**: 
   - Display names are human-readable (e.g., "B2B Segment")
   - API slugs are used in API requests (e.g., "type_persona")
   
2. **Mapping Files**:
   - Default mappings in `config/mappings/default.json`
   - User-specific mappings in `config/mappings/user.json`
   - The system merges these files with user mappings taking precedence

## Attribute Discovery Tool

The attribute discovery tool scans your Attio workspace to build mapping files automatically.

### Running the Discovery Tool

There are multiple ways to run the discovery tool:

#### 1. Using npm scripts

```bash
# Discover attributes for all objects
npm run discover:all-attributes

# Discover attributes with increased memory (recommended for large workspaces)
npm run discover:all-attributes:robust
```

#### 2. Using the CLI directly

```bash
# Discover attributes for a specific object
node dist/cli/discover.js attributes --object companies

# Discover attributes for all objects
node dist/cli/discover.js attributes --all

# Reset existing mappings instead of merging
node dist/cli/discover.js attributes --all --reset

# Output to a different file
node dist/cli/discover.js attributes --all --output my-mappings.json
```

## Troubleshooting

If the attribute discovery reports "No attributes found" for objects, check the following:

1. **API Key**: Verify your API key has sufficient permissions. The key should be set in your `.env` file as `ATTIO_API_KEY`.

2. **API Responses**: If you're getting a 200 response from the API but no attributes are found, this could be due to:
   - API response format changes
   - Empty attributes in your workspace
   - Permissions issues with your API key

3. **Direct API Check**: You can directly test the API with curl to see the raw response:

   ```bash
   curl -s -X GET -H "Authorization: Bearer YOUR_API_KEY" https://api.attio.com/v2/objects/companies/attributes
   ```

4. **Workspace Configuration**: Make sure your Attio workspace has attributes defined for the objects you're trying to discover.

## Using Custom Mappings

If automatic discovery doesn't work, you can manually create mappings:

1. Create or edit `config/mappings/user.json` with your mappings:

```json
{
  "version": "1.0",
  "mappings": {
    "attributes": {
      "common": {
        "Name": "name",
        "Email": "email"
      },
      "objects": {
        "companies": {
          "B2B Segment": "type_persona",
          "Company Type": "company_type"
        },
        "people": {
          "First Name": "first_name",
          "Last Name": "last_name"
        }
      },
      "custom": {}
    }
  }
}
```

2. The system will use these mappings to translate between human-readable names and API slugs in queries and filters.

## API Path Structure

For reference, here are the relevant API endpoints used by the discovery tool:

- List all objects: `GET https://api.attio.com/v2/objects`
- Get attributes for a specific object: `GET https://api.attio.com/v2/objects/{objectSlug}/attributes`

The discovery tool uses the title field from each attribute as the human-readable name and the api_slug field as the technical identifier.