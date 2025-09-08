/**
 * Split: field-mapper – transformFieldValue and mapTaskFields
 */
import { describe, it, expect } from 'vitest';

import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';

describe('field-mapper – transform + task mapping', () => {
  describe('transformFieldValue()', () => {
    it('transforms boolean-ish values for tasks', async () => {
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
          UniversalResourceType.TASKS,
          'is_completed',
          input
        );
        expect(res).toBe(expected);
      }
    });

    it('handles arrays for assignees field', async () => {
        UniversalResourceType.TASKS,
        'assignees',
        'user123'
      );
      expect(Array.isArray(res)).toBe(true);
    });

    it('returns original when no transformation needed', async () => {
        UniversalResourceType.COMPANIES,
        'name',
        'Test Corp'
      );
      expect(res).toBe('Test Corp');
    });

    it('handles date transformations', async () => {
        UniversalResourceType.TASKS,
        'deadline_at',
        '2024-12-31'
      );
      expect(typeof res === 'string' || res instanceof Date).toBe(true);
    });
  });

  describe('mapTaskFields()', () => {
    it('synthesizes content from title during create', () => {
      expect(result.content).toBe('Task Title');
      expect(result.title).toBe('Task Title');
    });

    it('does not synthesize content during update', () => {
      expect(result.title).toBe('Task Title');
      expect((result as any).content).toBeUndefined();
    });

    it('preserves existing content during create', () => {
        title: 'Task Title',
        content: 'Existing Content',
      });
      expect(result.content).toBe('Existing Content');
      expect(result.title).toBe('Task Title');
    });

    it('handles missing fields gracefully', () => {
      expect(typeof result).toBe('object');
    });

    it('preserves unmapped fields', () => {
        custom_field: 'custom_value',
      } as any);
      expect((result as any).custom_field).toBe('custom_value');
    });

    it('handles both operations correctly', () => {
      expect(c.content).toBe('Task Title');
      expect((u as any).content).toBeUndefined();
    });
  });
});
