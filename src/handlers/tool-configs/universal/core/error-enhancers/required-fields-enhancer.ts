/**
 * Required Fields Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 *
 * Detects missing required fields and provides specific guidance,
 * especially for deal-specific required fields like "stage".
 */

import type { ErrorEnhancer, CrudErrorContext } from './types.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { sanitizedLog } from '../pii-sanitizer.js';
import { createScopedLogger } from '@/utils/logger.js';

const logger = createScopedLogger('required-fields-enhancer');

/**
 * Normalize field names for comparison
 */
const normalizeFieldName = (field: string): string =>
  field.trim().toLowerCase();

/**
 * Check if recordData contains a stage field (for deals)
 */
const hasStageField = (recordData: Record<string, unknown>): boolean => {
  const directKeys = Object.keys(recordData).map(normalizeFieldName);
  if (
    directKeys.includes('stage') ||
    directKeys.includes('deal stage') ||
    directKeys.includes('status')
  ) {
    return true;
  }

  const values =
    recordData.values &&
    typeof recordData.values === 'object' &&
    recordData.values !== null
      ? (recordData.values as Record<string, unknown>)
      : null;

  if (!values) return false;

  const valueKeys = Object.keys(values).map(normalizeFieldName);
  return (
    valueKeys.includes('stage') ||
    valueKeys.includes('deal stage') ||
    valueKeys.includes('status')
  );
};

/**
 * Build enhanced error message for missing deal stage
 */
const buildMissingDealStageMessage = async (
  recordData: Record<string, unknown>
): Promise<string | null> => {
  if (hasStageField(recordData)) return null;

  try {
    const { AttributeOptionsService } =
      await import('@/services/metadata/index.js');
    const { options } = await AttributeOptionsService.getOptions(
      'deals',
      'stage'
    );
    const preview = options
      .slice(0, 5)
      .map((option) => `"${option.title}"`)
      .join(', ');
    const hasMore = options.length > 5 ? ` (+${options.length - 5} more)` : '';
    return (
      `Required field "stage" is missing for deals.\n\n` +
      `Common stage values: ${preview}${hasMore}\n\n` +
      `For the full list, call: records_get_attribute_options(resource_type="deals", attribute="stage").`
    );
  } catch (err) {
    sanitizedLog(
      logger,
      'debug',
      'Failed to fetch stage options for enhanced error message',
      {
        enhancerName: 'required-fields',
        resourceType: 'deals',
        attribute: 'stage',
        error: err instanceof Error ? err.message : String(err),
      }
    );
    return (
      `Required field "stage" is missing for deals.\n\n` +
      `Call records_get_attribute_options(resource_type="deals", attribute="stage") to retrieve valid stage values, then retry.`
    );
  }
};

/**
 * Required Fields Enhancer
 * Detects missing required field errors and provides context-specific guidance
 */
export const requiredFieldsEnhancer: ErrorEnhancer = {
  name: 'required-fields',
  errorName: 'validation_error',

  matches: (error: unknown, _context: CrudErrorContext): boolean => {
    const msg = error instanceof Error ? error.message : String(error);
    return msg.includes('required field') || msg.includes('Missing required');
  },

  enhance: async (
    _error: unknown,
    context: CrudErrorContext
  ): Promise<string | null> => {
    const { resourceType, recordData } = context;

    // Deal-specific required field handling
    if (resourceType === UniversalResourceType.DEALS && recordData) {
      const stageMessage = await buildMissingDealStageMessage(recordData);
      if (stageMessage) {
        return stageMessage;
      }
    }

    // Generic required field message
    return 'Missing required fields. Please check that all mandatory fields are provided.';
  },
};
