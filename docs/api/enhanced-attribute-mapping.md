# Enhanced Attribute Mapping System

The enhanced attribute mapping system provides robust matching between human-readable attribute names and their corresponding API slugs. This system allows users to use natural language attribute names in queries and filters, which are automatically translated to the technical slugs required by the Attio API.

## Key Features

### 1. Tiered Matching Approach

The system uses a tiered approach to attribute name matching:

1. **Special Case Handling**: Direct handling for common problematic attributes
2. **Object-Specific Matching**: Checks object-specific mappings first (e.g., different mappings for companies vs. people)
3. **Custom and Common Mappings**: Checks user-defined custom mappings, then common mappings
4. **Legacy Compatibility**: Falls back to legacy mappings for backward compatibility
5. **Normalized Matching**: Removes spaces and performs case-insensitive matching
6. **Aggressive Normalization**: Removes all non-alphanumeric characters for more fuzzy matching
7. **Smart Snake Case Handling**: Detects snake_case input and converts to proper case for lookup

### 2. Special Case Handling

Special case handling has been added for attributes that commonly cause mapping issues:

- `B2B Segment` / `b2b_segment` / `b2bsegment` / etc. → `type_persona`
- Additional common variations are handled for frequently used attributes

#### Special Field Handling

Some fields require special handling. For example, the "type_persona" field (B2B Segment) requires a special shorthand filter format. Instead of using operators like "$equals", this field uses direct value assignment. The system automatically handles this field using the Attio shorthand format. Two helper functions are provided to simplify B2B Segment filtering:

```typescript
// In utils/filter-utils.js
export function createB2BSegmentFilter(
  value: string
): ListEntryFilters {
  // Creates a filter specifically for B2B Segment
}

// Or in objects/companies.js
export function createB2BSegmentFilter(
  segment: string
): ListEntryFilters {
  // Creates the same filter, but imported from the companies module
}
```

### 3. Detailed Logging

In development mode, the system provides detailed logging to help debug mapping issues:

- Which matching tier was successful
- Input and output attribute names
- Mapping path for complex cases

## Using the Attribute Mapping System

The attribute mapping system works automatically when using filters in API queries. You can use human-readable attribute names and they will be translated to the corresponding API slugs.

### Examples

```javascript
// Using human-readable attribute names in filters
const filters = {
  filters: [
    {
      attribute: {
        slug: "B2B Segment"  // Will be translated to "type_persona"
      },
      condition: "equals",   // We'll automatically use the correct operator for type_persona
      value: "Enterprise"
    },
    {
      attribute: {
        slug: "Title"  // Will be translated to "title"
      },
      condition: "contains",
      value: "CEO"
    }
  ]
};

// RECOMMENDED: Use the helper function for B2B Segment filtering
import { createB2BSegmentFilter } from '../utils/filter-utils.js';
const enterpriseFilter = createB2BSegmentFilter('Enterprise');
const titleFilter = createContainsFilter('title', 'CEO');
const combinedFilter = combineFiltersWithAnd(enterpriseFilter, titleFilter);
```

## Extending the Mapping System

### Adding Special Cases

Special case mappings can be extended in the `handleSpecialCases` function in `src/utils/attribute-mapping/mapping-utils.ts`:

```typescript
export function handleSpecialCases(key: string): string | undefined {
  // Convert to lowercase for consistency
  const lowerKey = key.toLowerCase();
  
  // Map of special cases with their mappings
  const specialCases: Record<string, string> = {
    'b2b_segment': 'type_persona',
    'b2b segment': 'type_persona',
    // Add new special cases here:
    'your_special_case': 'corresponding_slug',
  };
  
  // ...
}
```

### Adding Custom Mappings

Custom mappings can be added to your `config/mappings/user.json` file:

```json
{
  "version": "1.0",
  "mappings": {
    "attributes": {
      "custom": {
        "My Custom Name": "technical_slug"
      }
    }
  }
}
```

## Troubleshooting

If attribute mapping is not working as expected:

1. Enable development mode to see detailed logging: `NODE_ENV=development`
2. Check the logs for mapping information showing input and output attribute names
3. Consider adding a special case if a common attribute consistently fails to map
4. Update your custom mappings in `config/mappings/user.json`

## Performance Considerations

The enhanced attribute mapping system uses caching to maintain performance:

- Mappings are cached in memory for fast lookup
- Different cache types are used for different matching tiers
- The system falls back to more aggressive matching only when needed

For large-scale applications with frequent attribute mapping needs, consider:

1. Adding more direct mappings in your `config/mappings/user.json` file
2. Adding special cases for frequently used attributes
3. Optionally modifying your queries to use direct slugs for performance-critical paths