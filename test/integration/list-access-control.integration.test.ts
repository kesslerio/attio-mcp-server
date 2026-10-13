/**
 * Integration tests for list access-control behavior (Issue #1148).
 * Exercises restricted-access list configuration against the real Attio API,
 * including the 403 classification chain end-to-end through createList.
 *
 * These tests require ATTIO_API_KEY and run under `bun run test:integration`.
 * Deterministic (offline) classifier and validation cases live in the unit
 * suite: test/services/lists/ListConfigurationValidator.test.ts.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createList } from '@src/objects/lists/base.js';
import { ListConfigurationValidator } from '@/services/lists/ListConfigurationValidator.js';
import { AttioApiError } from '@/errors/api-errors.js';
import { ListErrorCategory } from '@/services/lists/types.js';
import { getAttioClient } from '@/api/attio-client.js';
import { IntegrationFixtures } from '@test/utils/integration-fixtures.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

const runIntegrationTests = shouldRunIntegrationTests();

describe.skipIf(!runIntegrationTests)(
  'List Access-Control Integration (Issue #1148)',
  { timeout: 30000 },
  () => {
    let fixtures: IntegrationFixtures;
    beforeAll(() => {
      fixtures = new IntegrationFixtures(getAttioClient());
    });
    afterAll(async () => {
      await fixtures?.cleanup();
    }, 30000);
    const createOwnedList = (attributes: Record<string, unknown>) =>
      fixtures.create('list', (name) => createList({ ...attributes, name }));

    it('creates a list with default full-access workspace configuration', async () => {
      const result = await createOwnedList({
        parent_object: 'companies',
        workspace_access: 'full-access',
      });

      expect(result).toBeDefined();
      expect(result.id?.list_id).toBeTruthy();
    });

    it('creates a private list with JSON null workspace_access and a full-access member', async (context) => {
      // Private lists require a real workspace member holding full-access
      // (Attio create-time invariant, verified against the live API).
      const { listWorkspaceMembers } =
        await import('@src/api/operations/workspace-members.js');
      const members = await listWorkspaceMembers(undefined, 1, 1);
      const memberId = members[0]?.id?.workspace_member_id;
      if (!memberId) {
        context.skip('No workspace member available for private-list setup');
        return;
      }

      const result = await createOwnedList({
        parent_object: 'companies',
        workspace_access: null,
        workspace_member_access: [
          { workspace_member_id: memberId, level: 'full-access' },
        ],
      });

      expect(result).toBeDefined();
      expect(result.id?.list_id).toBeTruthy();
    });

    it('classifies a real plan-gating 403 through createList with structured status and code', async (context) => {
      // Restricted access on a plan without advanced list sharing returns a
      // 403 billing_error. When the plan DOES support it, the create succeeds
      // and the 403 branch cannot be exercised live (skip, do not fake-pass).
      const { listWorkspaceMembers } =
        await import('@src/api/operations/workspace-members.js');
      const members = await listWorkspaceMembers(undefined, 1, 1);
      const memberId = members[0]?.id?.workspace_member_id;
      if (!memberId) {
        context.skip('No workspace member available for plan-gating probe');
        return;
      }
      let err: unknown;
      try {
        const result = await createOwnedList({
          parent_object: 'companies',
          workspace_access: 'read-only',
          workspace_member_access: [
            { workspace_member_id: memberId, level: 'full-access' },
          ],
        });
        // Plan supports restricted access: nothing to assert for the 403 path.
        expect(result.id?.list_id).toBeTruthy();
      } catch (e) {
        err = e;
      }
      if (!err) {
        context.skip('Workspace plan supports restricted access');
        return;
      }
      expect(err).toBeInstanceOf(AttioApiError);
      if (!(err instanceof AttioApiError)) throw err;
      expect(err.statusCode).toBe(403);
      const categorization = ListConfigurationValidator.categorizeError(err);
      // Must be a genuine 403 classification, never the API_FAILURE default
      expect([
        ListErrorCategory.PERMISSION_FAILURE,
        ListErrorCategory.PLAN_GATING,
      ]).toContain(categorization.category);
      expect(categorization.api_error_status).toBe(403);
      expect(err.details?.code).toBeTruthy();
    });
  }
);
