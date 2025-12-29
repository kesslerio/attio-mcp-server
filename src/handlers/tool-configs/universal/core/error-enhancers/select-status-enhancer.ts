/**
 * Select/Status Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 *
 * Detects "Cannot find select option" or "Cannot find Status" errors
 * and provides valid options from AttributeOptionsService.
 */

import type { ErrorEnhancer, CrudErrorContext } from './types.js';
import { getErrorMessage } from './types.js';
import { sanitizedLog } from '../pii-sanitizer.js';
import { createScopedLogger } from '@/utils/logger.js';

const logger = createScopedLogger('select-status-enhancer');

/**
 * Enhance error messages for select/status attribute errors
 */
const enhanceSelectStatusError = async (
  error: unknown,
  resourceType: string,
  recordData: Record<string, unknown>
): Promise<string | null> => {
  const msg = getErrorMessage(error);

  // Attempt to extract validation_errors array for better detail on select fields
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    const data = (error.response as Record<string, unknown>).data;
    if (data && typeof data === 'object' && 'validation_errors' in data) {
      const validationErrors = (data as Record<string, unknown>)
        .validation_errors;
      if (Array.isArray(validationErrors)) {
        const selectErr = validationErrors.find((ve) =>
          String(ve?.message || '').includes('select option')
        );
        if (selectErr?.field) {
          try {
            const { AttributeOptionsService } = await import(
              '@/services/metadata/index.js'
            );
            const { options, attributeType } =
              await AttributeOptionsService.getOptions(
                resourceType,
                selectErr.field as string
              );
            const validList = options
              .slice(0, 8)
              .map((o) => o.title)
              .join(', ');
            const hasMore =
              options.length > 8 ? ` (+${options.length - 8} more)` : '';
            return `Value is not valid for ${attributeType} attribute "${selectErr.field}" on ${resourceType}.
Expected one of: ${validList}${hasMore}

Next step: Call records_get_attribute_options with
  resource_type: "${resourceType}"
  attribute: "${selectErr.field}"
to list all valid values, then retry.`;
          } catch (err) {
            sanitizedLog(
              logger,
              'debug',
              'Failed to fetch select/status options for enhanced error message',
              {
                enhancerName: 'select-status',
                resourceType,
                attribute: selectErr.field,
                error: err instanceof Error ? err.message : String(err),
              }
            );
            return `Value is not valid for attribute "${selectErr.field}" on ${resourceType}.
Next step: Call records_get_attribute_options with
  resource_type: "${resourceType}"
  attribute: "${selectErr.field}"
to see valid options, then retry.`;
          }
        }
      }
    }
  }

  // Pattern: "Cannot find select option with title 'X'" or "Cannot find Status with title 'X'"
  const selectMatch = msg.match(
    /Cannot find (?:select option|Status) with title "(.+?)"/
  );
  if (!selectMatch) return null;

  const invalidValue = selectMatch[1];

  // Try to identify which field has the problem by checking record data
  for (const [fieldName, fieldValue] of Object.entries(recordData)) {
    if (
      fieldValue === invalidValue ||
      (Array.isArray(fieldValue) && fieldValue.includes(invalidValue))
    ) {
      try {
        const { AttributeOptionsService } = await import(
          '@/services/metadata/index.js'
        );
        const { options, attributeType } =
          await AttributeOptionsService.getOptions(resourceType, fieldName);
        const validList = options
          .slice(0, 8)
          .map((o) => o.title)
          .join(', ');
        const hasMore =
          options.length > 8 ? ` (+${options.length - 8} more)` : '';
        return (
          `Value "${invalidValue}" is not valid for ${attributeType} attribute "${fieldName}" on ${resourceType}.\n\n` +
          `Valid options: ${validList}${hasMore}\n\n` +
          `Next step: Call records_get_attribute_options with\n` +
          `  resource_type: "${resourceType}"\n` +
          `  attribute: "${fieldName}"\n` +
          `to list all valid values, then retry.`
        );
      } catch (err) {
        sanitizedLog(
          logger,
          'debug',
          'Failed to fetch attribute options (no invalid value extracted)',
          {
            enhancerName: 'select-status',
            resourceType,
            attribute: fieldName,
            error: err instanceof Error ? err.message : String(err),
          }
        );
        return (
          `Value "${invalidValue}" is not valid for attribute "${fieldName}" on ${resourceType}.\n\n` +
          `Next step: Call records_get_attribute_options with\n` +
          `  resource_type: "${resourceType}"\n` +
          `  attribute: "${fieldName}"\n` +
          `to see valid options, then retry.`
        );
      }
    }
  }

  // Couldn't match to a specific field, return generic hint
  return (
    `Value "${invalidValue}" is not valid for an attribute on ${resourceType}.\n\n` +
    `Next step: Use records_get_attribute_options to discover valid options for the attribute.`
  );
};

/**
 * Select/Status Enhancer
 * Provides valid options for select and status field errors
 */
export const selectStatusEnhancer: ErrorEnhancer = {
  name: 'select-status',
  errorName: 'value_not_found',

  matches: (error: unknown, _context: CrudErrorContext): boolean => {
    const msg = getErrorMessage(error);
    return (
      msg.includes('Cannot find select option') ||
      msg.includes('Cannot find Status') ||
      msg.includes('select option')
    );
  },

  enhance: async (
    error: unknown,
    context: CrudErrorContext
  ): Promise<string | null> => {
    const { resourceType, recordData } = context;
    if (!recordData) return null;
    return enhanceSelectStatusError(error, resourceType, recordData);
  },
};
