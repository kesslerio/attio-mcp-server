import { describe, expect, it } from 'vitest';

import { formatAttributeValue } from '@/api/attribute-types.js';

describe('formatAttributeValue - select', () => {
  it('wraps single-select values in an array (tasks.priority)', async () => {
    const formatted = await formatAttributeValue('tasks', 'priority', 'uuid');
    expect(formatted).toEqual(['uuid']);
  });

  it('does not double-wrap array values (tasks.priority)', async () => {
    const formatted = await formatAttributeValue('tasks', 'priority', ['uuid']);
    expect(formatted).toEqual(['uuid']);
  });
});
