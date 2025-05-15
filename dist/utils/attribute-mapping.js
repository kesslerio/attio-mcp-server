/**
 * Utility module for mapping human-readable attribute names to Attio API slugs
 * This helps bridge the gap between user-friendly inputs and API requirements
 */
import { loadMappingConfig } from './config-loader.js';
/**
 * Legacy mapping for backward compatibility
 * This is kept for reference and to ensure backward compatibility
 */
const LEGACY_ATTRIBUTE_MAP = {
    // Company attributes
    'Name': 'name',
    'Website': 'website',
    'Industry': 'industry',
    'Revenue': 'annual_revenue',
    'Annual Revenue': 'annual_revenue',
    'Employee Count': 'employee_count',
    'Employees': 'employee_count',
    'Company Name': 'name',
    'Company Website': 'website',
    'B2B Segment': 'type_persona',
    'Type Persona': 'type_persona',
    'Created At': 'created_at',
    'Updated At': 'updated_at',
    'Last Interaction': 'last_interaction',
    'Interaction Type': 'interaction_type',
    'Company Type': 'company_type',
    'Notes': 'notes',
    'Address': 'address',
    'City': 'city',
    'State': 'state',
    'Country': 'country',
    'ZIP': 'zip',
    'Postal Code': 'zip',
    // People attributes 
    'First Name': 'first_name',
    'Last Name': 'last_name',
    'Full Name': 'name',
    'Email': 'email',
    'Phone': 'phone',
    'Mobile': 'mobile',
    'Title': 'title',
    'Job Title': 'title',
    'Position': 'title',
    'Department': 'department',
    'Company': 'company',
    // General attributes (date-based)
    'Created': 'created_at',
    'Modified': 'updated_at',
    'Updated': 'updated_at',
    'Last Activity': 'last_interaction'
};
// For backward compatibility
export const COMMON_ATTRIBUTE_MAP = LEGACY_ATTRIBUTE_MAP;
// Cache the config to avoid repeatedly loading from disk
let cachedConfig = null;
/**
 * Gets the mapping configuration, loading it from disk if necessary
 */
function getConfig() {
    // Always reload the config in test environment to get fresh mocks
    if (!cachedConfig || process.env.NODE_ENV === 'test') {
        try {
            cachedConfig = loadMappingConfig();
        }
        catch (error) {
            console.warn('Failed to load mapping configuration:', error);
            // Create a simple config using the legacy map for backward compatibility
            cachedConfig = {
                version: '1.0',
                mappings: {
                    attributes: {
                        common: { ...LEGACY_ATTRIBUTE_MAP },
                        objects: {},
                        custom: {}
                    },
                    objects: {},
                    lists: {},
                    relationships: {}
                }
            };
        }
    }
    return cachedConfig;
}
/**
 * Looks up a human-readable attribute name and returns the corresponding slug
 *
 * @param attributeName - The user-provided attribute name
 * @param objectType - Optional object type for object-specific mappings
 * @returns The slug if found, or the original attributeName if not mapped
 */
export function getAttributeSlug(attributeName, objectType) {
    if (!attributeName)
        return attributeName;
    try {
        const config = getConfig();
        // First check object-specific mappings if objectType is provided
        if (objectType &&
            config.mappings.attributes.objects[objectType]) {
            // Try direct match in object-specific mappings
            if (config.mappings.attributes.objects[objectType][attributeName]) {
                return config.mappings.attributes.objects[objectType][attributeName];
            }
            // Try case-insensitive match in object-specific mappings
            const lowerAttrName = attributeName.toLowerCase();
            for (const [key, value] of Object.entries(config.mappings.attributes.objects[objectType])) {
                if (key.toLowerCase() === lowerAttrName) {
                    return value;
                }
            }
        }
        // Then check custom mappings
        if (config.mappings.attributes.custom[attributeName]) {
            return config.mappings.attributes.custom[attributeName];
        }
        // Try case-insensitive match in custom mappings
        const lowerAttrName = attributeName.toLowerCase();
        for (const [key, value] of Object.entries(config.mappings.attributes.custom)) {
            if (key.toLowerCase() === lowerAttrName) {
                return value;
            }
        }
        // Then check common mappings in the config
        if (config.mappings.attributes.common[attributeName]) {
            return config.mappings.attributes.common[attributeName];
        }
        // Try case-insensitive match in common mappings
        for (const [key, value] of Object.entries(config.mappings.attributes.common)) {
            if (key.toLowerCase() === lowerAttrName) {
                return value;
            }
        }
    }
    catch (error) {
        // If there's an error with the config, fall back to legacy behavior
        console.warn('Error using config for attribute mapping, falling back to legacy behavior:', error);
    }
    // Fall back to legacy mapping with exact match (case-sensitive)
    if (LEGACY_ATTRIBUTE_MAP[attributeName]) {
        return LEGACY_ATTRIBUTE_MAP[attributeName];
    }
    // Then try case-insensitive match in legacy mappings
    const lowerName = attributeName.toLowerCase();
    for (const [key, value] of Object.entries(LEGACY_ATTRIBUTE_MAP)) {
        if (key.toLowerCase() === lowerName) {
            return value;
        }
    }
    // Finally, try to match with spaces removed and case-insensitive
    const normalizedName = lowerName.replace(/\s+/g, '');
    for (const [key, value] of Object.entries(LEGACY_ATTRIBUTE_MAP)) {
        if (key.toLowerCase().replace(/\s+/g, '') === normalizedName) {
            return value;
        }
    }
    // If no match found, return the original
    return attributeName;
}
/**
 * Processes a filter structure to translate any human-readable attribute names to their slug equivalents
 *
 * @param filters - The filters object possibly containing human-readable attribute names
 * @param objectType - Optional object type for more specific attribute mapping
 * @returns A new filters object with attribute names translated to slugs where applicable
 */
