/**
 * Unit tests for domain utility functions
 */
import { describe, expect, it, test } from 'vitest';
import {
  extractAllDomains,
  extractDomain,
  hasDomainIndicators,
  isValidDomain,
  normalizeDomain,
} from '../../src/utils/domain-utils.js';

describe('Domain Utilities', () => {
  describe('extractDomain', () => {
    test('should extract domain from simple domain', () => {
      expect(extractDomain('example.com')).toBe('example.com');
      expect(extractDomain('subdomain.example.com')).toBe(
        'subdomain.example.com'
      );
    });

    test('should extract domain from URLs', () => {
      expect(extractDomain('https://example.com')).toBe('example.com');
      expect(extractDomain('http://example.com/path')).toBe('example.com');
      expect(extractDomain('https://www.example.com/path?query=1')).toBe(
        'example.com'
      );
    });

    test('should extract domain from email addresses', () => {
      expect(extractDomain('user@example.com')).toBe('example.com');
      expect(extractDomain('john.doe@subdomain.example.org')).toBe(
        'subdomain.example.org'
      );
    });

    test('should handle invalid inputs', () => {
      expect(extractDomain('')).toBeNull();
      expect(extractDomain('not-a-domain')).toBeNull();
      expect(extractDomain('company name only')).toBeNull();
      expect(extractDomain('123')).toBeNull();
    });

    test('should extract domain from text containing domains', () => {
      expect(extractDomain('Visit https://example.com for more')).toBe(
        'example.com'
      );
      expect(extractDomain('www.example.com')).toBe('example.com');
    });
  });

  describe('isValidDomain', () => {
    test('should validate correct domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('subdomain.example.com')).toBe(true);
      expect(isValidDomain('test-site.co.uk')).toBe(true);
      expect(isValidDomain('api.v2.example.io')).toBe(true);
    });

    test('should reject invalid domains', () => {
      expect(isValidDomain('')).toBe(false);
      expect(isValidDomain('example')).toBe(false);
      expect(isValidDomain('.com')).toBe(false);
      expect(isValidDomain('example.')).toBe(false);
      expect(isValidDomain('ex..ample.com')).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(isValidDomain('a.co')).toBe(true);
      expect(isValidDomain('test.museum')).toBe(true);
      expect(isValidDomain('123.com')).toBe(true);
    });
  });

  describe('normalizeDomain', () => {
    test('should normalize domains correctly', () => {
      expect(normalizeDomain('Example.Com')).toBe('example.com');
      expect(normalizeDomain('WWW.Example.COM')).toBe('example.com');
      expect(normalizeDomain('www.subdomain.example.com')).toBe(
        'subdomain.example.com'
      );
    });

    test('should handle empty input', () => {
      expect(normalizeDomain('')).toBe('');
      expect(normalizeDomain('   ')).toBe('');
    });

    test('should preserve subdomain structure', () => {
      expect(normalizeDomain('api.example.com')).toBe('api.example.com');
      expect(normalizeDomain('www.api.example.com')).toBe('api.example.com');
    });
  });

  describe('hasDomainIndicators', () => {
    test('should detect domain indicators in text', () => {
      expect(hasDomainIndicators('Visit example.com')).toBe(true);
      expect(hasDomainIndicators('Email user@company.org')).toBe(true);
      expect(hasDomainIndicators('Check https://site.io')).toBe(true);
      expect(hasDomainIndicators('www.example.net')).toBe(true);
    });

    test('should not detect domains in plain text', () => {
      expect(hasDomainIndicators('company name only')).toBe(false);
      expect(hasDomainIndicators('search for tech solutions')).toBe(false);
      expect(hasDomainIndicators('123 456 789')).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(hasDomainIndicators('')).toBe(false);
      expect(hasDomainIndicators('   ')).toBe(false);
      expect(hasDomainIndicators('example')).toBe(false);
    });
  });

  describe('extractAllDomains', () => {
    test('should extract single domain', () => {
      expect(extractAllDomains('example.com')).toEqual(['example.com']);
      expect(extractAllDomains('user@example.com')).toEqual(['example.com']);
    });

    test('should extract multiple domains', () => {
      const result = extractAllDomains(
        'Contact user@example.com or visit https://another.org'
      );
      expect(result).toContain('example.com');
      expect(result).toContain('another.org');
      expect(result).toHaveLength(2);
    });

    test('should remove duplicates', () => {
      const result = extractAllDomains(
        'user@example.com and https://example.com'
      );
      expect(result).toEqual(['example.com']);
    });

    test('should handle complex text', () => {
      const text =
        'Email support@company.com, visit https://www.company.com or try api.company.com';
      const result = extractAllDomains(text);
      expect(result).toContain('company.com');
      expect(result).toContain('api.company.com');
    });

    test('should handle empty input', () => {
      expect(extractAllDomains('')).toEqual([]);
      expect(extractAllDomains('no domains here')).toEqual([]);
    });

    test('should normalize extracted domains', () => {
      const result = extractAllDomains(
        'Visit WWW.Example.COM and API.Example.COM'
      );
      expect(result).toContain('example.com');
      expect(result).toContain('api.example.com');
    });
  });
});
