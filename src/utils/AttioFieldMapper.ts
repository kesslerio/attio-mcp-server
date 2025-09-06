/**
 * Attio Field Name Mapper
 *
 * Maps generic field names to Attio-specific field names
 * Provides deprecation warnings for unsupported aliases
 */

export const FIELD_MAPPINGS = {
  timestamp: {
    created: 'created_at',
    modified: 'modified_at',
    updated: 'modified_at', // Alias - Attio uses modified_at
    interacted: 'interacted_at',
  },
  system: {
    id: 'record_id',
    workspace: 'workspace_id',
    object: 'object_id',
  },
} as const;

/**
 * Deprecated field mappings that should show warnings
 */
const DEPRECATED_FIELDS: Record<string, string> = {
  updated_at: 'modified_at',
  update_date: 'modified_at',
  last_updated: 'modified_at',
};

/**
 * Map generic field name to Attio-specific field name
 * Logs deprecation warnings for unsupported aliases
 */
export function mapFieldName(genericField: string): string {
  // Check for deprecated mappings
  const deprecated = DEPRECATED_FIELDS[genericField];
  if (deprecated) {
    console.warn(
      `[AttioFieldMapper] Deprecated field '${genericField}' used. Use '${deprecated}' instead. Attio API uses '${deprecated}' for timestamp fields.`
    );
    return deprecated;
  }

  // Search in timestamp mappings
  for (const [key, value] of Object.entries(FIELD_MAPPINGS.timestamp)) {
    if (key === genericField) {
      return value;
    }
  }

  // Search in system mappings
  for (const [key, value] of Object.entries(FIELD_MAPPINGS.system)) {
    if (key === genericField) {
      return value;
    }
  }

  // Return as-is if no mapping found (might be valid Attio field)
  return genericField;
}

/**
 * Get all valid timestamp field names for a given resource
 * Different resources may support different timestamp fields
 */
export function getValidTimestampFields(resourceType: string): string[] {
  const baseFields = ['created_at', 'modified_at'];

  switch (resourceType) {
    case 'companies':
    case 'people':
      return [...baseFields, 'interacted_at'];
    case 'tasks':
      return [...baseFields, 'due_date', 'completed_at'];
    case 'notes':
      return baseFields; // Notes typically only have created_at/modified_at
    default:
      return baseFields;
  }
}

/**
 * Validate if a field name is supported for timeframe filtering
 */
export function isValidTimestampField(
  fieldName: string,
  resourceType: string
): boolean {
  const validFields = getValidTimestampFields(resourceType);
  return validFields.includes(fieldName);
}
