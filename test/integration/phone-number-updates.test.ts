/**
 * Integration tests for phone number normalization (Issue #798)
 *
 * Tests the phone number structure transformation from user-friendly formats
 * to the Attio API expected format with automatic E.164 normalization.
 */

import { describe, it, expect } from 'vitest';
import { normalizeValues } from '../../src/services/normalizers/AttributeAwareNormalizer.js';

describe('Phone number normalization (Issue #798)', () => {
  describe('Structure transformation', () => {
    it('should transform phone_number to original_phone_number', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [{ phone_number: '+1-555-0100' }],
      });

      expect(result.phone_numbers).toHaveLength(1);
      expect(
        (result.phone_numbers as Record<string, unknown>[])[0]
      ).toHaveProperty('original_phone_number');
      expect(
        (result.phone_numbers as Record<string, unknown>[])[0]
      ).not.toHaveProperty('phone_number');
    });

    it('should preserve already-correct original_phone_number format', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [{ original_phone_number: '+1-555-0100' }],
      });

      expect(result.phone_numbers).toHaveLength(1);
      expect(
        (result.phone_numbers as Record<string, unknown>[])[0]
      ).toHaveProperty('original_phone_number');
    });

    it('should handle multiple phone numbers with mixed formats', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [
          { phone_number: '+1-555-0100' },
          { original_phone_number: '+1-555-0199' },
        ],
      });

      expect(result.phone_numbers).toHaveLength(2);
      expect(
        (result.phone_numbers as Record<string, unknown>[])[0]
      ).toHaveProperty('original_phone_number');
      expect(
        (result.phone_numbers as Record<string, unknown>[])[1]
      ).toHaveProperty('original_phone_number');
    });

    it('should convert string phone numbers to object format', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: ['+1-555-0100'],
      });

      expect(result.phone_numbers).toHaveLength(1);
      expect(
        (result.phone_numbers as Record<string, unknown>[])[0]
      ).toHaveProperty('original_phone_number');
    });
  });

  describe('E.164 normalization', () => {
    it('should normalize US phone format to E.164', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [{ phone_number: '(555) 010-0100' }],
      });

      const phoneValue = (result.phone_numbers as Record<string, unknown>[])[0]
        .original_phone_number as string;
      // E.164 format: +[country code][number] with no separators
      expect(phoneValue).toMatch(/^\+1\d{10}$/);
    });

    it('should handle international phone numbers', async () => {
      const testCases = [
        { input: '+44-20-5555-0100', countryCode: '+44' }, // UK
        { input: '+81-3-5555-0100', countryCode: '+81' }, // Japan
        { input: '+61-2-5555-0100', countryCode: '+61' }, // Australia
      ];

      for (const testCase of testCases) {
        const result = await normalizeValues('people', {
          phone_numbers: [{ phone_number: testCase.input }],
        });

        const phoneValue = (
          result.phone_numbers as Record<string, unknown>[]
        )[0].original_phone_number as string;
        expect(phoneValue).toContain(testCase.countryCode);
      }
    });

    it('should preserve valid E.164 format', async () => {
      const validE164 = '+15550100';
      const result = await normalizeValues('people', {
        phone_numbers: [{ original_phone_number: validE164 }],
      });

      const phoneValue = (result.phone_numbers as Record<string, unknown>[])[0]
        .original_phone_number as string;
      expect(phoneValue).toBe(validE164);
    });

    it('should handle various common US phone formats', async () => {
      const formats = [
        '+1-555-0100',
        '(555) 010-0100',
        '555.010.0100',
        '+1 555 010 0100',
      ];

      for (const format of formats) {
        const result = await normalizeValues('people', {
          phone_numbers: [{ phone_number: format }],
        });

        const phoneValue = (
          result.phone_numbers as Record<string, unknown>[]
        )[0].original_phone_number as string;
        // All should normalize to E.164 format
        expect(phoneValue).toMatch(/^\+1\d{10}$/);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty phone numbers array', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [],
      });

      expect(result.phone_numbers).toHaveLength(0);
    });

    it('should pass through non-phone fields unchanged', async () => {
      const result = await normalizeValues('people', {
        name: 'Jane Doe',
        email_addresses: ['jane.doe@example.com'],
        phone_numbers: [{ phone_number: '+1-555-0100' }],
      });

      expect(result.name).toBe('Jane Doe');
      expect(result.email_addresses).toEqual(['jane.doe@example.com']);
    });

    it('should handle invalid phone format gracefully', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [{ phone_number: 'invalid' }],
      });

      // Should still transform structure even if format invalid
      expect(
        (result.phone_numbers as Record<string, unknown>[])[0]
      ).toHaveProperty('original_phone_number');
    });

    it('should handle null/undefined phone values', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [{ phone_number: null }],
      });

      expect(result.phone_numbers).toHaveLength(1);
      expect(
        (result.phone_numbers as Record<string, unknown>[])[0]
      ).toHaveProperty('original_phone_number');
    });
  });

  describe('Backward compatibility', () => {
    it('should not break existing correct formats', async () => {
      const correctFormat = {
        phone_numbers: [
          { original_phone_number: '+1-555-0100' },
          { original_phone_number: '+1-555-0199' },
        ],
      };

      const result = await normalizeValues('people', correctFormat);

      expect(result.phone_numbers).toHaveLength(2);
      expect(
        (result.phone_numbers as Record<string, unknown>[])[0]
      ).toHaveProperty('original_phone_number');
      expect(
        (result.phone_numbers as Record<string, unknown>[])[1]
      ).toHaveProperty('original_phone_number');
    });

    it('should handle mixed resource types without affecting non-phone fields', async () => {
      const result = await normalizeValues('companies', {
        name: 'Acme Corp',
        primary_phone: '+1-555-0150', // Company phone field
      });

      expect(result.name).toBe('Acme Corp');
      // Phone field should be normalized but structure check depends on field name
      expect(result.primary_phone).toBeDefined();
    });
  });
});
