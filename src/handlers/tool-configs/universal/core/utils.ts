import { UniversalResourceType } from '../types.js';

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

const ARRAY_VALUE_KEYS = ['value', 'full_name', 'formatted'];

const coerceArrayValue = (value: unknown): string | undefined => {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const first = value[0] as Record<string, unknown> | string | undefined;
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') {
    for (const key of ARRAY_VALUE_KEYS) {
      const token = first[key];
      if (typeof token === 'string' && token.length > 0) {
        return token;
      }
    }
  }
  return undefined;
};

const coerceScalar = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return coerceArrayValue(value);
  if (
    typeof value === 'object' &&
    'value' in (value as Record<string, unknown>)
  ) {
    const inner = (value as Record<string, unknown>).value;
    return typeof inner === 'string' ? inner : undefined;
  }
  return undefined;
};

export const extractDisplayName = (
  values: Record<string, unknown> | undefined,
  resourceType?: UniversalResourceType
): string => {
  if (!values) return 'Unnamed';

  if (resourceType === UniversalResourceType.PEOPLE) {
    const nameCandidate =
      coerceArrayValue(values.name) ||
      coerceArrayValue(values.full_name) ||
      coerceScalar(values.name) ||
      coerceScalar(values.full_name);

    if (nameCandidate) {
      return nameCandidate;
    }
  }

  const fallbackName =
    coerceScalar(values.name) ||
    coerceScalar(values.title) ||
    coerceScalar(values.content);

  return fallbackName || 'Unnamed';
};

export interface ValidationMetadata {
  warnings?: string[];
  suggestions?: string[];
  actualValues?: Record<string, unknown>;
}

const formatActualValue = (value: unknown): string => {
  if (Array.isArray(value) && value.length > 0) {
    return coerceArrayValue(value) ?? JSON.stringify(value);
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

export const formatValidationDetails = (
  metadata?: ValidationMetadata
): string => {
  if (!metadata) return '';

  const sections: string[] = [];

  if (metadata.warnings?.length) {
    sections.push(
      ['Warnings:', ...metadata.warnings.map((warning) => `• ${warning}`)].join(
        '\n'
      )
    );
  }

  const uniqueSuggestions = metadata.suggestions?.filter((suggestion) =>
    metadata.warnings ? !metadata.warnings.includes(suggestion) : true
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
    metadata.warnings?.length &&
    metadata.actualValues &&
    Object.keys(metadata.actualValues).length > 0
  ) {
    const actualLines = Object.entries(metadata.actualValues).map(
      ([key, value]) => `• ${key}: ${formatActualValue(value)}`
    );
    sections.push(['Actual persisted values:', ...actualLines].join('\n'));
  }

  return sections.length ? `\n\n${sections.join('\n\n')}` : '';
};