export function translateAttributeNamesInFilters(filters, objectType) {
    if (!filters || typeof filters !== 'object') {
        return filters;
    }
    // Handle array of filters
    if (Array.isArray(filters)) {
        return filters.map(filter => translateAttributeNamesInFilters(filter, objectType));
    }
    // Deep clone the filters object to avoid modifying the original
    const translatedFilters = { ...filters };
    // Check if this is a direct filter object with attribute.slug
    if (translatedFilters.attribute && translatedFilters.attribute.slug) {
        // Determine the object type to use for translation
        // Priority: filter's own objectType > parent objectType > context objectType
        const typeToUse = translatedFilters.objectType || objectType;
        // Create a new object with translated slug
        return {
            ...translatedFilters,
            attribute: {
                ...translatedFilters.attribute,
                slug: getAttributeSlug(translatedFilters.attribute.slug, typeToUse)
            }
        };
    }
    // Process nested filter structure
    if (translatedFilters.filters && Array.isArray(translatedFilters.filters)) {
        translatedFilters.filters = translatedFilters.filters.map((filter) => {
            if (filter && filter.attribute && filter.attribute.slug) {
                // Determine the object type to use for this specific filter
                const typeToUse = filter.objectType || objectType;
                // Translate the attribute slug if it's a human-readable name
                return {
                    ...filter,
                    attribute: {
                        ...filter.attribute,
                        slug: getAttributeSlug(filter.attribute.slug, typeToUse)
                    }
                };
            }
            return translateAttributeNamesInFilters(filter, objectType);
        });
    }
    // Process all other properties (recursively)
    for (const key of Object.keys(translatedFilters)) {
        if (typeof translatedFilters[key] === 'object' && translatedFilters[key] !== null) {
            // Special handling for object-specific sections
            let typeToUse = objectType;
            // If this key is an object type (companies, people), use it as the type context for child filters
            if (key === 'companies' || key === 'people') {
                typeToUse = key;
            }
            // If this is a resource-specific section for a different object
            // (e.g., a companies section inside people filters), preserve the object context
            if (translatedFilters.objectType) {
                typeToUse = translatedFilters.objectType;
            }
            translatedFilters[key] = translateAttributeNamesInFilters(translatedFilters[key], typeToUse);
        }
    }
    return translatedFilters;
}
/**
 * Gets the slug for an object type (e.g., "Companies" -> "companies")
 *
 * @param objectName - The human-readable object name
 * @returns The corresponding slug, or the original name if not found
 */
export function getObjectSlug(objectName) {
    if (!objectName)
        return objectName;
    try {
        const config = getConfig();
        // Check mappings in the config
        if (config.mappings.objects[objectName]) {
            return config.mappings.objects[objectName];
        }
        // Try case-insensitive match
        const lowerName = objectName.toLowerCase();
        for (const [key, value] of Object.entries(config.mappings.objects)) {
            if (key.toLowerCase() === lowerName) {
                return value;
            }
        }
    }
    catch (error) {
        // If there's an error with the config, fall back to simple normalization
        console.warn('Error using config for object mapping:', error);
    }
    // If no match is found, convert to lowercase and remove spaces as a fallback
    return objectName.toLowerCase().replace(/\s+/g, '_');
}
/**
 * Gets the slug for a list name
 *
 * @param listName - The human-readable list name
 * @returns The corresponding slug, or the original name if not found
 */
export function getListSlug(listName) {
    if (!listName)
        return listName;
    try {
        const config = getConfig();
        // Clear the cache for testing purposes (this ensures we're using the latest mock)
        if (process.env.NODE_ENV === 'test') {
            cachedConfig = null;
        }
        // Check mappings in the config for exact match
        if (config.mappings.lists[listName]) {
            return config.mappings.lists[listName];
        }
        // Try case-insensitive match
        const lowerName = listName.toLowerCase();
        for (const [key, value] of Object.entries(config.mappings.lists)) {
            if (key.toLowerCase() === lowerName) {
                return value;
            }
        }
    }
    catch (error) {
        // If there's an error with the config, fall back to simple normalization
        console.warn('Error using config for list mapping:', error);
    }
    // If no match is found, return the original
    return listName;
}
//# sourceMappingURL=attribute-mapping.js.map