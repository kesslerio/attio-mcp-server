import { UniversalResourceType } from '../types.js';
import {
  extractDisplayName as extractDisplayNameTyped,
  extractDisplayValue,
  extractMultipleDisplayValues,
  coerceArrayValue as legacyCoerceArrayValue,
  coerceScalar as legacyCoerceScalar,
} from './value-extractors.js';
import {
  sanitizeValidationMetadata,
  formatSanitizedActualValue,
  type SanitizedValidationMetadata,
} from './pii-sanitizer.js';

// Re-export type guards for UniversalRecord (Issue #1073)
// These allow discriminating between AttioRecord (has values) and AttioList (top-level fields)
export {
  isAttioRecord,
  isAttioList,
  getRecordId,
  type UniversalRecord,
} from '../../../../types/attio.js';

/**
 * Return plural form label for universal resource types. Used solely for result formatting.
 */
export function getPluralResourceType(
  resourceType: UniversalResourceType
): string {
  switch (resourceType) {
    case UniversalResourceType.COMPANIES:
      return 'companies';
    case UniversalResourceType.PEOPLE:
      return 'people';
    case UniversalResourceType.LISTS:
      return 'lists';
    case UniversalResourceType.RECORDS:
      return 'records';
    case UniversalResourceType.DEALS:
      return 'deals';
    case UniversalResourceType.TASKS:
      return 'tasks';
    case UniversalResourceType.NOTES:
      return 'notes';
    default:
      return 'records';
  }
}

// Legacy functions maintained for backward compatibility
// @deprecated Use extractDisplayValue from value-extractors.ts instead
const coerceArrayValue = legacyCoerceArrayValue;
const coerceScalar = legacyCoerceScalar;

// Use the new type-safe extraction function
export const extractDisplayName = extractDisplayNameTyped;

export interface ValidationMetadata {
  warnings?: string[];
  suggestions?: string[];
  actualValues?: Record<string, unknown>;
}

const formatActualValue = (value: unknown): string => {
  // Use PII-sanitized formatting
  return formatSanitizedActualValue(value);
};

export const formatValidationDetails = (
  metadata?: ValidationMetadata
): string => {
  if (!metadata) return '';

  // Sanitize metadata before processing
  const sanitizedMetadata = sanitizeValidationMetadata(metadata);
  if (!sanitizedMetadata) return '';

  const sections: string[] = [];

  if (sanitizedMetadata.warnings?.length) {
    sections.push(
      [
        'Warnings:',
        ...sanitizedMetadata.warnings.map((warning) => `• ${warning}`),
      ].join('\n')
    );
  }

  const uniqueSuggestions = sanitizedMetadata.suggestions?.filter(
    (suggestion) =>
      sanitizedMetadata.warnings
        ? !sanitizedMetadata.warnings.includes(suggestion)
        : true
  );

  if (uniqueSuggestions && uniqueSuggestions.length > 0) {
    sections.push(
      [
        'Suggestions:',
        ...uniqueSuggestions.map((suggestion) => `• ${suggestion}`),
      ].join('\n')
    );
  }

  if (
    sanitizedMetadata.warnings?.length &&
    sanitizedMetadata.actualValues &&
    Object.keys(sanitizedMetadata.actualValues).length > 0
  ) {
    const actualLines = Object.entries(sanitizedMetadata.actualValues).map(
      ([key, value]) => `• ${key}: ${formatActualValue(value)}`
    );
    sections.push(['Actual persisted values:', ...actualLines].join('\n'));
  }

  return sections.length ? `\n\n${sections.join('\n\n')}` : '';
};
