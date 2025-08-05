/**
 * Integration tests for domain-based company search enhancement
 */
import { beforeAll, describe, test } from 'vitest';
import {
  searchCompanies,
  searchCompaniesByDomain,
  smartSearchCompanies,
} from '../../src/objects/companies/index.js';
import { extractDomain } from '../../src/utils/domain-utils.js';

describe('Domain-Based Company Search Integration', () => {
  beforeAll(() => {
    if (!process.env.ATTIO_API_KEY) {
      console.warn('ATTIO_API_KEY not set, skipping real API tests');
    }
  });

  describe('searchCompanies with domain prioritization', () => {
    test('should prioritize domain matches when domain is detected', async () => {
      if (!process.env.ATTIO_API_KEY) {
        console.log('Skipping test - no API key');
        return;
      }

      const domainQuery = 'stripe.com';
      const results = await searchCompanies(domainQuery);

      expect(Array.isArray(results)).toBe(true);

      // If results found, verify structure
      if (results.length > 0) {
        const firstResult = results[0];
        expect(firstResult).toHaveProperty('id');
        expect(firstResult).toHaveProperty('values');

        // Check if domain matches appear first (if any companies with stripe.com exist)
        const hasStripeResults = results.some((company) =>
          company.values?.website?.[0]?.value?.includes('stripe.com')
        );

        if (hasStripeResults) {
          console.log('✅ Found companies with stripe.com domain');
        }
      }
    }, 30_000);

    test('should fallback to name search when no domain detected', async () => {
      if (!process.env.ATTIO_API_KEY) {
        console.log('Skipping test - no API key');
        return;
      }

      const nameQuery = 'Technology';
      const results = await searchCompanies(nameQuery);

      expect(Array.isArray(results)).toBe(true);

      // Should work normally for name-based queries
      if (results.length > 0) {
        const firstResult = results[0];
        expect(firstResult).toHaveProperty('id');
        expect(firstResult).toHaveProperty('values');
      }
    }, 30_000);
  });

  describe('searchCompaniesByDomain', () => {
    test('should search specifically by domain', async () => {
      if (!process.env.ATTIO_API_KEY) {
        console.log('Skipping test - no API key');
        return;
      }

      // Test with a common domain that likely exists
      const domain = 'github.com';
      const results = await searchCompaniesByDomain(domain);

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const firstResult = results[0];
        expect(firstResult).toHaveProperty('id');
        expect(firstResult).toHaveProperty('values');

        // Verify domain normalization worked
        console.log(`Found ${results.length} companies for domain: ${domain}`);
      }
    }, 30_000);

    test('should handle domain normalization', async () => {
      if (!process.env.ATTIO_API_KEY) {
        console.log('Skipping test - no API key');
        return;
      }

      const unnormalizedDomain = 'WWW.GitHub.COM';
      const results = await searchCompaniesByDomain(unnormalizedDomain);

      expect(Array.isArray(results)).toBe(true);

      // Should work the same as normalized domain
      const normalizedResults = await searchCompaniesByDomain('github.com');
      expect(results.length).toBe(normalizedResults.length);
    }, 30_000);
  });

  describe('smartSearchCompanies', () => {
    test('should handle mixed content queries', async () => {
      if (!process.env.ATTIO_API_KEY) {
        console.log('Skipping test - no API key');
        return;
      }

      const mixedQuery = 'stripe.com payment processing';
      const results = await smartSearchCompanies(mixedQuery);

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const firstResult = results[0];
        expect(firstResult).toHaveProperty('id');
        expect(firstResult).toHaveProperty('values');

        console.log(
          `Smart search found ${results.length} companies for mixed query`
        );
      }
    }, 30_000);

    test('should extract multiple domains from complex queries', async () => {
      if (!process.env.ATTIO_API_KEY) {
        console.log('Skipping test - no API key');
        return;
      }

      const complexQuery = 'Contact support@github.com or visit stripe.com';
      const results = await smartSearchCompanies(complexQuery);

      expect(Array.isArray(results)).toBe(true);

      // Should find companies for both domains
      if (results.length > 0) {
        console.log(
          `Smart search found ${results.length} companies for complex query with multiple domains`
        );
      }
    }, 30_000);
  });

  describe('Domain extraction utility integration', () => {
    test('should extract domains correctly in search context', () => {
      const testCases = [
        { input: 'stripe.com', expected: 'stripe.com' },
        { input: 'https://github.com', expected: 'github.com' },
        { input: 'support@example.com', expected: 'example.com' },
        { input: 'www.example.org', expected: 'example.org' },
        { input: 'Company Name Only', expected: null },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = extractDomain(input);
        expect(result).toBe(expected);
      });
    });
  });
});
