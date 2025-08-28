/**
 * Category validation for companies
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';
import { findSimilarStrings } from './similarity-utils.js';

/**
 * Valid category options for companies (from Issues #220/#218)
 * Comprehensive list of industry categories with proper casing
 */
const VALID_COMPANY_CATEGORIES = [
  'Health Care',
  'Technology',
  'Software',
  'SaaS',
  'B2B',
  'B2C',
  'E-commerce',
  'Financial Services',
  'Banking',
  'Finance',
  'Insurance',
  'Manufacturing',
  'Retail',
  'Education',
  'Consulting',
  'Real Estate',
  'Media & Entertainment',
  'Transportation',
  'Energy',
  'Food & Beverage',
  'Construction',
  'Telecommunications',
  'Automotive',
  'Aerospace',
  'Pharmaceuticals',
  'Biotechnology',
  'Non-profit',
  'Government',
  'Agriculture',
  'Mining',
  'Utilities',
  'Hospitality',
  'Travel',
  'Sports',
  'Fashion',
  'Beauty',
];

/**
 * Validates category values and provides suggestions (Issues #220/#218)
 * Supports both string and array inputs with auto-conversion
 */
export function validateCategories(input: string | string[]): {
  isValid: boolean;
  validatedCategories: string[];
  suggestions: string[];
  errors: string[];
  autoConverted: boolean;
} {
  const result = {
    isValid: true,
    validatedCategories: [] as string[],
    suggestions: [] as string[],
    errors: [] as string[],
    autoConverted: false,
  };

  // Handle string-to-array auto-conversion (Issue #218)
  let categories: string[];
  if (typeof input === 'string') {
    categories = [input];
    result.autoConverted = true;
  } else if (Array.isArray(input)) {
    categories = input;
  } else {
    result.isValid = false;
    result.errors.push(
      'Categories must be a string or array of strings. Use ["category"] format for arrays.'
    );
    return result;
  }

  // Validate each category and deduplicate
  const processedCategories = new Set<string>();

  for (const category of categories) {
    if (typeof category !== 'string') {
      result.isValid = false;
      result.errors.push(
        `Invalid category type: ${typeof category}. All categories must be strings.`
      );
      continue;
    }

    // Skip empty categories
    if (!category.trim()) {
      result.isValid = false;
      result.errors.push('Empty category is not allowed.');
      continue;
    }

    // Check if category is valid (case-insensitive)
    const exactMatch = VALID_COMPANY_CATEGORIES.find(
      (valid) => valid.toLowerCase() === category.toLowerCase()
    );

    if (exactMatch) {
      processedCategories.add(exactMatch); // Use canonical casing and deduplicate
    } else {
      // Find similar categories using fuzzy matching (Issue #220)
      // Use lower threshold for shorter words
      const threshold = category.length <= 4 ? 0.3 : 0.5;
      const suggestions = findSimilarStrings(
        category,
        VALID_COMPANY_CATEGORIES,
        threshold
      );

      result.isValid = false;
      result.errors.push(
        `Invalid category "${category}". ${
          suggestions.length > 0
            ? `Did you mean: ${suggestions.slice(0, 3).join(', ')}?`
            : 'Please use a valid category.'
        }`
      );

      if (suggestions.length > 0) {
        result.suggestions.push(...suggestions.slice(0, 5)); // Top 5 suggestions
      }
    }
  }

  // Convert set back to array and remove duplicates from suggestions
  result.validatedCategories = Array.from(processedCategories);
  result.suggestions = [...new Set(result.suggestions)];

  return result;
}

/**
 * Auto-converts and validates categories field for companies (Issues #220/#218)
 * Main processing function that integrates validation with transformation
 */
export function processCategories(
  resourceType: UniversalResourceType,
  fieldName: string,
  value: unknown
): {
  processedValue: unknown;
  warnings: string[];
  errors: string[];
} {
  const result = {
    processedValue: value,
    warnings: [] as string[],
    errors: [] as string[],
  };

  // Only process categories for companies
  if (
    resourceType !== UniversalResourceType.COMPANIES ||
    fieldName.toLowerCase() !== 'categories'
  ) {
    return result;
  }

  // Validate categories
  if (typeof value !== 'string' && !Array.isArray(value)) {
    result.errors.push(`Categories must be a string or array of strings, got: ${typeof value}`);
    return result;
  }
  
  const validation = validateCategories(value as string | string[]);

  if (validation.autoConverted) {
    result.warnings.push(
      `Categories field auto-converted from string to array format: ["${value}"]`
    );
  }

  if (!validation.isValid) {
    result.errors.push(...validation.errors);

    // Always show valid options when there are errors
    result.warnings.push(
      `Valid category options (first 10): ${VALID_COMPANY_CATEGORIES.slice(0, 10).join(', ')}`
    );
  } else {
    result.processedValue = validation.validatedCategories;

    if (validation.autoConverted) {
      result.warnings.push(
        `Category value successfully validated and converted to: ${JSON.stringify(validation.validatedCategories)}`
      );
    }
  }

  return result;
}

/**
 * Get list of valid categories for companies
 * Used for error messages and documentation
 */
export function getValidCategories(): string[] {
  return [...VALID_COMPANY_CATEGORIES];
}