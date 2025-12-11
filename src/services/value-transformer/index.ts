/**
 * Value Transformer Service
 *
 * Orchestrates automatic value transformations before API calls to prevent
 * common LLM errors when creating/updating records.
 *
 * Transformations:
 * - Status fields: "Demo Scheduling" → {status_id: "uuid"}
 * - Multi-select fields: "Inbound" → ["Inbound"]
 *
 * @module services/value-transformer
 */

import {
  TransformContext,
  RecordTransformResult,
  FieldTransformation,
  AttributeMetadata,
} from './types.js';
import {
  transformStatusValue,
  clearStatusCache,
} from './status-transformer.js';
import { transformMultiSelectValue } from './multi-select-transformer.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { handleUniversalDiscoverAttributes } from '@/handlers/tool-configs/universal/shared-handlers.js';
import { debug, error as logError, OperationType } from '@/utils/logger.js';

// Re-export types
export * from './types.js';
export { clearStatusCache };

/**
 * Cache for attribute metadata to avoid repeated API calls
 */
const attributeMetadataCache = new Map<
  string,
  Map<string, AttributeMetadata>
>();

/**
 * Clear all transformer caches (useful for testing)
 */
export function clearAllCaches(): void {
  attributeMetadataCache.clear();
  clearStatusCache();
}

/**
 * Get attribute metadata for a resource type with caching
 */
async function getAttributeMetadata(
  resourceType: UniversalResourceType
): Promise<Map<string, AttributeMetadata>> {
  const cacheKey = resourceType.toLowerCase();

  if (attributeMetadataCache.has(cacheKey)) {
    return attributeMetadataCache.get(cacheKey)!;
  }

  const metadataMap = new Map<string, AttributeMetadata>();

  try {
    const schema = await handleUniversalDiscoverAttributes(resourceType);
    const allAttrs = ((schema as Record<string, unknown>).all || []) as Array<{
      api_slug?: string;
      slug?: string;
      type?: string;
      title?: string;
      is_system_attribute?: boolean;
      is_writable?: boolean;
      is_multiselect?: boolean;
    }>;

    for (const attr of allAttrs) {
      const slug = attr.api_slug || attr.slug || '';
      if (slug) {
        metadataMap.set(slug, {
          slug,
          type: attr.type || 'unknown',
          title: attr.title,
          api_slug: attr.api_slug,
          is_system_attribute: attr.is_system_attribute,
          is_writable: attr.is_writable,
          is_multiselect: attr.is_multiselect,
        });
      }
    }

    attributeMetadataCache.set(cacheKey, metadataMap);
  } catch (err) {
    logError(
      'value-transformer',
      `Failed to fetch attribute metadata for ${resourceType}`,
      err
    );
  }

  return metadataMap;
}

/**
 * Transform record values before API call
 *
 * @param recordData - The record data to transform
 * @param context - Transformation context (resourceType, operation, recordId)
 * @returns Transformed record data with transformation details
 */
