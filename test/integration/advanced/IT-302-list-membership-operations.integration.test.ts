/**
 * IT-302: List membership operations via universal tools
 *
 * Validates the update-record tool workflow for adding list memberships to
 * company records using live Attio APIs.
 */

import { afterAll, describe, expect, it, vi } from 'vitest';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { getAttioClient } from '@/api/attio-client.js';
import { executeToolRequest } from '@/handlers/tools/dispatcher.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  const shouldMock =
    !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';

  if (shouldMock) {
    return {
      default: {
        create: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ data: { data: {} } }),
          post: vi.fn().mockResolvedValue({
            data: {
              data: {
                id: { entry_id: 'mock-entry-id' },
                record_id: process.env.TEST_COMPANY_ID || 'mock-record-id',
                values: { stage: 'Mock Stage' },
              },
            },
          }),
          delete: vi.fn().mockResolvedValue({ data: {} }),
          interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
          },
        })),
      },
    };
  }

  return actual;
});

const runIntegrationTests = shouldRunIntegrationTests();

const TEST_LIST_ID = process.env.TEST_LIST_ID ?? '';
const TEST_RECORD_ID = process.env.TEST_COMPANY_ID ?? '';
const testConfigComplete = TEST_LIST_ID !== '' && TEST_RECORD_ID !== '';

const CONFIG_ERROR_MESSAGE = `
⚠️  Integration test configuration missing!

To run these tests, set TEST_LIST_ID and TEST_COMPANY_ID in your environment.
Refer to docs/testing.md for configuration details.
`;

describe.skipIf(!runIntegrationTests)(
  'IT-302: List membership operations',
  () => {
    if (!testConfigComplete) {
      it.skip('IT-302.0: requires TEST_LIST_ID and TEST_COMPANY_ID configuration', () => {
        console.error(CONFIG_ERROR_MESSAGE);
      });
      return;
    }

    let createdEntryId: string | undefined;

    afterAll(async () => {
      if (!createdEntryId) return;

      try {
        const api = getAttioClient();
        await api.delete(`/lists/${TEST_LIST_ID}/entries/${createdEntryId}`);
        console.log(`Cleaned up test entry ${createdEntryId}`);
      } catch (error: unknown) {
        console.error('Error during cleanup:', error);
      }
    });

    const createToolRequest = (
      overrides: Partial<CallToolRequest['params']['arguments']> = {}
    ) =>
      ({
        method: 'tools/call',
        params: {
          name: 'update-record',
          arguments: {
            resource_type: 'records',
            record_id: TEST_RECORD_ID,
            record_data: {
              list_memberships: {
                [TEST_LIST_ID]: {},
              },
            },
            ...overrides,
          },
        },
      }) satisfies CallToolRequest;

    const recordCreatedFrom = async (request: CallToolRequest) => {
      const result = await executeToolRequest(request);
      expect(result).toBeDefined();
      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();

      if (Array.isArray(result.content) && result.content[0]?.text) {
        const entryIdMatch = result.content[0].text.match(
          /Entry ID: ([a-zA-Z0-9_-]+)/
        );
        if (entryIdMatch && entryIdMatch[1]) {
          createdEntryId = entryIdMatch[1];
        }
      }

      return result;
    };

    it('IT-302.1: adds list membership with required parameters', async () => {
      await recordCreatedFrom(createToolRequest());
    });

    it('IT-302.2: adds list membership with parent object context', async () => {
      await recordCreatedFrom(
        createToolRequest({
          record_data: {
            list_memberships: {
              [TEST_LIST_ID]: {
                parent_object: 'companies',
              },
            },
          },
        })
      );
    });

    it('IT-302.3: adds list membership with entry values', async () => {
      await recordCreatedFrom(
        createToolRequest({
          record_data: {
            list_memberships: {
              [TEST_LIST_ID]: {
                entry_values: {
                  stage: 'Test Stage',
                  priority: 'High',
                },
              },
            },
          },
        })
      );
    });

    it('IT-302.4: adds list membership with all parameters', async () => {
      await recordCreatedFrom(
        createToolRequest({
          record_data: {
            list_memberships: {
              [TEST_LIST_ID]: {
                parent_object: 'companies',
                entry_values: {
                  stage: 'Complete Test',
                  priority: 'Critical',
                  notes: 'This is a test with all parameters',
                },
              },
            },
          },
        })
      );
    });

    it('IT-302.5: surfaces validation errors for missing record_id', async () => {
      const resultNoRecordId = await executeToolRequest(
        createToolRequest({ record_id: undefined as unknown as string })
      );

      expect(resultNoRecordId).toBeDefined();
      expect(resultNoRecordId.isError).toBeTruthy();
      expect(resultNoRecordId.content?.[0]?.text || '').toMatch(
        /record_id.*required|missing.*parameter/i
      );
    });

    it('IT-302.6: surfaces validation errors for missing resource_type', async () => {
      const resultNoResourceType = await executeToolRequest(
        createToolRequest({ resource_type: undefined as unknown as string })
      );

      expect(resultNoResourceType).toBeDefined();
      expect(resultNoResourceType.isError).toBeTruthy();
      expect(resultNoResourceType.content?.[0]?.text || '').toMatch(
        /resource_type.*required|missing.*parameter/i
      );
    });
  }
);
