/**
 * E2E backward compatibility for the v2 resource-first catalog.
 *
 * Prior default-catalog names still call the canonical tool through v2.x.
 * Removed pre-v2 names (kebab spellings that were never the default catalog,
 * and records_search_batch) do not resolve. Aliases do not change arguments.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
import { REMOVED_PRE_V2_TOOL_ALIASES } from '@/constants/tool-names.js';

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

    const companyResponse = asToolResponse(
      await callUniversalTool('records_create', {
        resource_type: 'companies',
        record_data: CompanyFactory.create() as any,
      })
    );
    E2EAssertions.expectMcpSuccess(companyResponse);
    const company = E2EAssertions.expectMcpData(companyResponse);
    testCompanyId = company.id.record_id;
  }, 120000);

  afterAll(async () => {
    if (testCompanyId) {
      await callUniversalTool('records_delete', {
        resource_type: 'companies',
        record_id: testCompanyId,
      });
    }
    endTestSuite();
    console.error('✅ Backward Compatibility E2E completed');
  }, 60000);

  describe('Alias Resolution System', () => {
    it('resolves a prior default name to its canonical target', () => {
      const resolution = resolveToolName('search_records');
      expect(resolution.name).toBe('records_search');
      expect(resolution.alias?.alias).toBe('search_records');
      expect(resolution.alias?.definition.target).toBe('records_search');
      expect(resolution.alias?.definition.removal).toBe('v3.0.0');
      expect(resolution.alias?.definition.reason ?? '').not.toContain('#1039');
    });

    it('leaves canonical names unchanged', () => {
      const resolution = resolveToolName('records_search');
      expect(resolution.name).toBe('records_search');
      expect(resolution.alias).toBeUndefined();
    });

    it('does not resolve removed pre-v2 names', () => {
      for (const removed of [
        'search-records',
        'create-record',
        'advanced-search',
        'batch-operations',
        'create-note',
        'list-notes',
        'smithery-debug-config',
        'records_search_batch',
      ]) {
        expect(REMOVED_PRE_V2_TOOL_ALIASES).toContain(removed);
        const resolution = resolveToolName(removed);
        expect(resolution.name).toBe(removed);
        expect(resolution.alias).toBeUndefined();
      }
    });
  });

  describe('CRUD Tool Aliases', () => {
    it('creates a company through the create_record alias', async () => {
      const companyData = CompanyFactory.create() as any;
      const aliasResponse = asToolResponse(
        await callUniversalTool('create_record', {
          resource_type: 'companies',
          record_data: companyData,
        })
      );

      E2EAssertions.expectMcpSuccess(aliasResponse);
      const company = E2EAssertions.expectMcpData(aliasResponse);
      E2EAssertions.expectCompanyRecord(company);

      await callUniversalTool('records_delete', {
        resource_type: 'companies',
        record_id: company.id.record_id,
      });
    }, 60000);

    it('reads a company through the get_record_details alias', async () => {
      const aliasResponse = asToolResponse(
        await callUniversalTool('get_record_details', {
          resource_type: 'companies',
          record_id: testCompanyId,
        })
      );

      E2EAssertions.expectMcpSuccess(aliasResponse);
      const company = E2EAssertions.expectMcpData(aliasResponse);
      expect(company.id.record_id).toBe(testCompanyId);
    }, 60000);

    it('updates a company through the update_record alias', async () => {
      const aliasResponse = asToolResponse(
        await callUniversalTool('update_record', {
          resource_type: 'companies',
          record_id: testCompanyId,
          record_data: {
            description: 'Updated via prior-name alias',
          },
        })
      );

      E2EAssertions.expectMcpSuccess(aliasResponse);
    }, 60000);
  });

  describe('Search Tool Aliases', () => {
    it('searches through the search_records alias', async () => {
      const aliasResponse = asToolResponse(
        await callUniversalTool('search_records', {
          resource_type: 'companies',
          limit: 5,
        })
      );

      E2EAssertions.expectMcpSuccess(aliasResponse);
      const data = E2EAssertions.expectMcpData(aliasResponse);
      expect(data).toHaveProperty('records');
    }, 60000);

    it('returns records for the canonical name and the prior name', async () => {
      const params = { resource_type: 'companies', limit: 3 };

      const [canonicalResponse, aliasResponse] = await Promise.all([
        callUniversalTool('records_search', params),
        callUniversalTool('search_records', params),
      ]);

      E2EAssertions.expectMcpSuccess(asToolResponse(canonicalResponse));
      E2EAssertions.expectMcpSuccess(asToolResponse(aliasResponse));

      const canonicalData = E2EAssertions.expectMcpData(
        asToolResponse(canonicalResponse)
      );
      const aliasData = E2EAssertions.expectMcpData(
        asToolResponse(aliasResponse)
      );

      expect(canonicalData).toHaveProperty('records');
      expect(aliasData).toHaveProperty('records');
    }, 60000);
  });

  describe('Advanced, metadata, and batch aliases', () => {
    it('runs advanced search through search_records_advanced', async () => {
      const aliasResponse = asToolResponse(
        await callUniversalTool('search_records_advanced', {
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

      E2EAssertions.expectMcpSuccess(aliasResponse);
    }, 60000);

    it('reads attributes through get_record_attributes', async () => {
      const aliasResponse = asToolResponse(
        await callUniversalTool('get_record_attributes', {
          resource_type: 'companies',
        })
      );

      E2EAssertions.expectMcpSuccess(aliasResponse);
      const data = E2EAssertions.expectMcpData(aliasResponse);
      expect(data).toHaveProperty('attributes');
    }, 60000);

    it('discovers attributes through discover_record_attributes', async () => {
      const aliasResponse = asToolResponse(
        await callUniversalTool('discover_record_attributes', {
          resource_type: 'companies',
        })
      );

      E2EAssertions.expectMcpSuccess(aliasResponse);
    }, 60000);

    it('creates through the batch_records alias', async () => {
      const aliasResponse = asToolResponse(
        await callUniversalTool('batch_records', {
          resource_type: 'companies',
          operations: [
            {
              operation: 'create',
              record_data: CompanyFactory.create() as any,
            },
          ],
        })
      );

      E2EAssertions.expectMcpSuccess(aliasResponse);

      const data = E2EAssertions.expectMcpData(aliasResponse);
      if (data.results?.[0]?.data?.id?.record_id) {
        await callUniversalTool('records_delete', {
          resource_type: 'companies',
          record_id: data.results[0].data.id.record_id,
        });
      }
    }, 60000);
  });

  describe('Note and diagnostic aliases', () => {
    it('creates a note through create_note', async () => {
      const aliasResponse = asToolResponse(
        await callUniversalTool('create_note', {
          resource_type: 'companies',
          record_id: testCompanyId,
          title: 'Test note via prior-name alias',
          content: 'This note was created using the prior default name',
        })
      );

      E2EAssertions.expectMcpSuccess(aliasResponse);
    }, 60000);

    it('lists notes through list_notes', async () => {
      const aliasResponse = asToolResponse(
        await callUniversalTool('list_notes', {
          resource_type: 'companies',
          record_id: testCompanyId,
        })
      );

      E2EAssertions.expectMcpSuccess(aliasResponse);
      const data = E2EAssertions.expectMcpData(aliasResponse);
      expect(data).toHaveProperty('notes');
    }, 60000);

    it('reads diagnostics through smithery_debug_config', async () => {
      const aliasResponse = asToolResponse(
        await callUniversalTool('smithery_debug_config', {})
      );

      E2EAssertions.expectMcpSuccess(aliasResponse);

      const text = aliasResponse.content?.[0]?.text;
      expect(typeof text).toBe('string');
      expect(text).not.toContain('hasAttioApiKey');
      expect(text).not.toContain('attioApiKeyLength');
      expect(text).not.toContain('configurationSource');
      expect(text).not.toContain('apiKeyAvailable');
      expect(text).not.toContain('failedContextCacheSize');
      expect(text).not.toContain('hasApiKeyGetter');
      expect(text).not.toContain('hasDirectApiKey');
      expect(text).not.toContain('hasDirectAccessToken');
    }, 60000);
  });
});
