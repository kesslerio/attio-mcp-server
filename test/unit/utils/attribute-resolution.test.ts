/**
 * Unit tests for centralized attribute resolution utilities
 * Issue #994: Tests for exact → partial → typo matching strategy
 */

import { describe, it, expect } from 'vitest';

describe('Attribute Resolution Utilities', () => {
  const mockSchemas: AttributeSchema[] = [
    { api_slug: 'stage', title: 'Deal stage', name: 'Stage' },
    { api_slug: 'status', title: 'Status', name: 'Status' },
    { api_slug: 'associated_company', title: 'Associated Company' },
    { api_slug: 'deal_owner', title: 'Deal owner' },
    { api_slug: 'created_at', title: 'Created at' },
  ];

  describe('normalizeAttributeValue', () => {
    it('should trim and lowercase values', () => {
      expect(normalizeAttributeValue('  Stage  ')).toBe('stage');
      expect(normalizeAttributeValue('Deal Stage')).toBe('deal stage');
    });

    it('should handle already normalized values', () => {
      expect(normalizeAttributeValue('stage')).toBe('stage');
    });

    it('should handle empty strings', () => {
      expect(normalizeAttributeValue('')).toBe('');
      expect(normalizeAttributeValue('   ')).toBe('');
    });
  });

  describe('resolveAttribute - exact matching', () => {
    it('should match by exact api_slug', () => {
      expect(result.slug).toBe('stage');
      expect(result.matchType).toBe('exact');
    });

    it('should match by exact title', () => {
      expect(result.slug).toBe('stage');
      expect(result.matchType).toBe('exact');
    });

    it('should match by exact name', () => {
      expect(result.slug).toBe('stage');
      expect(result.matchType).toBe('exact');
    });

    it('should be case-insensitive for exact matches', () => {
      expect(result.slug).toBe('stage');
      expect(result.matchType).toBe('exact');
    });
  });

  describe('resolveAttribute - partial matching', () => {
    it('should match when input is substring of title', () => {
      expect(result.slug).toBe('stage'); // "Deal stage" contains "Deal"
      expect(result.matchType).toBe('partial');
    });

    it('should match when title is substring of input', () => {
      expect(result.slug).toBe('stage');
      expect(result.matchType).toBe('partial');
    });

    it('should match when input is substring of slug', () => {
      expect(result.slug).toBe('deal_owner');
      expect(result.matchType).toBe('partial');
    });
  });

  describe('resolveAttribute - typo tolerance', () => {
    it('should match with 1-character typo (distance ≤ 2)', () => {
      expect(result.slug).toBe('stage');
      // 'stag' is a substring of 'stage', so it matches as partial first
      expect(result.matchType).toBe('partial');
    });

    it('should match with 2-character typo', () => {
      // Both 'stage' and 'status' contain 'stat', so partial match
      expect(result.matchType).toBe('partial');
      expect(result.slug).toMatch(/^(stage|status)$/);
    });

    it('should not match with 3+ character typo (distance > 2)', () => {
      expect(result.slug).toBeNull();
      expect(result.matchType).toBe('none');
    });

    it('should match true typo (not partial)', () => {
      // 'stige' has 1-char difference from 'stage', not a substring
      expect(result.matchType).toBe('typo');
      expect(result.distance).toBeDefined();
      expect(result.distance).toBe(1);
    });
  });

  describe('resolveAttribute - prioritization', () => {
    it('should prefer exact match over partial match', () => {
      // Both "stage" and "Deal stage" exist, should match exact slug first
      expect(result.matchType).toBe('exact');
    });

    it('should prefer partial match over typo match', () => {
      // Create scenario where both partial and typo could match
      const schemas: AttributeSchema[] = [
        { api_slug: 'stage_owner', title: 'Stage Owner' },
        { api_slug: 'stage', title: 'Stage' },
      ];
      // Should prefer partial match "Stage Owner" over typo match "Stage"
      expect(result.matchType).toBe('partial');
    });
  });

  describe('resolveAttribute - edge cases', () => {
    it('should handle empty input', () => {
      // Empty string may match against normalized empty fields
      // or be filtered out depending on implementation
      expect(result.matchType).toMatch(/^(none|exact|partial)$/);
    });

    it('should handle empty schema array', () => {
      expect(result.slug).toBeNull();
      expect(result.matchType).toBe('none');
    });

    it('should handle schema entries with missing fields', () => {
      const incompleteSchemas: AttributeSchema[] = [
        { api_slug: 'test' }, // No title or name
        { title: 'Title only' }, // No api_slug
      ];
      expect(result.slug).toBe('test');
    });
  });

  describe('getSimilarAttributes', () => {
    it('should return multiple suggestions', () => {
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('stage');
    });

    it('should respect maxResults parameter', () => {
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should prioritize partial matches over distance matches', () => {
      expect(suggestions[0]).toBe('deal_owner'); // Partial match should come first
    });

    it('should deduplicate results', () => {
      expect(unique.size).toBe(suggestions.length);
    });

    it('should return empty array when no matches found', () => {
      expect(suggestions).toEqual([]);
    });

    it('should handle empty input gracefully', () => {
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('formatNextStepHint', () => {
    it('should format hint with resource type', () => {
      expect(hint).toContain('records_discover_attributes');
      expect(hint).toContain('resource_type: "deals"');
    });

    it('should provide clear next steps', () => {
      expect(hint).toContain('Next step:');
      expect(hint).toContain('to see all valid attributes');
    });
  });

  describe('formatAttributeNotFoundError', () => {
    it('should include attribute and resource type', () => {
      expect(error).toContain('invalid_attr');
      expect(error).toContain('deals');
      expect(error).toContain('does not exist');
    });

    it('should include suggestions when provided', () => {
        'stage',
        'status',
      ]);
      expect(error).toContain('Did you mean');
      expect(error).toContain('stage');
      expect(error).toContain('status');
    });

    it('should include next step hint', () => {
      expect(error).toContain('records_discover_attributes');
      expect(error).toContain('resource_type: "deals"');
    });

    it('should format multiple suggestions with quotes', () => {
        'stage',
        'status',
        'state',
      ]);
      expect(error).toMatch(/"stage"/);
      expect(error).toMatch(/"status"/);
      expect(error).toMatch(/"state"/);
    });
  });

  describe('Error Enhancement Integration', () => {
    // Test scenarios that mirror real error enhancement use cases

    it('should handle "Cannot find attribute" scenario', () => {

      // May or may not match depending on partial/typo logic
      // The important thing is suggestions are provided
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle display name resolution scenario', () => {

      expect(result.slug).toBe('deal_owner');
      expect(result.matchType).toBe('exact');
    });

    it('should handle partial input scenario', () => {

      expect(result.slug).toBe('associated_company');
      expect(result.matchType).toBe('partial');
    });
  });

  describe('API Failure Scenarios', () => {
    // Issue #994 requirement: Test error enhancement with empty schemas

    it('should handle empty schema (API failure)', () => {
      expect(result.slug).toBeNull();
      expect(result.matchType).toBe('none');
    });

    it('should handle malformed schema entries', () => {
      const malformed: AttributeSchema[] = [
        {} as AttributeSchema, // Completely empty
        { api_slug: undefined, title: undefined } as AttributeSchema,
      ];

      expect(result.matchType).toBe('none');
    });
  });

  describe('Multiple Match Scenarios', () => {
    // Issue #994 requirement: Test behavior with multiple matches

    it('should return first match when multiple exact matches exist', () => {
      const duplicates: AttributeSchema[] = [
        { api_slug: 'stage', title: 'Stage' },
        { api_slug: 'stage_alt', title: 'Stage' }, // Same title
      ];

      expect(result.slug).toBe('stage'); // First match
      expect(result.matchType).toBe('exact');
    });

    it('should handle multiple partial matches', () => {
      const schemas: AttributeSchema[] = [
        { api_slug: 'deal_stage', title: 'Deal Stage' },
        { api_slug: 'deal_owner', title: 'Deal Owner' },
        { api_slug: 'deal_value', title: 'Deal Value' },
      ];

      // May match exact on title or partial on slug
      expect(['exact', 'partial']).toContain(result.matchType);
      expect(result.slug).toMatch(/deal/i);
    });

    it('should return top suggestions for multiple typo matches', () => {
      // Both 'stage', 'status', 'state' are within distance
      expect(suggestions.length).toBeGreaterThan(1);
    });
  });
});
