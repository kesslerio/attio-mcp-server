/**
 * Tests for TaskCreateStrategy - Issue #1098 regression coverage
 * Verifies linked_records flows through the strategy layer correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskCreateStrategy } from '../../../../src/services/create/strategies/TaskCreateStrategy.js';

// Mock the create service to capture what TaskCreateStrategy passes downstream
const mockCreateTask = vi.fn();
vi.mock('../../../../src/services/create/index.js', () => ({
  getCreateService: () => ({
    createTask: mockCreateTask,
  }),
}));

describe('TaskCreateStrategy - Issue #1098: linked_records forwarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTask.mockResolvedValue({
      id: { task_id: 'mock-task-id' },
      resource_type: 'tasks',
      values: {},
    });
  });

  it('forwards linked_records array with target_object/target_record_id format', async () => {
    const strategy = new TaskCreateStrategy();

    await strategy.create({
      resourceType: 'tasks' as any,
      values: {
        content: 'Test task with linked record',
        linked_records: [
          {
            target_object: 'people',
            target_record_id: 'person-uuid-123',
          },
        ],
      },
    });

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Test task with linked record',
        linked_records: [
          {
            target_object: 'people',
            target_record_id: 'person-uuid-123',
          },
        ],
      })
    );
    // Should NOT have recordId when using linked_records format
    const call = mockCreateTask.mock.calls[0][0];
    expect(call.recordId).toBeUndefined();
  });

  it('forwards multiple linked_records', async () => {
    const strategy = new TaskCreateStrategy();

    await strategy.create({
      resourceType: 'tasks' as any,
      values: {
        content: 'Task with multiple links',
        linked_records: [
          { target_object: 'people', target_record_id: 'person-1' },
          { target_object: 'companies', target_record_id: 'company-1' },
        ],
      },
    });

    const call = mockCreateTask.mock.calls[0][0];
    expect(call.linked_records).toEqual([
      { target_object: 'people', target_record_id: 'person-1' },
      { target_object: 'companies', target_record_id: 'company-1' },
    ]);
  });

  it('falls back to recordId for legacy record_id format', async () => {
    const strategy = new TaskCreateStrategy();

    await strategy.create({
      resourceType: 'tasks' as any,
      values: {
        content: 'Legacy linked task',
        linked_records: [{ record_id: 'legacy-record-id' }],
      },
    });

    const call = mockCreateTask.mock.calls[0][0];
    expect(call.recordId).toBe('legacy-record-id');
    expect(call.linked_records).toBeUndefined();
  });

  it('falls back to recordId for string array format', async () => {
    const strategy = new TaskCreateStrategy();

    await strategy.create({
      resourceType: 'tasks' as any,
      values: {
        content: 'String linked task',
        linked_records: ['string-record-id'],
      },
    });

    const call = mockCreateTask.mock.calls[0][0];
    expect(call.recordId).toBe('string-record-id');
    expect(call.linked_records).toBeUndefined();
  });

  it('does not inject linked_records when not provided', async () => {
    const strategy = new TaskCreateStrategy();

    await strategy.create({
      resourceType: 'tasks' as any,
      values: {
        content: 'Task without links',
      },
    });

    const call = mockCreateTask.mock.calls[0][0];
    expect(call.linked_records).toBeUndefined();
    expect(call.recordId).toBeUndefined();
  });

  it('uses record_id field when linked_records not provided', async () => {
    const strategy = new TaskCreateStrategy();

    await strategy.create({
      resourceType: 'tasks' as any,
      values: {
        content: 'Task with record_id',
        record_id: 'direct-record-id',
      },
    });

    const call = mockCreateTask.mock.calls[0][0];
    expect(call.recordId).toBe('direct-record-id');
  });
});
