import { describe, it, expect } from 'vitest';

import {
  handleUniversalCreate,
  handleUniversalDelete,
  handleUniversalUpdate,
} from '@/handlers/tool-configs/universal/shared-handlers.js';

describe('universal list mutation guards', () => {
  it('blocks lists in create-record', async () => {
    await expect(
      handleUniversalCreate({
        resource_type: 'lists',
        record_data: { name: 'x', parent_object: 'people' },
      })
    ).rejects.toThrow(/not supported by universal create-record/i);
  });

  it('blocks lists in update-record', async () => {
    await expect(
      handleUniversalUpdate({
        resource_type: 'lists',
        record_id: 'list_123',
        record_data: { name: 'updated' },
      })
    ).rejects.toThrow(/not supported by universal update-record/i);
  });

  it('blocks lists in delete-record', async () => {
    await expect(
      handleUniversalDelete({
        resource_type: 'lists',
        record_id: 'list_123',
      })
    ).rejects.toThrow(/not supported by universal delete-record/i);
  });
});
