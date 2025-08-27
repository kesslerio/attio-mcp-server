/**
 * Unit test for Issue #417 - Tasks field mapping and validation fix
 *
 * This test validates that the corrected field mapping for tasks works properly
 * with the universal create handler.
 */

import { describe, it, expect } from 'vitest';
import {
  mapRecordFields,
  validateFields,
  getFieldSuggestions,
} from '../../../../src/handlers/tool-configs/universal/field-mapper.js';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';

describe('Tasks Field Mapping Fix - Issue #417', () => {
  it('should map common task field variations to correct field names', async () => {
    // Test individual mappings to avoid collisions
    const titleMapping = await mapRecordFields(UniversalResourceType.TASKS, {
      title: 'Q4 Follow-up: Test Task',
      due: '2025-02-15',
      assignee: 'user-123',
      status: 'pending',
      record: 'record-456',
    });

    expect(titleMapping.mapped).toEqual({
      content: 'Q4 Follow-up: Test Task',
      deadline_at: '2025-02-15T00:00:00.000Z',
      assignees: 'user-123',
      is_completed: false, // 'pending' gets transformed to boolean false
      linked_records: 'record-456',
    });

    expect(
      titleMapping.warnings.some(
        (w) => w.includes('title') && w.includes('content')
      )
    ).toBe(true);
    expect(titleMapping.warnings.some((w) => w.includes('due'))).toBe(true);
    expect(titleMapping.warnings.some((w) => w.includes('assignee'))).toBe(
      true
    );
    expect(titleMapping.warnings.some((w) => w.includes('record'))).toBe(true);
  });

  it('should handle camelCase field variations correctly', async () => {
    const recordData = {
      content: 'Test task content',
      dueDate: '2025-02-15',
      assigneeId: 'user-123',
      recordId: 'record-456',
    };

    const result = await mapRecordFields(UniversalResourceType.TASKS, recordData);

    // The camelCase variants should be mapped to new Attio API field names
    expect(result.mapped).toEqual({
      content: 'Test task content',
      deadline_at: '2025-02-15T00:00:00.000Z',
      assignees: 'user-123',
      linked_records: 'record-456',
    });

    // Should have warnings about the camelCase mappings
    expect(result.warnings.some((w) => w.includes('dueDate'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('assigneeId'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('recordId'))).toBe(true);
  });

  it('should validate required fields for tasks', () => {
    const validData = { content: 'Test task' };
    const invalidData = { title: 'Test task' }; // Should be mapped to content
    const emptyData = {};

    // Valid data (after mapping)
    const validResult = validateFields(UniversalResourceType.TASKS, validData);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    // Data that needs mapping but has required content via title
    const mappedResult = validateFields(
      UniversalResourceType.TASKS,
      invalidData
    );
    expect(mappedResult.valid).toBe(true); // Should pass because title maps to content

    // Empty data should fail
    const emptyResult = validateFields(UniversalResourceType.TASKS, emptyData);
    expect(emptyResult.valid).toBe(false);
    expect(emptyResult.errors.some((e) => e.includes('content'))).toBe(true);
  });

  it('should provide helpful suggestions for unknown task fields', () => {
    // Test suggestions for unknown fields
    const titleSuggestion = getFieldSuggestions(
      UniversalResourceType.TASKS,
      'title'
    );
    expect(titleSuggestion).toContain('content');

    const assigneeSuggestion = getFieldSuggestions(
      UniversalResourceType.TASKS,
      'assignee'
    );
    expect(assigneeSuggestion).toContain('assignee_id');

    const dueSuggestion = getFieldSuggestions(
      UniversalResourceType.TASKS,
      'due'
    );
    expect(dueSuggestion).toContain('due_date');

    const unknownSuggestion = getFieldSuggestions(
      UniversalResourceType.TASKS,
      'completely_unknown_field'
    );
    expect(unknownSuggestion).toContain('content'); // Should suggest valid fields
  });

  it('should prevent field mapping collisions', async () => {
    // Test collision detection when multiple fields map to the same target
    const collisionData = {
      title: 'Task Title',
      name: 'Task Name',
      description: 'Task Description',
      // All three map to 'content'
    };

    const result = await mapRecordFields(UniversalResourceType.TASKS, collisionData);

    // Should detect collision and return errors
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0]).toContain('collision');
    expect(result.errors![0]).toContain('content');
  });

  it('should include all expected valid fields', () => {
    const validData = {
      content: 'Test task',
      status: 'pending',
      due_date: '2025-02-15',
      assignee_id: 'user-123',
      record_id: 'record-456',
    };

    const result = validateFields(UniversalResourceType.TASKS, validData);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0); // No warnings for correctly named fields
  });
});
