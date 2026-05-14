/**
 * Unit tests for list-templates module.
 */
import { describe, it, expect } from 'vitest';
import {
  LIST_TEMPLATES,
  expandTemplate,
  getTemplateNames,
} from '@/services/lists/list-templates.js';

describe('list-templates', () => {
  describe('LIST_TEMPLATES', () => {
    it('contains three initial templates', () => {
      expect(Object.keys(LIST_TEMPLATES)).toHaveLength(3);
      expect(LIST_TEMPLATES.sales_pipeline).toBeDefined();
      expect(LIST_TEMPLATES.recruiting_tracker).toBeDefined();
      expect(LIST_TEMPLATES.support_queue).toBeDefined();
    });

    it('each template has required fields', () => {
      for (const template of Object.values(LIST_TEMPLATES)) {
        expect(template.name).toBeTruthy();
        expect(template.parent_object).toBeTruthy();
        expect(template.attributes).toBeDefined();
      }
    });
  });

  describe('getTemplateNames', () => {
    it('returns all template keys', () => {
      const names = getTemplateNames();
      expect(names).toContain('sales_pipeline');
      expect(names).toContain('recruiting_tracker');
      expect(names).toContain('support_queue');
    });
  });

  describe('expandTemplate', () => {
    it('expands a template with defaults', () => {
      const result = expandTemplate('sales_pipeline');
      expect(result.name).toBe('Sales Pipeline');
      expect(result.parent_object).toBe('companies');
      expect(result.description).toBe('Track deals through pipeline stages');
      expect(result.stages).toBeDefined();
    });

    it('merges caller overrides onto template defaults', () => {
      const result = expandTemplate('sales_pipeline', {
        name: 'My Pipeline',
      });
      expect(result.name).toBe('My Pipeline');
      expect(result.parent_object).toBe('companies'); // default preserved
    });

    it('preserves template description when caller does not override', () => {
      const result = expandTemplate('sales_pipeline', { name: 'Custom' });
      expect(result.description).toBe('Track deals through pipeline stages');
    });

    it('allows caller to override description', () => {
      const result = expandTemplate('sales_pipeline', {
        description: 'Custom desc',
      });
      expect(result.description).toBe('Custom desc');
    });

    it('throws for unknown template name', () => {
      expect(() => expandTemplate('unknown_template')).toThrow(
        /Unknown template "unknown_template"/
      );
    });

    it('error message lists valid templates', () => {
      try {
        expandTemplate('nonexistent');
      } catch (e) {
        expect((e as Error).message).toContain('sales_pipeline');
        expect((e as Error).message).toContain('recruiting_tracker');
        expect((e as Error).message).toContain('support_queue');
      }
    });

    it('expands recruiting_tracker with people parent', () => {
      const result = expandTemplate('recruiting_tracker');
      expect(result.parent_object).toBe('people');
    });

    it('expands support_queue with companies parent', () => {
      const result = expandTemplate('support_queue');
      expect(result.parent_object).toBe('companies');
    });
  });
});
