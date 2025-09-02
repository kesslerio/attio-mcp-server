import { describe, it, expect } from 'vitest';
import { createTask } from '../../../src/api/operations/tasks.js';

describe('tasks.createTask validation', () => {
  it('throws when recordId provided without targetObject', async () => {
    await expect(
      createTask('content', { recordId: '11111111-1111-1111-1111-111111111111' })
    ).rejects.toThrow(/both 'recordId' and 'targetObject'/i);
  });

  it('throws when targetObject provided without recordId', async () => {
    await expect(
      createTask('content', { targetObject: 'companies' as any })
    ).rejects.toThrow(/both 'recordId' and 'targetObject'/i);
  });
});

