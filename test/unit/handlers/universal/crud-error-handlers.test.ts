import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleCreateError } from '../../../../src/handlers/tool-configs/universal/core/crud-error-handlers.js';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';
import { AttributeOptionsService } from '../../../../src/services/metadata/index.js';

describe('CRUD error handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes deal stage guidance when required stage is missing', async () => {
    vi.spyOn(AttributeOptionsService, 'getOptions').mockResolvedValue({
      options: [
        { title: 'Discovery', is_archived: false },
        { title: 'Qualified', is_archived: false },
        { title: 'Proposal', is_archived: false },
        { title: 'Closed Won', is_archived: false },
        { title: 'Closed Lost', is_archived: false },
        { title: 'Archived', is_archived: true },
      ],
      attributeType: 'status',
    });

    await expect(
      handleCreateError(
        new Error('required field missing'),
        UniversalResourceType.DEALS,
        { values: { name: 'Test deal' } }
      )
    ).rejects.toThrow(/Common stage values/);
  });
});
