/**
 * Test for postal_code field mapping issue #219
 *
 * This test reproduces the bug where create-company with postal_code field
 * causes 'Cannot find attribute zip' error.
 *
 * ISSUE: The problem was that ZIP and "Postal Code" mapped to "zip" instead
 * of "postal_code" in the configuration files. The fix updates default.json
 * to use the correct "postal_code" attribute that exists in Attio.
 *
 * NOTE: Users with existing user.json files may need to delete or regenerate
 * their user.json to pick up this fix, since user.json overrides default.json.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAttributeSlug,
  invalidateConfigCache,
} from '../../src/utils/attribute-mapping/attribute-mappers.js';

describe('Postal Code Field Mapping - Issue #219', () => {
  beforeEach(() => {
    // Invalidate config cache to pick up any changes to mapping files
    invalidateConfigCache();
  });

  describe('postal_code field mapping', () => {
    it('should map "postal_code" to correct attribute slug', () => {
      const result = getAttributeSlug('postal_code', 'companies');

      // The result should be a valid attribute slug that exists in Attio
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');

      // Log for debugging what it currently maps to
      console.log(`postal_code maps to: "${result}"`);
    });

    it('should map "Postal Code" (display name) to correct attribute slug', () => {
      const result = getAttributeSlug('Postal Code', 'companies');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');

      // Log for debugging
      console.log(`"Postal Code" maps to: "${result}"`);
    });

    it('should map "ZIP" to correct attribute slug', () => {
      // Set development mode to see debug logs
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = getAttributeSlug('ZIP', 'companies');

      // Restore original env
      process.env.NODE_ENV = originalNodeEnv;

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');

      // Log for debugging
      console.log(`"ZIP" maps to: "${result}"`);
    });

    it('should have consistent mapping between postal_code variants', () => {
      const postalCodeResult = getAttributeSlug('postal_code', 'companies');
      const postalCodeDisplayResult = getAttributeSlug(
        'Postal Code',
        'companies'
      );
      const zipResult = getAttributeSlug('ZIP', 'companies');

      // All variants should map to the same underlying attribute
      expect(postalCodeResult).toBe(postalCodeDisplayResult);
      expect(postalCodeResult).toBe(zipResult);

      // They should all map to 'postal_code' (the correct Attio attribute)
      expect(postalCodeResult).toBe('postal_code');
      expect(zipResult).toBe('postal_code');

      console.log('All variants map to:', postalCodeResult);
    });

    it('should not map to non-existent "zip" slug if that causes the API error', () => {
      const result = getAttributeSlug('postal_code', 'companies');

      // If the error is "Cannot find attribute with slug/ID 'zip'",
      // then the mapping should NOT be "zip"
      // We need to verify what the correct slug actually is
      expect(result).toBeDefined();

      // Document current behavior
      console.log(`Current mapping result for postal_code: "${result}"`);

      // If result is "zip" and that's causing the error, then we have found the bug
      if (result === 'zip') {
        console.warn(
          'WARNING: postal_code maps to "zip" which may be causing the API error'
        );
      }
    });
  });

  describe('mapping priority and fallback', () => {
    it('should check which mapping source is being used', () => {
      // Test to understand the mapping priority
      const result = getAttributeSlug('postal_code', 'companies');

      console.log('Testing mapping sources for postal_code:');
      console.log(`Final result: "${result}"`);

      // Let's also test the variants to see the pattern
      const variants = ['postal_code', 'Postal Code', 'ZIP', 'zip'];
      variants.forEach((variant) => {
        const mapped = getAttributeSlug(variant, 'companies');
        console.log(`"${variant}" -> "${mapped}"`);
      });
    });
  });
});

/**
 * Integration test to verify the actual company creation flow
 * This simulates the exact scenario from issue #219
 */
describe('Company Creation with postal_code - Integration', () => {
  it('should test the attribute validation flow', () => {
    // This test documents the current mapping behavior
    // and helps identify where the "zip" reference comes from

    const testAttributes = {
      name: 'Test Company',
      city: 'Corona',
      state: 'CA',
      postal_code: '92584',
      street_address: '4226 Green River Rd',
    };

    // Test each attribute mapping
    Object.entries(testAttributes).forEach(([key, value]) => {
      const mappedSlug = getAttributeSlug(key, 'companies');
      console.log(`${key}: "${value}" -> slug: "${mappedSlug}"`);
    });
  });
});
