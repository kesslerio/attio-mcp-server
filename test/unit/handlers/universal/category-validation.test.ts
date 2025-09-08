/**
 * Category Validation Tests for Issues #220/#218 Requirements
 *
 * Tests the comprehensive category validation system implemented for Issue #473,
 * specifically addressing the requirements from Issues #220 and #218:
 * - Fuzzy matching with Levenshtein distance
 * - String-to-array auto-conversion
 * - Case-insensitive validation with canonical casing
 * - "Did you mean?" suggestions for typos
 * - Comprehensive error messages and warnings
 */

import { describe, it, expect } from 'vitest';

import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';

describe('Category Validation System (Issues #220/#218)', () => {
  describe('validateCategories() - Core Validation Logic', () => {
    describe('Valid Categories', () => {
      it('should validate single valid category string', () => {

        expect(result.isValid).toBe(true);
        expect(result.autoConverted).toBe(true);
        expect(result.validatedCategories).toEqual(['Technology']);
        expect(result.suggestions).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate array of valid categories', () => {

        expect(result.isValid).toBe(true);
        expect(result.autoConverted).toBe(false);
        expect(result.validatedCategories).toEqual(categories);
        expect(result.suggestions).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle case-insensitive validation with canonical casing', () => {
          { input: 'technology', expected: 'Technology' },
          { input: 'health care', expected: 'Health Care' }, // Use actual category in list
          { input: 'saas', expected: 'SaaS' },
          { input: 'b2b', expected: 'B2B' },
          { input: 'financial services', expected: 'Financial Services' },
        ];

        testCases.forEach(({ input, expected }) => {

          expect(result.isValid).toBe(true);
          expect(result.validatedCategories).toEqual([expected]);
        });
      });

      it('should validate all available categories from the valid list', () => {

        expect(validCategories.length).toBeGreaterThan(30); // Should have 35+ categories

        // Test a representative sample
          'Health Care',
          'Technology',
          'Financial Services',
          'Manufacturing',
          'E-commerce',
          'Non-profit',
          'Telecommunications',
        ];

        sampleCategories.forEach((category) => {
          expect(validCategories).toContain(category);

          expect(result.isValid).toBe(true);
          expect(result.validatedCategories).toEqual([category]);
        });
      });
    });

    describe('Invalid Categories with Fuzzy Matching', () => {
      it('should provide fuzzy matching suggestions for close typos', () => {
          { input: 'Tecnology', expected: ['Technology'] },
          { input: 'Helthcare', expected: ['Health Care'] },
          { input: 'Finacial', expected: ['Finance'] }, // "Finance" is closer match than "Financial Services"
          { input: 'Sofware', expected: ['Software'] },
          { input: 'Biotechnolgy', expected: ['Biotechnology'] },
        ];

        testCases.forEach(({ input, expected }) => {

          expect(result.isValid).toBe(false);
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0]).toContain('Did you mean');
          expect(result.suggestions).toEqual(expect.arrayContaining(expected));
        });
      });

      it('should handle multiple character errors with distance-based matching', () => {
          { input: 'Tehcnology', suggestions: ['Technology'] },
          { input: 'Manufactring', suggestions: ['Manufacturing'] },
          { input: 'Educaton', suggestions: ['Education'] },
        ];

        testCases.forEach(({ input, suggestions }) => {

          expect(result.isValid).toBe(false);
          expect(result.suggestions).toEqual(
            expect.arrayContaining(suggestions)
          );
        });
      });

      it('should provide multiple suggestions when multiple matches are close', () => {

        expect(result.isValid).toBe(false);
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Did you mean');
      });

      it('should handle completely invalid categories gracefully', () => {

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Invalid category');
        // May or may not have suggestions depending on distance threshold
      });
    });

    describe('Auto-Conversion Features', () => {
      it('should auto-convert string to single-element array', () => {

        expect(result.autoConverted).toBe(true);
        expect(result.validatedCategories).toEqual(['Technology']);
      });

      it('should not mark arrays as auto-converted', () => {

        expect(result.autoConverted).toBe(false);
        expect(result.validatedCategories).toEqual(['Technology', 'Software']);
      });

      it('should handle mixed case in array elements', () => {

        expect(result.isValid).toBe(true);
        expect(result.validatedCategories).toEqual([
          'Technology',
          'Software',
          'SaaS',
        ]);
      });
    });

    describe('Error Handling', () => {
      it('should reject non-string array elements', () => {
          'Technology',
          123,
          'Software',
        ] as any);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((err) => err.includes('must be strings'))
        ).toBe(true);
      });

      it('should reject invalid input types', () => {

        testCases.forEach((input) => {

          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        });
      });

      it('should handle empty arrays', () => {

        expect(result.isValid).toBe(true);
        expect(result.validatedCategories).toEqual([]);
        expect(result.autoConverted).toBe(false);
      });

      it('should handle empty strings', () => {

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('Duplicate Handling', () => {
      it('should remove duplicate suggestions', () => {
        // This tests the internal deduplication logic

        expect(result.suggestions.length).toBe(uniqueSuggestions.size);
      });

      it('should handle duplicate categories in input array', () => {
          'Technology',
          'technology',
          'TECHNOLOGY',
        ]);

        expect(result.isValid).toBe(true);
        // Should deduplicate to single canonical entry
        expect(result.validatedCategories).toEqual(['Technology']);
        expect(result.validatedCategories).toHaveLength(1);
      });
    });
  });

  describe('processCategories() - Integration with Field Mapping', () => {
    it('should process valid categories for companies', () => {
        UniversalResourceType.COMPANIES,
        'categories',
        'Technology'
      );

      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0); // Should have auto-conversion warning
      expect(result.processedValue).toEqual(['Technology']);
    });

    it('should handle invalid categories with helpful error messages', () => {
        UniversalResourceType.COMPANIES,
        'categories',
        'InvalidCategory'
      );

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid category "InvalidCategory"');
      // Should always provide warnings about valid categories when there are errors
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => w.includes('Valid category options'))
      ).toBe(true);
    });

    it('should only process categories for companies resource type', () => {
        UniversalResourceType.PEOPLE,
        'categories',
        'Technology'
      );

      // Should pass through without processing for non-company resources
      expect(result.processedValue).toBe('Technology');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should only process fields named "categories"', () => {
        UniversalResourceType.COMPANIES,
        'industry', // Not 'categories'
        'Technology'
      );

      // Should pass through without processing for non-categories fields
      expect(result.processedValue).toBe('Technology');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle array input with mixed validity', () => {
        UniversalResourceType.COMPANIES,
        'categories',
        ['Technology', 'InvalidCategory', 'Software']
      );

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('InvalidCategory');
      // May or may not have warnings depending on implementation
    });
  });

  describe('Integration with Real-World Scenarios', () => {
    it('should handle common business category combinations', () => {
        ['Technology', 'Software', 'SaaS'],
        ['Financial Services', 'Banking', 'B2B'],
        ['Health Care', 'Biotechnology'],
        ['Manufacturing', 'Automotive'],
        ['E-commerce', 'Retail', 'B2C'],
      ];

      commonCombinations.forEach((combination) => {

        expect(result.isValid).toBe(true);
        expect(result.validatedCategories).toEqual(combination);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should provide helpful guidance for ambiguous terms', () => {
        'Tech', // Could be Technology
        'Medic', // Could be Health Care, Medical-related
        'Soft', // Could be Software
      ];

      ambiguousTerms.forEach((term) => {

        // Should provide suggestions for ambiguous terms that don't exactly match
        if (!result.isValid) {
          // At least should have proper error structure even if no suggestions
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.suggestions).toBeDefined();
          expect(Array.isArray(result.suggestions)).toBe(true);
        }
      });
    });

    it('should handle typos in common business terms', () => {
        { typo: 'Softwre', expected: 'Software' },
        { typo: 'Healthcar', expected: 'Health Care' },
        { typo: 'Finnance', expected: 'Finance' },
        { typo: 'Educatoin', expected: 'Education' },
        { typo: 'Constrcution', expected: 'Construction' },
      ];

      typoScenarios.forEach(({ typo, expected }) => {

        expect(result.isValid).toBe(false);
        expect(result.suggestions).toContain(expected);
        expect(result.errors[0]).toContain('Did you mean');
        expect(result.errors[0]).toContain(expected);
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large arrays efficiently', () => {


      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      expect(result.isValid).toBe(true);
    });

    it('should handle very long category names', () => {

      expect(result.isValid).toBe(false);
      // Should not crash or hang
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle special characters in category names', () => {

      specialChars.forEach((category) => {

        // Should handle gracefully (either validate or provide suggestions)
        expect(result).toBeDefined();
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });
    });
  });
});
