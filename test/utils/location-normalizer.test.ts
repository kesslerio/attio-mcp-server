/**
 * Unit tests for location normalizer utility
 *
 * Tests the shared normalizeLocation function that ensures all 10 required
 * Attio location fields are present and maps common aliases.
 */
import { describe, it, expect } from 'vitest';
import { normalizeLocation } from '@/utils/location-normalizer.js';

describe('normalizeLocation', () => {
  describe('returns all 10 required fields', () => {
    it('should return all 10 location fields even from empty input', () => {
      const result = normalizeLocation({});

      expect(result).toHaveProperty('line_1');
      expect(result).toHaveProperty('line_2');
      expect(result).toHaveProperty('line_3');
      expect(result).toHaveProperty('line_4');
      expect(result).toHaveProperty('locality');
      expect(result).toHaveProperty('region');
      expect(result).toHaveProperty('postcode');
      expect(result).toHaveProperty('country_code');
      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(Object.keys(result)).toHaveLength(10);
    });

    it('should set missing fields to null', () => {
      const result = normalizeLocation({ line_1: '123 Main St' });

      expect(result.line_1).toBe('123 Main St');
      expect(result.line_2).toBeNull();
      expect(result.line_3).toBeNull();
      expect(result.line_4).toBeNull();
      expect(result.locality).toBeNull();
      expect(result.region).toBeNull();
      expect(result.postcode).toBeNull();
      expect(result.country_code).toBeNull();
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });
  });

  describe('alias mapping', () => {
    it('should map street → line_1', () => {
      const result = normalizeLocation({ street: '456 Oak Ave' });
      expect(result.line_1).toBe('456 Oak Ave');
    });

    it('should map address → line_1', () => {
      const result = normalizeLocation({ address: '789 Pine Blvd' });
      expect(result.line_1).toBe('789 Pine Blvd');
    });

    it('should map city → locality', () => {
      const result = normalizeLocation({ city: 'San Francisco' });
      expect(result.locality).toBe('San Francisco');
    });

    it('should map state → region', () => {
      const result = normalizeLocation({ state: 'California' });
      expect(result.region).toBe('California');
    });

    it('should map province → region', () => {
      const result = normalizeLocation({ province: 'Ontario' });
      expect(result.region).toBe('Ontario');
    });

    it('should map postal_code → postcode', () => {
      const result = normalizeLocation({ postal_code: '94102' });
      expect(result.postcode).toBe('94102');
    });

    it('should map zip → postcode', () => {
      const result = normalizeLocation({ zip: '10001' });
      expect(result.postcode).toBe('10001');
    });

    it('should map zip_code → postcode', () => {
      const result = normalizeLocation({ zip_code: '90210' });
      expect(result.postcode).toBe('90210');
    });

    it('should map country → country_code', () => {
      const result = normalizeLocation({ country: 'US' });
      expect(result.country_code).toBe('US');
    });

    it('should map lat → latitude', () => {
      const result = normalizeLocation({ lat: 37.7749 });
      expect(result.latitude).toBe(37.7749);
    });

    it('should map lng → longitude', () => {
      const result = normalizeLocation({ lng: -122.4194 });
      expect(result.longitude).toBe(-122.4194);
    });

    it('should map lon → longitude', () => {
      const result = normalizeLocation({ lon: -73.9857 });
      expect(result.longitude).toBe(-73.9857);
    });
  });

  describe('preserves canonical field names', () => {
    it('should preserve line_1 over aliases', () => {
      const result = normalizeLocation({
        line_1: 'Primary Address',
        street: 'Should Not Use',
        address: 'Also Not Used',
      });
      expect(result.line_1).toBe('Primary Address');
    });

    it('should preserve locality over city alias', () => {
      const result = normalizeLocation({
        locality: 'Proper City',
        city: 'Alias City',
      });
      expect(result.locality).toBe('Proper City');
    });

    it('should preserve region over state/province aliases', () => {
      const result = normalizeLocation({
        region: 'Proper Region',
        state: 'Alias State',
        province: 'Alias Province',
      });
      expect(result.region).toBe('Proper Region');
    });

    it('should preserve postcode over zip aliases', () => {
      const result = normalizeLocation({
        postcode: '12345',
        postal_code: '54321',
        zip: '11111',
        zip_code: '22222',
      });
      expect(result.postcode).toBe('12345');
    });

    it('should preserve country_code over country alias', () => {
      const result = normalizeLocation({
        country_code: 'GB',
        country: 'UK',
      });
      expect(result.country_code).toBe('GB');
    });

    it('should preserve latitude over lat alias', () => {
      const result = normalizeLocation({
        latitude: 51.5074,
        lat: 40.7128,
      });
      expect(result.latitude).toBe(51.5074);
    });

    it('should preserve longitude over lng/lon aliases', () => {
      const result = normalizeLocation({
        longitude: -0.1278,
        lng: -74.006,
        lon: -73.9857,
      });
      expect(result.longitude).toBe(-0.1278);
    });
  });

  describe('complete location object', () => {
    it('should normalize a typical US address', () => {
      const result = normalizeLocation({
        street: '28499 Orchard Lake Rd',
        city: 'Farmington Hills',
        state: 'Michigan',
        zip: '48334',
        country: 'US',
      });

      expect(result).toEqual({
        line_1: '28499 Orchard Lake Rd',
        line_2: null,
        line_3: null,
        line_4: null,
        locality: 'Farmington Hills',
        region: 'Michigan',
        postcode: '48334',
        country_code: 'US',
        latitude: null,
        longitude: null,
      });
    });

    it('should normalize a complete address with coordinates', () => {
      const result = normalizeLocation({
        line_1: '350 Fifth Avenue',
        line_2: 'Empire State Building',
        locality: 'New York',
        region: 'NY',
        postcode: '10118',
        country_code: 'US',
        latitude: 40.7484,
        longitude: -73.9857,
      });

      expect(result).toEqual({
        line_1: '350 Fifth Avenue',
        line_2: 'Empire State Building',
        line_3: null,
        line_4: null,
        locality: 'New York',
        region: 'NY',
        postcode: '10118',
        country_code: 'US',
        latitude: 40.7484,
        longitude: -73.9857,
      });
    });

    it('should handle international address with aliases', () => {
      const result = normalizeLocation({
        address: '221B Baker Street',
        city: 'London',
        postcode: 'NW1 6XE',
        country: 'GB',
        lat: 51.5238,
        lng: -0.1586,
      });

      expect(result).toEqual({
        line_1: '221B Baker Street',
        line_2: null,
        line_3: null,
        line_4: null,
        locality: 'London',
        region: null,
        postcode: 'NW1 6XE',
        country_code: 'GB',
        latitude: 51.5238,
        longitude: -0.1586,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values', () => {
      const result = normalizeLocation({
        line_1: '',
        locality: '',
      });

      // Empty strings are preserved (not converted to null)
      expect(result.line_1).toBe('');
      expect(result.locality).toBe('');
    });

    it('should handle zero values for coordinates', () => {
      // Zero is a valid coordinate (equator/prime meridian)
      const result = normalizeLocation({
        latitude: 0,
        longitude: 0,
      });

      expect(result.latitude).toBe(0);
      expect(result.longitude).toBe(0);
    });

    it('should handle false-y values correctly', () => {
      const result = normalizeLocation({
        line_1: 0 as unknown as string, // Edge case: numeric 0
        latitude: false as unknown as number, // Edge case: boolean false
      });

      // Nullish coalescing preserves 0 and false
      expect(result.line_1).toBe(0);
      expect(result.latitude).toBe(false);
    });

    it('should not include attribute_type in output', () => {
      // Per Attio docs, attribute_type appears in read responses but is NOT required in writes
      const result = normalizeLocation({
        line_1: '123 Main St',
        attribute_type: 'location', // This should be ignored
      });

      expect(result).not.toHaveProperty('attribute_type');
      expect(Object.keys(result)).toHaveLength(10);
    });
  });
});
