/**
 * Value validation utilities for filter transformation
 * Validates select/status field values against allowed options
 */

import {
  FilterValidationError,
  FilterErrorCategory,
} from '@/errors/api-errors.js';
import { getAttributeTypeInfo } from '@/api/attribute-types.js';
import { getStatusOptions, getSelectOptions } from '@/api/attio-client.js';

/**
 * Select/status option interface
 */
interface SelectOption {
  id: string;
  title: string;
  value?: string;
  is_archived?: boolean;
}

/**
 * Per-call cache for options to avoid repeated lookups
 * Key format: `${resourceType}:${attributeSlug}`
 */
type OptionsCache = Map<string, SelectOption[]>;

/**
 * Validates select or status field values against allowed options
 *
 * Strategy:
 * 1. Try metadata options first (cached, no network call)
 * 2. Fall back to API call (getStatusOptions/getSelectOptions) if metadata lacks options
 * 3. Check if value matches any active option (by title or id, case-insensitive)
 * 4. Throw clear error with valid options if invalid
 *
 * @param resourceType - Object type (e.g., 'deals', 'companies')
 * @param attributeSlug - Attribute slug (e.g., 'stage', 'category')
 * @param value - Value to validate
 * @param condition - Filter condition ('equals', 'in', etc.)
 * @param optionsCache - Per-call cache to avoid repeated lookups
 * @throws FilterValidationError if value is invalid
 */
export async function validateSelectOrStatusValue(
  resourceType: string,
  attributeSlug: string,
  value: unknown,
  condition: string,
  optionsCache: OptionsCache
): Promise<void> {
  // Only validate equals and in operators (skip contains/starts_with/etc.)
  if (condition !== 'equals' && condition !== 'in') {
    return; // Skip validation for other operators
  }

  // Check cache first
  const cacheKey = `${resourceType}:${attributeSlug}`;
  let options = optionsCache.get(cacheKey);

  if (!options) {
    // Not in cache, fetch options
    options = await fetchSelectOrStatusOptions(resourceType, attributeSlug);
    optionsCache.set(cacheKey, options);
  }

  // Filter active options only
  const activeOptions = options.filter((opt) => !opt.is_archived);

  // Handle array values for 'in' operator
  const valuesToCheck = Array.isArray(value) ? value : [value];

  // Check each value
  const invalidValues: unknown[] = [];
  for (const val of valuesToCheck) {
    const valueStr = String(val);
    const isValid = activeOptions.some(
      (opt) =>
        opt.title.toLowerCase() === valueStr.toLowerCase() ||
        opt.id === valueStr ||
        opt.value === valueStr
    );

    if (!isValid) {
      invalidValues.push(val);
    }
  }

  // Throw error if any invalid values found
  if (invalidValues.length > 0) {
    const validTitles = activeOptions.map((opt) => opt.title);

    // Cap suggestion list at 15 options
    const maxSuggestions = 15;
    const suggestionList =
      validTitles.length > maxSuggestions
        ? `${validTitles.slice(0, maxSuggestions).join(', ')}... and ${validTitles.length - maxSuggestions} more`
        : validTitles.join(', ');

    const invalidValuesStr =
      invalidValues.length === 1
        ? `"${invalidValues[0]}"`
        : `[${invalidValues.map((v) => `"${v}"`).join(', ')}]`;

    throw new FilterValidationError(
      `Invalid value ${invalidValuesStr} for field "${attributeSlug}". ` +
        `Valid options are: [${suggestionList}]`,
      FilterErrorCategory.VALUE
    );
  }

  // Log validation success in development
  if (process.env.NODE_ENV === 'development') {
    const validatedStr =
      valuesToCheck.length === 1
        ? `"${valuesToCheck[0]}"`
        : `[${valuesToCheck.map((v) => `"${v}"`).join(', ')}]`;
    // eslint-disable-next-line no-console
    console.debug(
      `[value-validators] Validated ${attributeSlug}: ${validatedStr} (${activeOptions.length} options available)`
    );
  }
}

/**
 * Fetches select/status options for an attribute
 * Prefers metadata options (cached), falls back to API call
 */
async function fetchSelectOrStatusOptions(
  resourceType: string,
  attributeSlug: string
): Promise<SelectOption[]> {
  // Try metadata first (cached, no network call)
  const typeInfo = await getAttributeTypeInfo(resourceType, attributeSlug);

  // Check if metadata has options
  const metadataOptions = typeInfo.metadata?.config?.select?.options;

  if (
    metadataOptions &&
    Array.isArray(metadataOptions) &&
    metadataOptions.length > 0
  ) {
    // Use metadata options (already cached)
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(
        `[value-validators] Using metadata options for ${resourceType}.${attributeSlug} (${metadataOptions.length} options)`
      );
    }
    return metadataOptions as SelectOption[];
  }

  // Metadata lacks options, fall back to API call
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug(
      `[value-validators] Fetching options via API for ${resourceType}.${attributeSlug}`
    );
  }

  if (typeInfo.attioType === 'status') {
    return (await getStatusOptions(
      resourceType,
      attributeSlug
    )) as SelectOption[];
  } else {
    // Assume select
    return (await getSelectOptions(
      resourceType,
      attributeSlug
    )) as SelectOption[];
  }
}
