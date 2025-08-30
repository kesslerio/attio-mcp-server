/**
 * Unit test for Issue #417 - Tasks attribute discovery fix
 *
 * This test validates that the fixed tasks attribute discovery works correctly
 * and returns proper schema without calling the non-existent /objects/tasks/attributes endpoint.
 */

import { describe, it, expect } from 'vitest';

import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';

describe('Tasks Attribute Discovery Fix - Issue #417', () => {
  it('should discover task attributes without calling /objects/tasks/attributes', async () => {
    // This should not throw an error anymore
      UniversalResourceType.TASKS
    );

    expect(result).toBeDefined();
    expect(result).toHaveProperty('attributes');
    expect(result).toHaveProperty('mappings');
    expect(result).toHaveProperty('count');

    // Verify it contains the expected task attributes
    expect(result.attributes).toBeInstanceOf(Array);
    expect(result.attributes.length).toBeGreaterThan(0);

    // Check for key task attributes
      (attr: unknown) => attr.api_slug === 'content'
    );
    expect(contentAttr).toBeDefined();
    expect(contentAttr.required).toBe(true);

      (attr: unknown) => attr.api_slug === 'status'
    );
    expect(statusAttr).toBeDefined();

      (attr: unknown) => attr.api_slug === 'due_date'
    );
    expect(dueDateAttr).toBeDefined();

      (attr: unknown) => attr.api_slug === 'assignee_id'
    );
    expect(assigneeAttr).toBeDefined();
  });

  it('should return task attributes via universal get-attributes without record ID', async () => {
    // Test the get-attributes path
      resource_type: UniversalResourceType.TASKS,
      // No record_id, should use discover path
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('attributes');
    expect(result.attributes).toBeInstanceOf(Array);
    expect(result.attributes.length).toBeGreaterThan(0);
  });

  it('should include proper field mappings for common task field names', async () => {
      UniversalResourceType.TASKS
    );

    expect(result.mappings).toBeDefined();

    // Check key field mappings
    expect(result.mappings['title']).toBe('content');
    expect(result.mappings['name']).toBe('content');
    expect(result.mappings['description']).toBe('content');
    expect(result.mappings['assignee']).toBe('assignee_id');
    expect(result.mappings['due']).toBe('due_date');
    expect(result.mappings['record']).toBe('record_id');
  });

  it('should provide helpful field descriptions for task attributes', async () => {
      UniversalResourceType.TASKS
    );

      (attr: unknown) => attr.api_slug === 'content'
    );
    expect(contentAttr.description).toContain('text');

      (attr: unknown) => attr.api_slug === 'due_date'
    );
    expect(dueDateAttr.description).toContain('ISO date');

      (attr: unknown) => attr.api_slug === 'assignee_id'
    );
    expect(assigneeAttr.description).toContain('workspace member');
  });
});
