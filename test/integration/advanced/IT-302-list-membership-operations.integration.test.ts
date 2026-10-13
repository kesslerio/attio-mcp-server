/** IT-302: List membership tools against run-owned company and list fixtures. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CallToolResultSchema } from '@modelcontextprotocol/core';
import type { CallToolRequest } from '@modelcontextprotocol/server';
import { getAttioClient } from '@/api/attio-client.js';
import { executeToolRequest } from '@/handlers/tools/dispatcher.js';
import { createCompany } from '@/objects/companies/index.js';
import { createList } from '@/objects/lists/base.js';
import { getListEntries } from '@/objects/lists/entries.js';
import { IntegrationFixtures } from '@test/utils/integration-fixtures.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

describe.skipIf(!shouldRunIntegrationTests())(
  'IT-302: List membership operations',
  () => {
    let fixtures: IntegrationFixtures;
    let testListId: string;
    let testRecordId: string;
    beforeAll(async () => {
      fixtures = new IntegrationFixtures(getAttioClient());
      const company = await fixtures.create('company', (name) =>
        createCompany({ name })
      );
      testRecordId = company.id.record_id;
      const list = await fixtures.create('list', (name) =>
        createList({
          name,
          parent_object: 'companies',
          workspace_access: 'full-access',
        })
      );
      testListId = list.id.list_id;
    }, 30000);
    // Deleting the owned list removes its entries before the owned company.
    afterAll(async () => {
      await fixtures?.cleanup();
    }, 30000);

    // records_update no longer accepts list_memberships; use the maintained tool.
    const request = (
      overrides: Record<string, unknown> = {}
    ): CallToolRequest => ({
      method: 'tools/call',
      params: {
        name: 'list_entries_manage',
        arguments: {
          listId: testListId,
          recordId: testRecordId,
          objectType: 'companies',
          ...overrides,
        },
      },
    });

    it.each([undefined, {}])(
      'IT-302.1: adds an owned membership with initial values %s',
      async (initialValues) => {
        const result = CallToolResultSchema.parse(
          await executeToolRequest(
            request(initialValues ? { initialValues } : {})
          )
        );
        expect(result.isError).toBeFalsy();
        const entries = await getListEntries(testListId);
        expect(entries).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ parent_record_id: testRecordId }),
          ])
        );
      }
    );

    it.each(['recordId', 'objectType'])(
      'IT-302.2: rejects a missing %s without adding a membership',
      async (field) => {
        const before = await getListEntries(testListId);
        const result = CallToolResultSchema.parse(
          await executeToolRequest(request({ [field]: undefined }))
        );
        expect(result.isError).toBe(true);
        const after = await getListEntries(testListId);
        expect(after.map((entry) => entry.id?.entry_id).sort()).toEqual(
          before.map((entry) => entry.id?.entry_id).sort()
        );
      }
    );
  }
);