export async function transformRecordValues(
  recordData: Record<string, unknown>,
  context: TransformContext
): Promise<RecordTransformResult> {
  const transformations: FieldTransformation[] = [];
  const warnings: string[] = [];
  const transformedData: Record<string, unknown> = {};

  // Get attribute metadata for this resource type
  const attributeMetadata = await getAttributeMetadata(context.resourceType);

  debug(
    'value-transformer',
    `Starting transformation for ${context.resourceType}`,
    {
      operation: context.operation,
      fieldCount: Object.keys(recordData).length,
      knownAttributes: attributeMetadata.size,
    },
    'transformRecordValues',
    OperationType.DATA_PROCESSING
  );

  // Process each field
  for (const [field, value] of Object.entries(recordData)) {
    const attrMeta = attributeMetadata.get(field);

    // If no metadata found, pass through unchanged
    if (!attrMeta) {
      transformedData[field] = value;
      continue;
    }

    // Try status transformation
    try {
      const statusResult = await transformStatusValue(
        value,
        field,
        context,
        attrMeta
      );

      if (statusResult.transformed) {
        transformedData[field] = statusResult.transformedValue;
        transformations.push({
          field,
          from: statusResult.originalValue,
          to: statusResult.transformedValue,
          type: 'status_title_to_id',
          description: statusResult.description || 'Status value transformed',
        });
        continue;
      }
    } catch (err) {
      // Status transformation threw an error (invalid value)
      throw err;
    }

    // Try multi-select transformation
    try {
      const multiSelectResult = await transformMultiSelectValue(
        value,
        field,
        context,
        attrMeta
      );

      if (multiSelectResult.transformed) {
        transformedData[field] = multiSelectResult.transformedValue;
        transformations.push({
          field,
          from: multiSelectResult.originalValue,
          to: multiSelectResult.transformedValue,
          type: 'multi_select_wrap',
          description:
            multiSelectResult.description || 'Multi-select value wrapped',
        });
        continue;
      }
    } catch (err) {
      // Multi-select transformation threw an error
      throw err;
    }

    // No transformation applied, pass through unchanged
    transformedData[field] = value;
  }

  // Log transformation summary
  if (transformations.length > 0) {
    debug(
      'value-transformer',
      `Completed transformation`,
      {
        transformationCount: transformations.length,
        transformations: transformations.map((t) => ({
          field: t.field,
          type: t.type,
        })),
      },
      'transformRecordValues',
      OperationType.DATA_PROCESSING
    );
  }

  return {
    data: transformedData,
    transformations,
    warnings,
  };
}

/**
 * Check if a record has fields that may need transformation
 * (Quick check without actually fetching metadata)
 *
 * TRADE-OFF: This function is intentionally PERMISSIVE.
 *
 * Issue #992: We can't know which custom fields are multi-select without fetching
 * metadata from the API. Rather than miss a multi-select field and cause an API
 * error, we trigger transformation for any unknown string field.
 *
 * Implications:
 * - Some fields will trigger transformation unnecessarily (false positives)
 * - First request per resource type incurs metadata API call (then cached)
 * - This is better than the alternative: silent failures on custom multi-selects
 *
 * Tuning levers if performance becomes an issue:
 * - Expand `definitelyNotMultiSelect` with common text field patterns
 * - Monitor false-positive rate via logging
 * - Consider workspace-specific caching of field types
 */
export function mayNeedTransformation(
  recordData: Record<string, unknown>,
  resourceType: UniversalResourceType
): boolean {
  // Known status fields by resource type
  const statusFields: Record<string, string[]> = {
    deals: ['stage'],
    tasks: ['status'],
  };

  // Known multi-select fields (workspace-specific, so we check common patterns)
  // Issue #992: Added 'channel' based on user feedback
  const multiSelectIndicators = [
    'categories',
    'tags',
    'types',
    'lead_type',
    'inbound_outbound',
    'channel', // Added per Issue #992 feedback
  ];

  // Fields that are definitely NOT multi-select (optimization to avoid unnecessary API calls)
  const definitelyNotMultiSelect = [
    'name',
    'description',
    'notes',
    'email',
    'phone',
    'website',
    'domain',
    'address',
    'title',
    'content',
    'id',
    'record_id',
  ];

  const resourceKey = resourceType.toLowerCase();
  const knownStatusFields = statusFields[resourceKey] || [];

  for (const field of Object.keys(recordData)) {
    const value = recordData[field];
    const fieldLower = field.toLowerCase();

    // Skip null/undefined/array values - they don't need transformation
    if (value === null || value === undefined || Array.isArray(value)) {
      continue;
    }

    // Check if it's a known status field with a string value
    if (knownStatusFields.includes(field) && typeof value === 'string') {
      return true;
    }

    // Check if it matches known multi-select indicator patterns
    if (
      multiSelectIndicators.some((indicator) => fieldLower.includes(indicator))
    ) {
      return true;
    }

    // Issue #992: For any string value on a field that's NOT definitely-not-multi-select,
    // trigger transformation to let the actual metadata check determine if it's multi-select
    if (
      typeof value === 'string' &&
      !definitelyNotMultiSelect.some((safe) => fieldLower.includes(safe))
    ) {
      // This is a potential multi-select field - trigger full transformation
      return true;
    }
  }

  return false;
}
