/**
 * Split: field-mapper – transformFieldValue and mapTaskFields
 */
import { describe, it, expect } from 'vitest';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';
import {
  transformFieldValue,
  mapTaskFields,
} from '../../../../src/handlers/tool-configs/universal/field-mapper.js';

describe('field-mapper – transform + task mapping', () => {
  describe('transformFieldValue()', () => {
    it('transforms boolean-ish values for tasks', async () => {
      const result = await transformFieldValue(
        UniversalResourceType.TASKS,
        'is_completed',
        'true'
      );
      expect(result).toBe(true);
    });

    it('transforms various boolean-ish inputs', async () => {
      const cases: Array<[string, boolean]> = [
        ['done', true],
        ['complete', true],
        ['false', false],
        ['open', false],
        ['1', true],
        ['0', false],
      ];
      for (const [input, expected] of cases) {
        const res = await transformFieldValue(
          UniversalResourceType.TASKS,
          'is_completed',
          input
        );
        expect(res).toBe(expected);
      }
    });

    it('handles arrays for assignees field', async () => {
      const res = await transformFieldValue(
        UniversalResourceType.TASKS,
        'assignees',
        'user123'
      );
      expect(Array.isArray(res)).toBe(true);
    });

    it('returns original when no transformation needed', async () => {
      const res = await transformFieldValue(
        UniversalResourceType.COMPANIES,
        'name',
        'Test Corp'
      );
      expect(res).toBe('Test Corp');
    });

    it('handles date transformations', async () => {
      const res = await transformFieldValue(
        UniversalResourceType.TASKS,
        'deadline_at',
        '2024-12-31'
      );
      expect(typeof res === 'string' || res instanceof Date).toBe(true);
    });

    // Location field transformations (Issue #987 UX improvement)
    describe('location field transformations', () => {
      it('passes through string values for location fields', async () => {
        const res = await transformFieldValue(
          UniversalResourceType.COMPANIES,
          'primary_location',
          '123 Main St, San Francisco, CA 94102'
        );
        expect(res).toBe('123 Main St, San Francisco, CA 94102');
      });

      it('normalizes incomplete location object with all required fields', async () => {
        const input = {
          line_1: '28499 Orchard Lake Rd',
          locality: 'Farmington Hills',
          region: 'Michigan',
          postcode: '48334',
          country_code: 'US',
        };
        const res = await transformFieldValue(
          UniversalResourceType.COMPANIES,
          'primary_location',
          input
        );

        expect(res).toEqual({
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

      it('maps common field aliases to Attio field names', async () => {
        const input = {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US',
          lat: 37.7749,
          lng: -122.4194,
        };
        const res = await transformFieldValue(
          UniversalResourceType.COMPANIES,
          'primary_location',
          input
        );

        expect(res).toEqual({
          line_1: '123 Main St',
          line_2: null,
          line_3: null,
          line_4: null,
          locality: 'San Francisco',
          region: 'CA',
          postcode: '94102',
          country_code: 'US',
          latitude: 37.7749,
          longitude: -122.4194,
        });
      });

      it('works for people location field', async () => {
        const input = {
          locality: 'New York',
          region: 'NY',
          country_code: 'US',
        };
        const res = await transformFieldValue(
          UniversalResourceType.PEOPLE,
          'location',
          input
        );

        expect(res).toHaveProperty('locality', 'New York');
        expect(res).toHaveProperty('region', 'NY');
        expect(res).toHaveProperty('line_1', null);
        expect(res).toHaveProperty('latitude', null);
      });

      it('preserves existing values when normalizing', async () => {
        const input = {
          line_1: '123 Main St',
          line_2: 'Suite 100',
          locality: 'Boston',
          region: 'MA',
          postcode: '02101',
          country_code: 'US',
          latitude: 42.3601,
          longitude: -71.0589,
        };
        const res = (await transformFieldValue(
          UniversalResourceType.COMPANIES,
          'primary_location',
          input
        )) as Record<string, unknown>;

        expect(res.line_1).toBe('123 Main St');
        expect(res.line_2).toBe('Suite 100');
        expect(res.latitude).toBe(42.3601);
        expect(res.longitude).toBe(-71.0589);
        expect(res).not.toHaveProperty('attribute_type'); // Not required in write payload
      });
    });
  });

  describe('mapTaskFields()', () => {
    it('synthesizes content from title during create', () => {
      const result = mapTaskFields('create', { title: 'Task Title' });
      expect(result.content).toBe('Task Title');
      expect(result.title).toBe('Task Title');
    });

    it('does not synthesize content during update', () => {
      const result = mapTaskFields('update', { title: 'Task Title' });
      expect(result.title).toBe('Task Title');
      expect((result as any).content).toBeUndefined();
    });

    it('preserves existing content during create', () => {
      const result = mapTaskFields('create', {
        title: 'Task Title',
        content: 'Existing Content',
      });
      expect(result.content).toBe('Existing Content');
      expect(result.title).toBe('Task Title');
    });

    it('handles missing fields gracefully', () => {
      const result = mapTaskFields('create', {} as any);
      expect(typeof result).toBe('object');
    });

    it('preserves unmapped fields', () => {
      const result = mapTaskFields('create', {
        custom_field: 'custom_value',
      } as any);
      expect((result as any).custom_field).toBe('custom_value');
    });

    it('handles both operations correctly', () => {
      const c = mapTaskFields('create', { title: 'Task Title' });
      const u = mapTaskFields('update', { title: 'Task Title' });
      expect(c.content).toBe('Task Title');
      expect((u as any).content).toBeUndefined();
    });
  });
});
