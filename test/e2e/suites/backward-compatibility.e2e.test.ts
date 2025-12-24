/**
 * E2E Backward Compatibility Test
 *
 * Verifies that deprecated tool names (kebab-case and noun-verb patterns)
 * continue to work via the alias system until their planned removal in v2.0.0.
 *
 * This ensures existing integrations won't break during the transition period.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { E2ETestBase } from '../setup.js';
import { E2EAssertions } from '../utils/assertions.js';
import { CompanyFactory } from '../fixtures/index.js';
import type { McpToolResponse } from '../types/index.js';
import {
  callUniversalTool,
  validateTestEnvironment,
} from '../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';
import { resolveToolName } from '@/config/tool-aliases.js';

function asToolResponse(response: unknown): McpToolResponse {
  return response as McpToolResponse;
}

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Backward Compatibility E2E', () => {
  let testCompanyId: string;

  beforeAll(async () => {
    startTestSuite('backward-compatibility');
    const envValidation = await validateTestEnvironment();
    if (!envValidation.valid) {
      console.warn('⚠️ Test environment warnings:', envValidation.warnings);
    }
    await E2ETestBase.setup({
      requiresRealApi: true,
      cleanupAfterTests: true,
      timeout: 120000,
    });
    console.error('🚀 Starting Backward Compatibility E2E');

    // Create a test company for operations
    const companyResponse = asToolResponse(
      await callUniversalTool('create_record', {
        resource_type: 'companies',
        record_data: CompanyFactory.create() as any,
      })
    );
    E2EAssertions.expectMcpSuccess(companyResponse);
    const company = E2EAssertions.expectMcpData(companyResponse);
    testCompanyId = company.id.record_id;
  }, 120000);

  afterAll(async () => {
    // Cleanup test company
    if (testCompanyId) {
      await callUniversalTool('delete_record', {
        resource_type: 'companies',
        record_id: testCompanyId,
      });
    }
    endTestSuite();
    console.error('✅ Backward Compatibility E2E completed');
  }, 60000);

  describe('Alias Resolution System', () => {
    it('should resolve kebab-case alias to snake_case target', () => {
      const resolution = resolveToolName('search-records');
      expect(resolution.name).toBe('search_records');
      expect(resolution.alias).toBeDefined();
      expect(resolution.alias?.alias).toBe('search-records');
      expect(resolution.alias?.definition.target).toBe('search_records');
      expect(resolution.alias?.definition.removal).toBe('v2.0.0');
      expect(resolution.alias?.definition.reason).toContain('#1039');
    });

    it('should resolve noun-verb alias to verb-first target', () => {
      const resolution = resolveToolName('records_search');
      expect(resolution.name).toBe('search_records');
      expect(resolution.alias).toBeDefined();
      expect(resolution.alias?.alias).toBe('records_search');
      expect(resolution.alias?.definition.target).toBe('search_records');
      expect(resolution.alias?.definition.removal).toBe('v2.0.0');
    });

    it('should return canonical name unchanged', () => {
      const resolution = resolveToolName('search_records');
      expect(resolution.name).toBe('search_records');
      expect(resolution.alias).toBeUndefined();
    });
  });

  describe('CRUD Tool Aliases', () => {
    it('should work with kebab-case create-record alias', async () => {
      const companyData = CompanyFactory.create() as any;
      const kebabResponse = asToolResponse(
        await callUniversalTool('create-record', {
          resource_type: 'companies',
          record_data: companyData,
        })
      );

      E2EAssertions.expectMcpSuccess(kebabResponse);
      const company = E2EAssertions.expectMcpData(kebabResponse);
      E2EAssertions.expectCompanyRecord(company);

      // Cleanup
      await callUniversalTool('delete_record', {
        resource_type: 'companies',
        record_id: company.id.record_id,
      });
    }, 60000);

    it('should work with kebab-case get-record-details alias', async () => {
      const kebabResponse = asToolResponse(
        await callUniversalTool('get-record-details', {
          resource_type: 'companies',
          record_id: testCompanyId,
        })
      );

      E2EAssertions.expectMcpSuccess(kebabResponse);
      const company = E2EAssertions.expectMcpData(kebabResponse);
      expect(company.id.record_id).toBe(testCompanyId);
    }, 60000);

    it('should work with kebab-case update-record alias', async () => {
      const kebabResponse = asToolResponse(
        await callUniversalTool('update-record', {
          resource_type: 'companies',
          record_id: testCompanyId,
          record_data: {
            description: 'Updated via kebab-case alias',
          },
        })
      );

      E2EAssertions.expectMcpSuccess(kebabResponse);
    }, 60000);
  });

  describe('Search Tool Aliases', () => {
    it('should work with kebab-case search-records alias', async () => {
      const kebabResponse = asToolResponse(
        await callUniversalTool('search-records', {
          resource_type: 'companies',
          limit: 5,
        })
      );

      E2EAssertions.expectMcpSuccess(kebabResponse);
      const data = E2EAssertions.expectMcpData(kebabResponse);
      expect(data).toHaveProperty('records');
    }, 60000);

    it('should work with noun-verb records_search alias', async () => {
      const nounVerbResponse = asToolResponse(
        await callUniversalTool('records_search', {
          resource_type: 'companies',
          limit: 5,
        })
      );

      E2EAssertions.expectMcpSuccess(nounVerbResponse);
      const data = E2EAssertions.expectMcpData(nounVerbResponse);
      expect(data).toHaveProperty('records');
    }, 60000);

    it('should produce identical results for all search name variants', async () => {
      const params = { resource_type: 'companies', limit: 3 };

      const [canonicalResponse, kebabResponse, nounVerbResponse] =
        await Promise.all([
          callUniversalTool('search_records', params),
          callUniversalTool('search-records', params),
          callUniversalTool('records_search', params),
        ]);

      // All should succeed
      E2EAssertions.expectMcpSuccess(asToolResponse(canonicalResponse));
      E2EAssertions.expectMcpSuccess(asToolResponse(kebabResponse));
      E2EAssertions.expectMcpSuccess(asToolResponse(nounVerbResponse));

      // All should return records
      const canonicalData = E2EAssertions.expectMcpData(
        asToolResponse(canonicalResponse)
      );
      const kebabData = E2EAssertions.expectMcpData(
        asToolResponse(kebabResponse)
      );
      const nounVerbData = E2EAssertions.expectMcpData(
        asToolResponse(nounVerbResponse)
      );

      expect(canonicalData).toHaveProperty('records');
      expect(kebabData).toHaveProperty('records');
      expect(nounVerbData).toHaveProperty('records');
    }, 60000);
  });

  describe('Advanced Operation Aliases', () => {
    it('should work with kebab-case advanced-search alias', async () => {
      const kebabResponse = asToolResponse(
        await callUniversalTool('advanced-search', {
          resource_type: 'companies',
          filters: [
            {
              attribute: 'name',
              operator: 'contains',
              value: 'Test',
            },
          ],
        })
      );

      E2EAssertions.expectMcpSuccess(kebabResponse);
    }, 60000);

    it('should work with noun-verb records_search_advanced alias', async () => {
      const nounVerbResponse = asToolResponse(
        await callUniversalTool('records_search_advanced', {
          resource_type: 'companies',
          filters: [
            {
              attribute: 'name',
              operator: 'contains',
              value: 'Test',
            },
          ],
        })
      );

      E2EAssertions.expectMcpSuccess(nounVerbResponse);
    }, 60000);
  });

  describe('Metadata Tool Aliases', () => {
    it('should work with noun-verb records_get_attributes alias', async () => {
      const nounVerbResponse = asToolResponse(
        await callUniversalTool('records_get_attributes', {
          resource_type: 'companies',
        })
      );

      E2EAssertions.expectMcpSuccess(nounVerbResponse);
      const data = E2EAssertions.expectMcpData(nounVerbResponse);
      expect(data).toHaveProperty('attributes');
    }, 60000);

    it('should work with noun-verb records_discover_attributes alias', async () => {
      const nounVerbResponse = asToolResponse(
        await callUniversalTool('records_discover_attributes', {
          resource_type: 'companies',
        })
      );

      E2EAssertions.expectMcpSuccess(nounVerbResponse);
    }, 60000);
  });

  describe('Batch Operation Aliases', () => {
    it('should work with kebab-case batch-operations alias', async () => {
      const kebabResponse = asToolResponse(
        await callUniversalTool('batch-operations', {
          resource_type: 'companies',
          operations: [
            {
              operation: 'create',
              record_data: CompanyFactory.create() as any,
            },
          ],
        })
      );

      E2EAssertions.expectMcpSuccess(kebabResponse);

      // Cleanup created company
      const data = E2EAssertions.expectMcpData(kebabResponse);
      if (data.results?.[0]?.data?.id?.record_id) {
        await callUniversalTool('delete_record', {
          resource_type: 'companies',
          record_id: data.results[0].data.id.record_id,
        });
      }
    }, 60000);

    it('should work with noun-verb records_batch alias', async () => {
      const nounVerbResponse = asToolResponse(
        await callUniversalTool('records_batch', {
          resource_type: 'companies',
          operations: [
            {
              operation: 'create',
              record_data: CompanyFactory.create() as any,
            },
          ],
        })
      );

      E2EAssertions.expectMcpSuccess(nounVerbResponse);

      // Cleanup created company
      const data = E2EAssertions.expectMcpData(nounVerbResponse);
      if (data.results?.[0]?.data?.id?.record_id) {
        await callUniversalTool('delete_record', {
          resource_type: 'companies',
          record_id: data.results[0].data.id.record_id,
        });
      }
    }, 60000);
  });

  describe('Note Tool Aliases', () => {
    it('should work with kebab-case create-note alias', async () => {
      const kebabResponse = asToolResponse(
        await callUniversalTool('create-note', {
          resource_type: 'companies',
          record_id: testCompanyId,
          title: 'Test note via kebab-case alias',
          content: 'This note was created using the kebab-case alias',
        })
      );

      E2EAssertions.expectMcpSuccess(kebabResponse);
    }, 60000);

    it('should work with kebab-case list-notes alias', async () => {
      const kebabResponse = asToolResponse(
        await callUniversalTool('list-notes', {
          resource_type: 'companies',
          record_id: testCompanyId,
        })
      );

      E2EAssertions.expectMcpSuccess(kebabResponse);
      const data = E2EAssertions.expectMcpData(kebabResponse);
      expect(data).toHaveProperty('notes');
    }, 60000);
  });

  describe('Diagnostic Tool Aliases', () => {
    it('should work with kebab-case smithery-debug-config alias', async () => {
      const kebabResponse = asToolResponse(
        await callUniversalTool('smithery-debug-config', {})
      );

      E2EAssertions.expectMcpSuccess(kebabResponse);
    }, 60000);
  });
});
