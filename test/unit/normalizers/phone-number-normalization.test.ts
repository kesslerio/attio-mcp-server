/**
 * Unit tests for phone number normalization (Issue #798)
 *
 * Tests the phone number structure transformation from user-friendly formats
 * to the Attio API expected format with automatic E.164 normalization.
 *
 * NOTE: These are pure unit tests that do NOT make API calls.
 */

import { describe, it, expect } from 'vitest';
import { normalizeValues } from '../../../src/services/normalizers/AttributeAwareNormalizer.js';

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
        phone_numbers: [{ phone_number: '(212) 555-1234' }],
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
      const validE164 = '+15551234567';
      const result = await normalizeValues('people', {
        phone_numbers: [{ original_phone_number: validE164 }],
      });

      const phoneValue = (result.phone_numbers as Record<string, unknown>[])[0]
        .original_phone_number as string;
      expect(phoneValue).toBe(validE164);
    });

    it('should handle various common US phone formats', async () => {
      const formats = [
        '+1-212-555-1234',
        '(212) 555-1234',
        '212.555.1234',
        '+1 212 555 1234',
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

    // Additional international format tests (Codex suggestion)
    it('should handle UK phone numbers with proper E.164 format', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [{ phone_number: '+44 20 7946 0958' }],
      });

      const phoneValue = (result.phone_numbers as Record<string, unknown>[])[0]
        .original_phone_number as string;
      expect(phoneValue).toMatch(/^\+44\d+$/);
      expect(phoneValue).toContain('+44');
    });

    it('should handle Japan phone numbers with proper E.164 format', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [{ phone_number: '+81 3-1234-5678' }],
      });

      const phoneValue = (result.phone_numbers as Record<string, unknown>[])[0]
        .original_phone_number as string;
      expect(phoneValue).toMatch(/^\+81\d+$/);
      expect(phoneValue).toContain('+81');
    });

    it('should handle Australia phone numbers with proper E.164 format', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [{ phone_number: '+61 2 9374 4000' }],
      });

      const phoneValue = (result.phone_numbers as Record<string, unknown>[])[0]
        .original_phone_number as string;
      expect(phoneValue).toMatch(/^\+61\d+$/);
      expect(phoneValue).toContain('+61');
    });
  });

  describe('Field preservation', () => {
    it('should preserve label and type fields when transforming phone_number', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [
          {
            phone_number: '+1-555-0100',
            label: 'work',
            type: 'mobile',
          },
        ],
      });

      expect(result.phone_numbers).toHaveLength(1);
      const phone = (result.phone_numbers as Record<string, unknown>[])[0];
      expect(phone).toHaveProperty('original_phone_number');
      expect(phone).toHaveProperty('label', 'work');
      expect(phone).toHaveProperty('type', 'mobile');
      expect(phone).not.toHaveProperty('phone_number');
    });

    it('should preserve label field when using original_phone_number', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [
          {
            original_phone_number: '+1-555-0100',
            label: 'home',
          },
        ],
      });

      expect(result.phone_numbers).toHaveLength(1);
      const phone = (result.phone_numbers as Record<string, unknown>[])[0];
      expect(phone).toHaveProperty('original_phone_number');
      expect(phone).toHaveProperty('label', 'home');
    });

    it('should preserve multiple custom fields', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [
          {
            phone_number: '+1-555-0100',
            label: 'work',
            type: 'mobile',
            extension: '1234',
            is_primary: true,
          },
        ],
      });

      expect(result.phone_numbers).toHaveLength(1);
      const phone = (result.phone_numbers as Record<string, unknown>[])[0];
      expect(phone).toHaveProperty('original_phone_number');
      expect(phone).toHaveProperty('label', 'work');
      expect(phone).toHaveProperty('type', 'mobile');
      expect(phone).toHaveProperty('extension', '1234');
      expect(phone).toHaveProperty('is_primary', true);
      expect(phone).not.toHaveProperty('phone_number');
    });

    it('should preserve fields across multiple phone numbers', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [
          { phone_number: '+1-555-0100', label: 'work' },
          { phone_number: '+1-555-0199', label: 'home', type: 'landline' },
        ],
      });

      expect(result.phone_numbers).toHaveLength(2);
      const [phone1, phone2] = result.phone_numbers as Record<
        string,
        unknown
      >[];

      expect(phone1).toHaveProperty('label', 'work');
      expect(phone1).not.toHaveProperty('type');

      expect(phone2).toHaveProperty('label', 'home');
      expect(phone2).toHaveProperty('type', 'landline');
    });

    // Edge case: field preservation with invalid phone format (Codex suggestion)
    it('should preserve label and type even when phone format is invalid', async () => {
      const result = await normalizeValues('people', {
        phone_numbers: [
          {
            phone_number: 'invalid-phone-format',
            label: 'work',
            type: 'mobile',
          },
        ],
      });

      expect(result.phone_numbers).toHaveLength(1);
      const phone = (result.phone_numbers as Record<string, unknown>[])[0];
      expect(phone).toHaveProperty(
        'original_phone_number',
        'invalid-phone-format'
      );
      expect(phone).toHaveProperty('label', 'work');
      expect(phone).toHaveProperty('type', 'mobile');
      expect(phone).not.toHaveProperty('phone_number');
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
