import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/handlers/tool-configs/universal/shared-handlers.js', () => ({
  handleUniversalCreate: vi.fn(),
  handleUniversalUpdate: vi.fn(),
  getSingularResourceType: vi.fn((type: string) =>
    type === 'companies' ? 'company' : type.slice(0, -1)
  ),
}));

vi.mock(
  '@/handlers/tool-configs/universal/schemas.js',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/handlers/tool-configs/universal/schemas.js')
      >();
    return {
      ...actual,
      validateUniversalToolParams: vi.fn(
        (_operation: string, params: Record<string, unknown>) => params
      ),
      CrossResourceValidator: {
        validateRecordRelationships: vi.fn().mockResolvedValue(undefined),
      },
    };
  }
);

vi.mock('@/services/UniversalUpdateService.js', () => ({
  UniversalUpdateService: {
    updateRecordWithValidation: vi.fn(),
  },
}));

import {
  createCompanyConfig,
  createCompanyDefinition,
  createDealConfig,
  createDealDefinition,
  updateCompanyConfig,
  updateCompanyDefinition,
  updateDealConfig,
  updateDealDefinition,
  coreOperationsToolConfigs,
  coreOperationsToolDefinitions,
} from '@/handlers/tool-configs/universal/core/index.js';
import {
  universalToolConfigs,
  universalToolDefinitions,
} from '@/handlers/tool-configs/universal/index.js';
import { findToolConfig } from '@/handlers/tools/registry.js';
import { JsonSchemaValidator } from '@/middleware/validation.js';
import {
  UniversalResourceType,
  type UniversalCreateParams,
  type UniversalUpdateParams,
} from '@/handlers/tool-configs/universal/types.js';

