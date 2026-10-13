/** IT-401: Universal list contracts; no assumptions about workspace population. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UniversalSearchService } from '@/services/UniversalSearchService.js';
import { UniversalMetadataService } from '@/services/UniversalMetadataService.js';
import { createList, getListDetails } from '@/objects/lists/base.js';
import { getAttioClient } from '@/api/attio-client.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { IntegrationFixtures } from '@test/utils/integration-fixtures.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

describe.skipIf(!shouldRunIntegrationTests())('IT-401: Universal lists', () => {
  let fixtures: IntegrationFixtures;
  let listId: string;
  let listName: string;
  let listSlug: string;
  beforeAll(async () => {
    fixtures = new IntegrationFixtures(getAttioClient());
    const list = await fixtures.create('list', (name) =>
      createList({
        name,
        parent_object: 'companies',
        workspace_access: 'full-access',
      })
    );
    if (typeof list.name !== 'string' || typeof list.api_slug !== 'string') {
      throw new Error('Created list must include name and api_slug');
    }
    listId = list.id.list_id;
    listName = list.name;
    listSlug = list.api_slug;
  }, 30000);
  afterAll(async () => {
    await fixtures?.cleanup();
  }, 30000);

  it.each(['uuid', 'slug'])(
    'IT-401.1: returns owned list details using %s',
    async (identifier) => {
      const record_id = identifier === 'uuid' ? listId : listSlug;
      const legacy = await getListDetails(record_id);
      const universal = await UniversalMetadataService.getRecordDetails({
        resource_type: UniversalResourceType.LISTS,
        record_id,
      });
      for (const result of [legacy, universal]) {
        expect(result).toMatchObject({
          id: { list_id: listId },
          name: listName,
          api_slug: listSlug,
        });
        expect(result).not.toHaveProperty('values');
        expect(result).not.toHaveProperty('id.record_id');
      }
    }
  );

  it('IT-401.2: returns list-native search results without population assumptions', async () => {
    const results = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.LISTS,
      query: '',
      limit: 5,
    });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(5);
    for (const result of results) {
      expect(result).toMatchObject({
        id: { list_id: expect.any(String) },
        name: expect.any(String),
        api_slug: expect.any(String),
      });
      expect(result).not.toHaveProperty('values');
      expect(result).not.toHaveProperty('id.record_id');
    }
  });

  it('IT-401.3: filters before paginating without comparing changing snapshots', async () => {
    const results = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.LISTS,
      query: listName,
      limit: 1,
      offset: 1,
    });
    // This unique name belongs to one fixture, so there is no second result.
    expect(results).toEqual([]);
  });

  it('IT-401.4: rejects a nonexistent list identifier', async () => {
    await expect(
      UniversalMetadataService.getRecordDetails({
        resource_type: UniversalResourceType.LISTS,
        record_id: '00000000-0000-0000-0000-000000000000',
      })
    ).rejects.toThrow();
  });
});
