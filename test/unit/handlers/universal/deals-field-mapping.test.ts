import { describe, it, expect } from 'vitest';
import { mapFieldName } from '../../../../src/handlers/tool-configs/universal/field-mapper.js';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';

describe('Deals field mapping aliases', () => {
  it('maps deal owner display names and variations to owner', async () => {
    const displayName = await mapFieldName(
      UniversalResourceType.DEALS,
      'Deal owner'
    );
    const assignee = await mapFieldName(
      UniversalResourceType.DEALS,
      'assignee'
    );
    const ownerId = await mapFieldName(UniversalResourceType.DEALS, 'owner_id');

    expect(displayName).toBe('owner');
    expect(assignee).toBe('owner');
    expect(ownerId).toBe('owner');
  });

  it('maps associated people display names and variations', async () => {
    const displayName = await mapFieldName(
      UniversalResourceType.DEALS,
      'Associated people'
    );
    const singular = await mapFieldName(
      UniversalResourceType.DEALS,
      'associated person'
    );

    expect(displayName).toBe('associated_people');
    expect(singular).toBe('associated_people');
  });
});