describe('scoped CRUD universal tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers scoped company and deal tools in core and universal catalogues', () => {
    const expectedNames = [
      'create_company',
      'update_company',
      'create_deal',
      'update_deal',
    ];

    for (const toolName of expectedNames) {
      expect(coreOperationsToolConfigs).toHaveProperty(toolName);
      expect(coreOperationsToolDefinitions).toHaveProperty(toolName);
      expect(universalToolConfigs).toHaveProperty(toolName);
      expect(universalToolDefinitions).toHaveProperty(toolName);
      expect(findToolConfig(toolName)?.resourceType).toBe('UNIVERSAL');
    }
  });

  it('create_company injects companies resource type and ignores caller override', async () => {
    const mockCreatedRecord = {
      id: { record_id: 'company-1' },
      values: { name: [{ value: 'Acme' }] },
    };
    const { handleUniversalCreate } =
      await import('@/handlers/tool-configs/universal/shared-handlers.js');
    vi.mocked(handleUniversalCreate).mockResolvedValue(
      mockCreatedRecord as any
    );

    const result = await createCompanyConfig.handler({
      resource_type: UniversalResourceType.DEALS,
      record_data: { name: 'Acme' },
      return_details: true,
    } as UniversalCreateParams);

    expect(result).toEqual(mockCreatedRecord);
    expect(handleUniversalCreate).toHaveBeenCalledWith({
      resource_type: UniversalResourceType.COMPANIES,
      record_data: { name: 'Acme' },
      return_details: true,
    });
  });

  it('create_deal injects deals resource type and ignores caller override', async () => {
    const mockCreatedRecord = {
      id: { record_id: 'deal-1' },
      values: { name: [{ value: 'Expansion' }] },
    };
    const { handleUniversalCreate } =
      await import('@/handlers/tool-configs/universal/shared-handlers.js');
    vi.mocked(handleUniversalCreate).mockResolvedValue(
      mockCreatedRecord as any
    );

    const result = await createDealConfig.handler({
      resource_type: UniversalResourceType.COMPANIES,
      record_data: { name: 'Expansion', stage: 'Demo' },
      return_details: true,
    } as UniversalCreateParams);

    expect(result).toEqual(mockCreatedRecord);
    expect(handleUniversalCreate).toHaveBeenCalledWith({
      resource_type: UniversalResourceType.DEALS,
      record_data: { name: 'Expansion', stage: 'Demo' },
      return_details: true,
    });
  });

  it('update_company injects companies resource type and ignores caller override', async () => {
    const mockUpdatedRecord = {
      id: { record_id: 'company-1' },
      values: { name: [{ value: 'Acme' }] },
    };
    const { handleUniversalUpdate } =
      await import('@/handlers/tool-configs/universal/shared-handlers.js');
    vi.mocked(handleUniversalUpdate).mockResolvedValue(
      mockUpdatedRecord as any
    );

    const result = await updateCompanyConfig.handler({
      resource_type: UniversalResourceType.DEALS,
      record_id: 'company-1',
      record_data: { website: 'https://acme.example' },
      return_details: true,
    } as UniversalUpdateParams);

    expect(result).toEqual(mockUpdatedRecord);
    expect(handleUniversalUpdate).toHaveBeenCalledWith({
      resource_type: UniversalResourceType.COMPANIES,
      record_id: 'company-1',
      record_data: { website: 'https://acme.example' },
      return_details: true,
    });
  });

  it('update_deal injects deals resource type and ignores caller override', async () => {
    const mockUpdatedRecord = {
      id: { record_id: 'deal-1' },
      values: { name: [{ value: 'Expansion' }] },
    };
    const { UniversalUpdateService } =
      await import('@/services/UniversalUpdateService.js');
    vi.mocked(
      UniversalUpdateService.updateRecordWithValidation
    ).mockResolvedValue({
      record: mockUpdatedRecord as any,
      validation: {
        warnings: [],
        suggestions: [],
        actualValues: {},
      },
    });

    const result = await updateDealConfig.handler({
      resource_type: UniversalResourceType.COMPANIES,
      record_id: 'deal-1',
      record_data: { stage: 'Demo' },
      return_details: false,
    } as UniversalUpdateParams);

    expect(result.id).toEqual(mockUpdatedRecord.id);
    expect(
      UniversalUpdateService.updateRecordWithValidation
    ).toHaveBeenCalledWith({
      resource_type: UniversalResourceType.DEALS,
      record_id: 'deal-1',
      record_data: { stage: 'Demo' },
      return_details: false,
    });
  });

  it('delegates formatting and structured output with fixed resource types', () => {
    const companyRecord = {
      id: { record_id: 'company-1' },
      values: { name: [{ value: 'Acme' }] },
    };
    const dealRecord = {
      id: { record_id: 'deal-1' },
      values: { name: [{ value: 'Expansion' }] },
    };

    expect(createCompanyConfig.formatResult(companyRecord as any)).toContain(
      'company'
    );
    expect(updateDealConfig.formatResult(dealRecord as any)).toContain('deal');

    expect(
      createCompanyConfig.structuredOutput?.(companyRecord as any)
    ).toEqual(
      expect.objectContaining({
        values: expect.objectContaining({ name: 'Acme' }),
      })
    );
    expect(updateDealConfig.structuredOutput?.(dealRecord as any)).toEqual(
      expect.objectContaining({
        id: expect.objectContaining({ record_id: 'deal-1' }),
      })
    );
  });

  it('uses constrained schemas without exposing resource_type', () => {
    const definitions = [
      createCompanyDefinition,
      createDealDefinition,
      updateCompanyDefinition,
      updateDealDefinition,
    ];

    for (const definition of definitions) {
      const schema = definition.inputSchema;
      expect(schema.additionalProperties).toBe(false);
      expect(schema.properties).not.toHaveProperty('resource_type');
      expect(schema.properties).toHaveProperty('record_data');
      expect(schema.examples.length).toBeGreaterThan(0);
    }

    expect(createCompanyDefinition.inputSchema.required).toEqual([
      'record_data',
    ]);
    expect(createDealDefinition.inputSchema.required).toEqual(['record_data']);
    expect(updateCompanyDefinition.inputSchema.required).toEqual([
      'record_id',
      'record_data',
    ]);
    expect(updateDealDefinition.inputSchema.required).toEqual([
      'record_id',
      'record_data',
    ]);

    const invalid = JsonSchemaValidator.validate(
      {
        resource_type: 'companies',
        record_data: { name: 'Acme' },
        unexpected: true,
      },
      createCompanyDefinition.inputSchema
    );

    expect(invalid.valid).toBe(false);
    expect(invalid.errors?.map((error) => error.field)).toEqual([
      'resource_type',
      'unexpected',
    ]);
  });

  it('documents scoped and generic selection boundaries', () => {
    expect(createCompanyDefinition.description).toContain('Create one company');
    expect(updateDealDefinition.description).toContain('Update one deal');
    expect(universalToolDefinitions.create_record.description).toContain(
      'Prefer create_company or create_deal'
    );
    expect(universalToolDefinitions.update_record.description).toContain(
      'Prefer update_company or update_deal'
    );
    expect(universalToolDefinitions.batch_records.description).toContain(
      'Use scoped single-record tools for one company or deal write'
    );
  });
});
