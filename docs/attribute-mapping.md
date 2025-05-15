# Attribute Mapping System

The Attio MCP Server includes a configurable attribute mapping system that translates human-readable attribute names to their corresponding Attio API slugs. This allows you to use natural language terms in your filters and queries, which are automatically converted to the correct API slugs.

## Overview

When interacting with the Attio API, attributes are identified by "slugs" (e.g., `type_persona`) rather than their display names (e.g., "B2B Segment"). The attribute mapping system provides:

1. **Default Mappings**: Common attributes like "Name" → "name" or "B2B Segment" → "type_persona"
2. **User-Configurable Mappings**: Custom mappings for your specific workspace
3. **Object-Specific Mappings**: Different mappings for different object types (companies, people, etc.)
4. **Discovery Tools**: CLI commands to discover attributes from your Attio workspace

## Implementation Details

The attribute mapping system consists of several core components:

### Configuration Loader (`src/utils/config-loader.ts`)

This module handles loading and merging configuration files:
- Loads default and user configurations
- Deep merges them with user settings taking precedence
- Provides error handling and fallbacks
- Exposes API for reading and updating configurations

### Attribute Mapping (`src/utils/attribute-mapping.ts`)

Performs the actual mapping of attribute names to slugs:
- Implements lookups with prioritized rules
- Supports object-specific and common mappings
- Maintains backward compatibility with legacy mappings
- Provides case-insensitive and normalized matching fallbacks
- Recursively processes complex filter structures

Key functions:
- `getAttributeSlug()`: Maps attribute names to slugs
- `getObjectSlug()`: Maps object names to slugs
- `getListSlug()`: Maps list names to slugs
- `translateAttributeNamesInFilters()`: Recursively translates filters

### Lookup Priority

Attribute slug lookups follow this priority order:

1. Object-specific mappings (e.g., companies.Name)
2. Custom mappings (for user-specific attributes)
3. Common mappings (shared across objects)
4. Legacy mappings (for backward compatibility)
5. Case-insensitive matching
6. Original input (fallback)

## Configuration Files

Mapping configuration is stored in JSON files in the `config/mappings/` directory:

- `default.json`: Default mappings that ship with the MCP server (don't modify)
- `user.json`: User-specific mappings (you can edit this or use discovery tools to generate it)
- `sample.json`: Sample configuration with examples and structure (reference only)

## Mapping Structure

The configuration files follow this structure:

```json
{
  "version": "1.0",
  "metadata": {
    "generated": "2025-05-14T00:00:00Z",
    "description": "Sample mappings"
  },
  "mappings": {
    "attributes": {
      "common": {
        "Name": "name",
        "Website": "website"
      },
      "objects": {
        "companies": {
          "B2B Segment": "type_persona"
        },
        "people": {
          "First Name": "first_name",
          "Last Name": "last_name"
        }
      },
      "custom": {
        "My Custom Field": "custom_field_slug"
      }
    },
    "objects": {
      "Companies": "companies",
      "People": "people"
    },
    "lists": {},
    "relationships": {}
  }
}
```

## Using the Discovery Tool

The MCP server includes CLI tools to automatically discover attributes from your Attio workspace and update your mappings:

### Discovering Attributes

```bash
# Discover attributes for a specific object type
npm run discover:attributes -- --object=companies

# Discover attributes for all object types
npm run discover:all-attributes

# Specify a custom output file
npm run discover -- attributes --object=people --output=my-config.json
```

### Advanced Options

```bash
# Reset existing mappings instead of merging
npm run discover -- attributes --object=companies --reset

# Provide API key directly (alternatively, set ATTIO_API_KEY env var)
npm run discover -- attributes --all --api-key=your_api_key
```

## Manual Configuration

You can also manually edit the configuration files:

1. Create a `config/mappings/user.json` file (or copy from `sample.json`)
2. Add your custom mappings
3. Restart the MCP server to apply the changes

## Usage in Filters

When using advanced search filters, you can now use human-readable attribute names, which will be automatically translated to the correct slugs:

```json
{
  "filters": {
    "filters": [
      {
        "attribute": {
          "slug": "B2B Segment"
        },
        "condition": "equals",
        "value": "Plastic Surgeon"
      }
    ],
    "matchAny": false
  }
}
```

The system will translate "B2B Segment" to "type_persona" automatically.

## Benefits

- **Improved Human Usability**: Use natural language terms instead of technical slugs
- **Custom Field Support**: Map your workspace-specific attributes easily
- **Maintenance-Free**: Automatic discovery keeps mappings up to date
- **Multiple Naming Conventions**: Support for different ways to reference the same field

## Troubleshooting

If you encounter issues with attribute mapping:

1. **Check Your Configuration**: Ensure your `user.json` file is correctly formatted
2. **Run Discovery Tool**: Use the discovery tool to update mappings from your Attio workspace
3. **Consult API Docs**: Check the Attio API documentation for the correct attribute slugs
4. **Debug Mode**: Enable debug mode to see the translation process: `export DEBUG=attio:attribute-mapping`