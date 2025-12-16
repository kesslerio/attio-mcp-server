/**
 * Select/Status Error Enhancer
 *
 * Detects "Cannot find select option" or "Cannot find Status" errors
 * and provides valid options from AttributeOptionsService.
 */

import type { ErrorEnhancer, CrudErrorContext } from './types.js';

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
                context.resourceType,
                selectErr.field as string
              );
              .slice(0, 8)
              .map((o) => o.title)
              .join(', ');
              options.length > 8 ? ` (+${options.length - 8} more)` : '';
            return `Value is not valid for ${attributeType} attribute "${selectErr.field}" on ${context.resourceType}.
Expected one of: ${validList}${hasMore}

Next step: Call records_get_attribute_options with
  resource_type: "${context.resourceType}"
  attribute: "${selectErr.field}"
to list all valid values, then retry.`;
          } catch {
            return `Value is not valid for attribute "${selectErr.field}" on ${context.resourceType}.
Next step: Call records_get_attribute_options with
  resource_type: "${context.resourceType}"
  attribute: "${selectErr.field}"
to see valid options, then retry.`;
          }
        }
      }
    }
  }

  // Pattern: "Cannot find select option with title 'X'" or "Cannot find Status with title 'X'"
    /Cannot find (?:select option|Status) with title "(.+?)"/
  );
  if (!selectMatch) return null;


  // Try to identify which field has the problem by checking record data
  if (context.recordData) {
    for (const [fieldName, fieldValue] of Object.entries(context.recordData)) {
      if (
        fieldValue === invalidValue ||
        (Array.isArray(fieldValue) && fieldValue.includes(invalidValue))
      ) {
        try {
          // Dynamic import to avoid circular dependencies
          const { AttributeOptionsService } = await import(
            '@/services/metadata/index.js'
          );
          const { options, attributeType } =
            await AttributeOptionsService.getOptions(
              context.resourceType,
              fieldName
            );
            .slice(0, 8)
            .map((o) => o.title)
            .join(', ');
            options.length > 8 ? ` (+${options.length - 8} more)` : '';
          return (
            `Value "${invalidValue}" is not valid for ${attributeType} attribute "${fieldName}" on ${context.resourceType}.\n\n` +
            `Valid options: ${validList}${hasMore}\n\n` +
            `Next step: Call records_get_attribute_options with\n` +
            `  resource_type: "${context.resourceType}"\n` +
            `  attribute: "${fieldName}"\n` +
            `to list all valid values, then retry.`
          );
        } catch {
          // Can't fetch options, return generic hint
          return (
            `Value "${invalidValue}" is not valid for attribute "${fieldName}" on ${context.resourceType}.\n\n` +
            `Next step: Call records_get_attribute_options with\n` +
            `  resource_type: "${context.resourceType}"\n` +
            `  attribute: "${fieldName}"\n` +
            `to see valid options, then retry.`
          );
        }
      }
    }
  }

  // Couldn't match to a specific field, return generic hint
  return (
    `Value "${invalidValue}" is not valid for an attribute on ${context.resourceType}.\n\n` +
    `Next step: Use records_get_attribute_options to discover valid options for the attribute.`
  );
}

function matches(error: unknown, _context: CrudErrorContext): boolean {

  // Check for select option pattern
  if (/Cannot find (?:select option|Status) with title/.test(msg)) {
    return true;
  }

  // Check for validation_errors array
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    if (data && typeof data === 'object' && 'validation_errors' in data) {
        .validation_errors;
      if (Array.isArray(validationErrors)) {
        return validationErrors.some((ve) =>
          String(ve?.message || '').includes('select option')
        );
      }
    }
  }

  return false;
}

export const selectStatusEnhancer: ErrorEnhancer = {
  name: 'select-status',
  matches,
  enhance,
  errorName: 'value_not_found',
};
