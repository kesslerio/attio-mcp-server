/**
 * Unit tests for centralized string similarity utilities
 * Issue #994: Tests for consolidated Levenshtein and similarity matching
 */

import { describe, it, expect } from 'vitest';

describe('String Similarity Utilities', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('stage', 'stage')).toBe(0);
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should return correct distance for single character changes', () => {
      expect(levenshteinDistance('stage', 'stag')).toBe(1); // deletion
      expect(levenshteinDistance('stag', 'stage')).toBe(1); // insertion
      expect(levenshteinDistance('stage', 'stade')).toBe(1); // substitution
    });

    it('should return correct distance for multiple edits', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('test', '')).toBe(4);
      expect(levenshteinDistance('', 'test')).toBe(4);
    });

    it('should be case-sensitive', () => {
      expect(levenshteinDistance('Stage', 'stage')).toBe(1);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      expect(calculateSimilarity('stage', 'stage')).toBe(1.0);
      expect(calculateSimilarity('', '')).toBe(1.0);
    });

    it('should return score between 0 and 1', () => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return higher scores for more similar strings', () => {
      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should handle empty strings', () => {
      expect(calculateSimilarity('', '')).toBe(1.0);
      expect(calculateSimilarity('test', '')).toBe(0);
    });
  });

  describe('findSimilarStrings', () => {

    it('should find similar strings within distance threshold', () => {
      expect(results).toContain('stage');
      expect(results).toContain('state');
    });

    it('should respect maxResults parameter', () => {
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no matches', () => {
      expect(results).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(results).toEqual([]);
    });

    it('should return empty array for empty candidates', () => {
      expect(results).toEqual([]);
    });

    it('should sort by distance (most similar first)', () => {
      if (results.length > 1) {
          'stag',
          results[1].toLowerCase()
        );
        expect(firstDist).toBeLessThanOrEqual(secondDist);
      }
    });

    it('should use default thresholds from SIMILARITY_THRESHOLDS', () => {
      // Test that default maxDistance is applied
      expect(farResults.length).toBe(0);
    });

    it('should respect custom maxDistance option', () => {
        maxDistance: 1,
      });
        maxDistance: 5,
      });
      expect(lenientResults.length).toBeGreaterThanOrEqual(
        strictResults.length
      );
    });
  });

  describe('findSimilarStringsWithFallback', () => {
      'deal_stage',
      'opportunity_status',
      'company_name',
      'contact_email',
    ];

    it('should find distance matches first', () => {
      expect(results).toContain('deal_stage');
    });

    it('should fallback to substring matching when no distance matches', () => {
      expect(results).toContain('contact_email');
    });

    it('should respect maxResults in both modes', () => {
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array when nothing matches', () => {
        'completely_unrelated',
        candidates
      );
      expect(results).toEqual([]);
    });
  });

  describe('SIMILARITY_THRESHOLDS', () => {
    it('should have documented threshold values', () => {
      expect(SIMILARITY_THRESHOLDS.MIN_SIMILARITY_SCORE).toBe(0.6);
      expect(SIMILARITY_THRESHOLDS.MAX_TYPO_DISTANCE).toBe(2);
      expect(SIMILARITY_THRESHOLDS.MAX_SUGGESTION_DISTANCE).toBe(3);
    });

    it('should be readonly (const) at compile time', () => {
      // TypeScript enforces readonly at compile time, not runtime
      // In JavaScript, const objects can have their properties modified
      // We're just testing that the values are defined correctly
      expect(SIMILARITY_THRESHOLDS).toBeDefined();
      expect(Object.isFrozen(SIMILARITY_THRESHOLDS)).toBe(true); // Object should be frozen
    });
  });
});
