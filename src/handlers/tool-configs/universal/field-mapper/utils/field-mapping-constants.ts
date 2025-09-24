/**
 * Shared utility for creating field mapping constants
 * Created for Issue #720 to ensure consistent field mapping patterns across resource types
 */

export interface DisplayNameConstants {
  readonly [key: string]: string;
}

export interface PluralMappingConstants {
  readonly [key: string]: string;
}

/**
 * Creates standardized display name constants for field mappings
 * @param displayNames Object mapping constant keys to display names
 * @returns Readonly object with display name constants
 */
export function createDisplayNameConstants<T extends Record<string, string>>(
  displayNames: T
): Readonly<T> {
  return Object.freeze(displayNames) as Readonly<T>;
}

/**
 * Creates standardized plural mapping constants for field mappings
 * @param pluralMappings Object mapping plural field names to singular API field names
 * @returns Readonly object with plural mapping constants
 */
export function createPluralMappingConstants<T extends Record<string, string>>(
  pluralMappings: T
): Readonly<T> {
  return Object.freeze(pluralMappings) as Readonly<T>;
}

/**
 * Utility to validate field mapping constants for consistency
 * @param displayNames Display name constants object
 * @param pluralMappings Plural mapping constants object
 * @returns Validation result with any inconsistencies found
 */
export function validateFieldMappingConstants(
  displayNames: DisplayNameConstants,
  pluralMappings: PluralMappingConstants
): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for empty objects
  if (Object.keys(displayNames).length === 0) {
    issues.push('Display names object is empty');
  }

  if (Object.keys(pluralMappings).length === 0) {
    issues.push('Plural mappings object is empty');
  }

  // Check for potential conflicts between display names and plural mappings
  const displayValues = Object.values(displayNames);
  const pluralKeys = Object.keys(pluralMappings);

  for (const pluralKey of pluralKeys) {
    if (displayValues.includes(pluralKey)) {
      issues.push(
        `Potential conflict: plural key "${pluralKey}" matches a display name value`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
