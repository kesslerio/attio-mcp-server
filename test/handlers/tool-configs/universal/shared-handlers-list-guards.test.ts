import { describe, it, expect } from 'vitest';

import {
  handleUniversalCreate,
  handleUniversalDelete,
  handleUniversalUpdate,
} from '@/handlers/tool-configs/universal/shared-handlers.js';

describe('universal list mutation guards', () => {
  it('blocks lists in records_create', async () => {
    await expect(
      handleUniversalCreate({
        resource_type: 'lists',
        record_data: { name: 'x', parent_object: 'people' },
      })
    ).rejects.toThrow(/not supported by records_create/i);
  });

  it('blocks lists in records_update', async () => {
    await expect(
      handleUniversalUpdate({
        resource_type: 'lists',
        record_id: 'list_123',
        record_data: { name: 'updated' },
      })
    ).rejects.toThrow(/not supported by records_update/i);
  });

  it('blocks lists in records_delete', async () => {
    await expect(
      handleUniversalDelete({
        resource_type: 'lists',
        record_id: 'list_123',
      })
    ).rejects.toThrow(/not supported by records_delete/i);
  });
});
