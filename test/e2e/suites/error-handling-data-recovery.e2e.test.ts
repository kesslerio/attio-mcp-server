/**
 * Split: Critical Error Handling E2E – Data Consistency & Recovery
 */
import { describe, beforeAll, afterAll, it, expect, vi } from 'vitest';

import { E2EAssertions, type McpToolResponse } from '../utils/assertions.js';
import { E2ETestBase } from '../setup.js';
import { loadE2EConfig } from '../utils/config-loader.js';
import { testDataGenerator } from '../fixtures/index.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Critical Error Handling E2E – Data Consistency and Recovery', () => {
  let testCompanyId: string | undefined;

  beforeAll(async () => {
    loadE2EConfig();
    if (!validation.valid)
      console.warn('⚠️  Test environment warnings:', validation.warnings);
    await E2ETestBase.setup({
      requiresRealApi: false,
      cleanupAfterTests: true,
      timeout: 120000,
    });

    // Minimal seed data
    try {
      testCompanyId = await createTestRecord(
        (resourceType, data) =>
          callUniversalTool('create-record', {
            resource_type: resourceType as any,
            record_data: data,
          }),
        'companies',
        companyData
      );
    } catch (e) {
      console.warn(
        '⚠️  Setup failed:',
        e instanceof Error ? e.message : String(e)
      );
    }
  }, 60000);

  afterAll(async () => {
    if (testCompanyId) await cleanupTestRecords([testCompanyId]);
  }, 60000);

  it('should handle incomplete transaction scenarios', async () => {
      resource_type: 'companies',
      record_data: companyData as any,
    })) as McpToolResponse;
    if (hasValidContent(createResponse)) {
      if (companyId) {
          resource_type: 'companies',
          record_id: companyId,
          title: 'Immediate Note',
          content: 'Testing immediate reference',
          format: 'markdown',
        })) as McpToolResponse;
        expect(noteResponse).toBeDefined();
        await callUniversalTool('delete-record', {
          resource_type: 'companies',
          record_id: companyId,
        }).catch(() => {});
      }
    }
  }, 60000);

  it('should handle error recovery gracefully', async () => {
      resource_type: 'companies',
      record_id: 'intentionally-invalid-id',
    })) as McpToolResponse;
    expect(invalidResponse.isError).toBe(true);
    if (testCompanyId) {
        resource_type: 'companies',
        record_id: testCompanyId,
      })) as McpToolResponse;
      expect(validResponse).toBeDefined();
    }
  });
});
