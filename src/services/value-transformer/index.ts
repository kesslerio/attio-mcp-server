/**
 * Value Transformer Service
 *
 * Orchestrates automatic value transformations before API calls to prevent
 * common LLM errors when creating/updating records.
 *
 * Transformations:
 * - Status fields: "Demo Scheduling" → [{status: "uuid"}]
 * - Multi-select fields: "Inbound" → ["Inbound"]
 * - Record-reference fields: "uuid" → [{target_object: "X", target_record_id: "uuid"}] (Issue #997)
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
import {
  transformSelectValue,
  clearSelectCache,
} from './select-transformer.js';
import {
  transformRecordReferenceValue,
  isCorrectRecordReferenceFormat,
} from './record-reference-transformer.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { convertToMetadataMap } from '@/utils/metadata-utils.js';
import { handleUniversalDiscoverAttributes } from '@/handlers/tool-configs/universal/shared-handlers.js';
import { debug, error as logError, OperationType } from '@/utils/logger.js';
import { CachingService } from '@/services/CachingService.js';
import { DEFAULT_ATTRIBUTES_CACHE_TTL } from '@/constants/universal.constants.js';

// Re-export types
export * from './types.js';
export { clearStatusCache, clearSelectCache };

/**
 * Clear all transformer caches (useful for testing)
 * @see Issue #984 - Now uses CachingService instead of local cache
 */
export function clearAllCaches(): void {
  CachingService.clearAttributesCache();
  clearStatusCache();
  clearSelectCache();
}

/**
 * Get attribute metadata for a resource type with caching
 * @see Issue #984 - Now uses CachingService with TTL and accepts provided metadata
 */
async function getAttributeMetadata(
  resourceType: UniversalResourceType,
  providedMetadata?: Map<string, AttributeMetadata>
): Promise<Map<string, AttributeMetadata>> {
  // Use provided metadata if available (avoid duplicate fetch)
  if (providedMetadata && providedMetadata.size > 0) {
    debug(
      'value-transformer',
      'Using pre-fetched metadata from parent',
      { resourceType, attributeCount: providedMetadata.size },
      'getAttributeMetadata',
      OperationType.DATA_PROCESSING
    );
    return providedMetadata;
  }

  try {
    // Use CachingService with TTL instead of local cache
    const result = await CachingService.getOrLoadAttributes(
      async () => {
        const schema = await handleUniversalDiscoverAttributes(resourceType);
        return schema as Record<string, unknown>;
      },
      resourceType,
      undefined,
      DEFAULT_ATTRIBUTES_CACHE_TTL
    );

    debug(
      'value-transformer',
      'Fetched attribute metadata',
      {
        resourceType,
        fromCache: result.fromCache,
      },
      'getAttributeMetadata',
      OperationType.DATA_PROCESSING
    );

    return convertToMetadataMap(result.data);
  } catch (err) {
    logError(
      'value-transformer',
      `Failed to fetch attribute metadata for ${resourceType}`,
      err
    );
    return new Map();
  }
}

// Note: convertToMetadataMap() moved to @/utils/metadata-utils.js (PR #1006 Phase 2.1)
// This eliminates duplication between value-transformer and MetadataResolver

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
  // Issue #984: Use provided metadata if available to avoid duplicate API fetch
  const attributeMetadata = await getAttributeMetadata(
    context.resourceType,
    context.attributeMetadata
  );

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

    // Issue #1019: Try single-select transformation
    try {
      const selectResult = await transformSelectValue(
        value,
        field,
        context,
        attrMeta
      );

      if (selectResult.transformed) {
        transformedData[field] = selectResult.transformedValue;
        transformations.push({
          field,
          from: selectResult.originalValue,
          to: selectResult.transformedValue,
          type: 'select_title_to_id',
          description: selectResult.description || 'Select value transformed',
        });
        continue;
      }
    } catch (err) {
      // Select transformation threw an error
      throw err;
    }

    // Issue #997: Try record-reference transformation
    try {
      const refResult = await transformRecordReferenceValue(
        value,
        field,
        context,
        attrMeta
      );

      if (refResult.transformed) {
        transformedData[field] = refResult.transformedValue;
        transformations.push({
          field,
          from: refResult.originalValue,
          to: refResult.transformedValue,
          type: 'record_reference_format',
          description: refResult.description || 'Record reference formatted',
        });
        continue;
      }
    } catch (err) {
      // Record-reference transformation threw an error
      throw err;
    }

    // No transformation applied, pass through unchanged
    transformedData[field] = value;

    // Issue #992: Debug logging for false-positive measurement
    // Helps evaluate if mayNeedTransformation() is triggering too often for non-multi-select fields
    if (attrMeta && !attrMeta.is_multiselect && typeof value === 'string') {
      debug(
        'value-transformer',
        'Non-multi-select string field passed through unchanged',
        {
          field,
          resourceType: context.resourceType,
          attrType: attrMeta.type,
        },
        'transformRecordValues',
        OperationType.DATA_PROCESSING
      );
    }
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
 * Issue #997: Record-reference fields also need transformation to format
 * record IDs to [{target_object, target_record_id}] format.
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

  // Issue #997: Known record-reference fields by resource type
  const recordReferenceFields: Record<string, string[]> = {
    people: ['company'],
    deals: ['associated_company', 'associated_people'],
    companies: ['main_contact'],
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

  // Issue #997: Record-reference field name patterns
  const recordReferenceIndicators = [
    'company',
    'person',
    'people',
    'contact',
    'owner',
    'assignee',
    'associated_',
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
  const knownRefFields = recordReferenceFields[resourceKey] || [];

  for (const field of Object.keys(recordData)) {
    const value = recordData[field];
    const fieldLower = field.toLowerCase();

    // Skip null/undefined values - they don't need transformation
    if (value === null || value === undefined) {
      continue;
    }

    // Issue #997: Check if it's a known record-reference field that may need formatting
    // Record-reference fields can be strings, objects, or arrays - all may need transformation
    if (knownRefFields.includes(field)) {
      // Only skip if already in correct format (uses shared helper to avoid duplication)
      if (isCorrectRecordReferenceFormat(value)) {
        continue; // Already in correct format
      }
      return true;
    }

    // Skip arrays for other checks - they don't need multi-select transformation
    if (Array.isArray(value)) {
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

    // Issue #997: Check if field name suggests record-reference
    if (
      recordReferenceIndicators.some((indicator) =>
        fieldLower.includes(indicator)
      ) &&
      (typeof value === 'string' || typeof value === 'object')
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
