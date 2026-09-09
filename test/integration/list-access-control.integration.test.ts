/**
 * Integration tests for list access-control behavior (Issue #1148).
 * Exercises restricted-access list configuration against the real Attio API,
 * including the 403 classification chain end-to-end through createList.
 *
 * These tests require ATTIO_API_KEY and run under `bun run test:integration`.
 * Deterministic (offline) classifier and validation cases live in the unit
 * suite: test/services/lists/ListConfigurationValidator.test.ts.
 */

import { describe, expect, it } from 'vitest';
import { createList } from '@src/objects/lists/base.js';
import { ListConfigurationValidator } from '@/services/lists/ListConfigurationValidator.js';
import { ListErrorCategory } from '@/services/lists/types.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

const runIntegrationTests = shouldRunIntegrationTests();

describe.skipIf(!runIntegrationTests)(
  'List Access-Control Integration (Issue #1148)',
  { timeout: 30000 },
  () => {
    // Created list IDs are tracked for the workspace-level cleanup script,
    // which filters by WORKSPACE_API_UUID; no per-test deletion here.
    const createdListIds: string[] = [];

    it('creates a list with default full-access workspace configuration', async () => {
      const result = await createList({
        name: `IT-1148-default-${Date.now()}`,
        parent_object: 'companies',
        workspace_access: 'full-access',
      });

      expect(result).toBeDefined();
      expect(result.id?.list_id).toBeTruthy();
      createdListIds.push(result.id.list_id);
    });

    it('creates a private list with JSON null workspace_access and a full-access member', async () => {
      // Private lists require a real workspace member holding full-access
      // (Attio create-time invariant, verified against the live API).
      const { listWorkspaceMembers } =
        await import('@src/api/operations/workspace-members.js');
      const members = await listWorkspaceMembers(undefined, 1, 1);
      const memberId = members[0]?.id?.workspace_member_id;
      if (!memberId) {
        // No member resolvable for this token — skip gracefully
        return;
      }

      const result = await createList({
        name: `IT-1148-private-${Date.now()}`,
        parent_object: 'companies',
        workspace_access: null,
        workspace_member_access: [
          { workspace_member_id: memberId, level: 'full-access' },
        ],
      });

      expect(result).toBeDefined();
      expect(result.id?.list_id).toBeTruthy();
      createdListIds.push(result.id.list_id);
    });

    it('classifies a real plan-gating 403 through createList with structured status and code', async () => {
      // Restricted access on a plan without advanced list sharing returns a
      // 403 billing_error. When the plan DOES support it, the create succeeds
      // and the 403 branch cannot be exercised live (skip, do not fake-pass).
      const { listWorkspaceMembers } =
        await import('@src/api/operations/workspace-members.js');
      const members = await listWorkspaceMembers(undefined, 1, 1);
      const memberId = members[0]?.id?.workspace_member_id;
      if (!memberId) {
        // No member resolvable for this token — cannot reach the 403 branch
        return;
      }
      let err: unknown;
      try {
        const result = await createList({
          name: `IT-1148-403probe-${Date.now()}`,
          parent_object: 'companies',
          workspace_access: 'read-only',
          workspace_member_access: [
            { workspace_member_id: memberId, level: 'full-access' },
          ],
        });
        // Plan supports restricted access: nothing to assert for the 403 path.
        expect(result.id?.list_id).toBeTruthy();
        return;
      } catch (e) {
        err = e;
      }
      const { AttioApiError } = await import('@/errors/api-errors.js');
      expect(err).toBeInstanceOf(AttioApiError);
      expect((err as AttioApiError).statusCode).toBe(403);
      const categorization = ListConfigurationValidator.categorizeError(err);
      // Must be a genuine 403 classification, never the API_FAILURE default
      expect([
        ListErrorCategory.PERMISSION_FAILURE,
        ListErrorCategory.PLAN_GATING,
      ]).toContain(categorization.category);
      expect(categorization.api_error_status).toBe(403);
      expect((err as AttioApiError).details?.code).toBeTruthy();
    });
  }
);
