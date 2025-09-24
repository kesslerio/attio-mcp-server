/**
 * Tests for fuzzy stage matching in deal validation
 * Related to issue #728: Enhanced validation warnings UX for deal field mapping
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the API calls
vi.mock('../../src/api/operations/index.js', () => ({
  makeAttioRequest: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  logError: vi.fn(),
}));

describe('Deal Stage Fuzzy Matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStageSuggestions with Levenshtein distance', () => {
    // We'll test the fuzzy matching by importing and calling applyDealDefaultsWithValidation
    it('should provide suggestions for invalid stage names', async () => {
      const { makeAttioRequest } = await import(
        '../../src/api/operations/index.js'
      );

      // Mock the API response for getting deal stages
      vi.mocked(makeAttioRequest).mockResolvedValue({
        data: [
          { api_slug: 'qualified', title: 'Qualified' },
          { api_slug: 'negotiation', title: 'Negotiation' },
          { api_slug: 'closed-won', title: 'Closed Won' },
          { api_slug: 'closed-lost', title: 'Closed Lost' },
        ],
      });

      const { applyDealDefaultsWithValidation } = await import(
        '../../src/config/deal-defaults.js'
      );

      // Test with an invalid stage
      const result = await applyDealDefaultsWithValidation(
        { name: 'Test Deal', stage: 'invalid-stage' },
        false
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Should include available stages in suggestions
      const suggestionsText = result.suggestions.join(' ');
      // The actual implementation uses common stages or API response
      expect(suggestionsText).toContain('Qualified'); // Note: capital Q
      expect(suggestionsText).toContain('Negotiation'); // Note: capital N
    });

    it('should provide warnings for invalid stage names', async () => {
      const { makeAttioRequest } = await import(
        '../../src/api/operations/index.js'
      );

      // Mock the API response for getting deal stages
      vi.mocked(makeAttioRequest).mockResolvedValue({
        data: [
          { api_slug: 'qualified', title: 'Qualified' },
          { api_slug: 'negotiation', title: 'Negotiation' },
          { api_slug: 'closed-won', title: 'Closed Won' },
        ],
      });

      const { applyDealDefaultsWithValidation } = await import(
        '../../src/config/deal-defaults.js'
      );

      // Test with a completely different string
      const result = await applyDealDefaultsWithValidation(
        { name: 'Test Deal', stage: 'xyz123randomtext' },
        false
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('xyz123randomtext');
    });

    it('should handle empty stage list gracefully', async () => {
      const { makeAttioRequest } = await import(
        '../../src/api/operations/index.js'
      );

      // Mock empty API response
      vi.mocked(makeAttioRequest).mockResolvedValue({
        data: [],
      });

      const { applyDealDefaultsWithValidation } = await import(
        '../../src/config/deal-defaults.js'
      );

      const result = await applyDealDefaultsWithValidation(
        { name: 'Test Deal', stage: 'invalid-stage' },
        false
      );

      // Should still provide a warning even with no available stages
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('invalid-stage');
    });

    it('should work with valid stage names', async () => {
      const { makeAttioRequest } = await import(
        '../../src/api/operations/index.js'
      );

      // Mock the API response
      vi.mocked(makeAttioRequest).mockResolvedValue({
        data: [
          { api_slug: 'qualified', title: 'Qualified' },
          { api_slug: 'negotiation', title: 'Negotiation' },
        ],
      });

      const { applyDealDefaultsWithValidation } = await import(
        '../../src/config/deal-defaults.js'
      );

      const result = await applyDealDefaultsWithValidation(
        { name: 'Test Deal', stage: 'qualified' },
        false
      );

      // Should have no warnings for valid stage
      expect(result.warnings.length).toBe(0);
    });
  });
});
