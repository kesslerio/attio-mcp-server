import { defineOperationTool } from '@/handlers/tools/operation-descriptor.js';
import { recordWriteResultContract } from '@/handlers/tools/result-schemas.js';
import { TOOL_NAMES } from '@/constants/tool-names.js';
import type { UniversalRecord } from '@/types/attio.js';

import {
  UniversalCreateParams,
  UniversalResourceType,
  UniversalToolConfig,
  UniversalUpdateParams,
} from '@/handlers/tool-configs/universal/types.js';
import {
  createRecordConfig,
  updateRecordConfig,
} from '@/handlers/tool-configs/universal/core/crud-operations.js';

type ScopedCreateParams = Omit<UniversalCreateParams, 'resource_type'> & {
  resource_type?: unknown;
};

type ScopedUpdateParams = Omit<UniversalUpdateParams, 'resource_type'> & {
  resource_type?: unknown;
};

interface ScopedCreateToolOptions {
  name: string;
  resourceType: UniversalResourceType.COMPANIES | UniversalResourceType.DEALS;
}

interface ScopedUpdateToolOptions {
  name: string;
  resourceType: UniversalResourceType.COMPANIES | UniversalResourceType.DEALS;
}

function scopedCreateConfig({
  name,
  resourceType,
}: ScopedCreateToolOptions): UniversalToolConfig<
  ScopedCreateParams,
  UniversalRecord
> {
  return {
    name,
    ...recordWriteResultContract,
    handler: (params: ScopedCreateParams) =>
      createRecordConfig.handler({
        resource_type: resourceType,
        record_data: params.record_data,
        return_details: params.return_details,
      }),
    formatResult: (record: UniversalRecord) =>
      createRecordConfig.formatResult(record, resourceType),
    structuredOutput: (record: UniversalRecord) =>
      createRecordConfig.structuredOutput?.(record, resourceType) ?? {},
  };
}

function scopedUpdateConfig({
  name,
  resourceType,
}: ScopedUpdateToolOptions): UniversalToolConfig<
  ScopedUpdateParams,
  UniversalRecord
> {
  return {
    name,
    ...recordWriteResultContract,
    handler: (params: ScopedUpdateParams) =>
      updateRecordConfig.handler({
        resource_type: resourceType,
        record_id: params.record_id,
        record_data: params.record_data,
        return_details: params.return_details,
      }),
    formatResult: (record: UniversalRecord) =>
      updateRecordConfig.formatResult(record, resourceType),
    structuredOutput: (record: UniversalRecord) =>
      updateRecordConfig.structuredOutput?.(record, resourceType) ?? {},
  };
}

function scopedCreateSchema(
  resourceLabel: string,
  examples: Array<Record<string, unknown>>
) {
  return {
    type: 'object' as const,
    properties: {
      record_data: {
        type: 'object' as const,
        description: `${resourceLabel} fields to create. Use Attio attribute API slugs as keys.`,
        additionalProperties: true,
      },
      return_details: {
        type: 'boolean' as const,
        default: true,
        description: 'Return full details',
      },
    },
    required: ['record_data' as const],
    additionalProperties: false,
    examples,
  };
}

function scopedUpdateSchema(
  resourceLabel: string,
  examples: Array<Record<string, unknown>>
) {
  return {
    type: 'object' as const,
    properties: {
      record_id: {
        type: 'string' as const,
        description: `${resourceLabel} record ID to update`,
      },
      record_data: {
        type: 'object' as const,
        description: `${resourceLabel} fields to update. Use Attio attribute API slugs as keys.`,
        additionalProperties: true,
      },
      return_details: {
        type: 'boolean' as const,
        default: true,
        description: 'Return full details',
      },
    },
    required: ['record_id' as const, 'record_data' as const],
    additionalProperties: false,
    examples,
  };
}

export const createCompanyConfig = scopedCreateConfig({
  name: TOOL_NAMES.CREATE_COMPANY,
  resourceType: UniversalResourceType.COMPANIES,
});

export const updateCompanyConfig = scopedUpdateConfig({
  name: TOOL_NAMES.UPDATE_COMPANY,
  resourceType: UniversalResourceType.COMPANIES,
});

export const createDealConfig = scopedCreateConfig({
  name: TOOL_NAMES.CREATE_DEAL,
  resourceType: UniversalResourceType.DEALS,
});

export const updateDealConfig = scopedUpdateConfig({
  name: TOOL_NAMES.UPDATE_DEAL,
  resourceType: UniversalResourceType.DEALS,
});

export const createCompanyDefinition = defineOperationTool({
  name: TOOL_NAMES.CREATE_COMPANY,
  facts: {
    operation: {
      customObjectSlugs: false,
      pagination: { kind: 'none', supported: false, cap: null },
      action: 'write',
      resourceTypes: ['companies'],
      authRequired: true,
      readOnly: false,
      destructive: false,
      idempotent: false,
    },
    guidance: {
      capability: 'Create one company without naming a resource_type.',
      boundaries:
        'update existing companies, or create deals, people, or tasks.',
      constraints:
        'May require explicit user approval from the host. Requires record_data using company attribute slugs such as name, domains, or website.',
      recovery: 'Discover company attribute slugs, then retry the create.',
      alternatives: ['records_create', 'companies_update'],
    },
  },
  inputSchema: scopedCreateSchema('Company', [
    {
      record_data: {
        name: 'Acme Corp',
        domains: [{ domain: 'acme.example' }],
        website: 'https://acme.example',
      },
      return_details: true,
    },
  ]),
});

export const updateCompanyDefinition = defineOperationTool({
  name: TOOL_NAMES.UPDATE_COMPANY,
  facts: {
    operation: {
      customObjectSlugs: false,
      pagination: { kind: 'none', supported: false, cap: null },
      action: 'write',
      resourceTypes: ['companies'],
      authRequired: true,
      readOnly: false,
      destructive: true,
      idempotent: true,
    },
    guidance: {
      capability: 'Update one company without naming a resource_type.',
      boundaries: 'create records, delete records, or update deals.',
      constraints:
        'May require explicit user approval from the host. Requires record_id and record_data with company slugs.',
      recovery: 'Confirm the company identifier before patching.',
      alternatives: ['records_update', 'companies_create'],
    },
  },
  inputSchema: scopedUpdateSchema('Company', [
    {
      record_id: 'company-record-id',
      record_data: {
        website: 'https://acme.example',
        description: 'Enterprise manufacturing account',
      },
      return_details: true,
    },
  ]),
});

export const createDealDefinition = defineOperationTool({
  name: TOOL_NAMES.CREATE_DEAL,
  facts: {
    operation: {
      customObjectSlugs: false,
      pagination: { kind: 'none', supported: false, cap: null },
      action: 'write',
      resourceTypes: ['deals'],
      authRequired: true,
      readOnly: false,
      destructive: false,
      idempotent: false,
    },
    guidance: {
      capability: 'Create one deal without naming a resource_type.',
      boundaries:
        'update existing deals, or create companies, people, or tasks.',
      constraints:
        'May require explicit user approval from the host. Requires record_data with deal slugs such as name, stage, value, owner, or linked references.',
      recovery: 'List valid stage and owner options, then retry.',
      alternatives: ['records_create', 'deals_update'],
    },
  },
  inputSchema: scopedCreateSchema('Deal', [
    {
      record_data: {
        name: 'Acme expansion',
        stage: 'Demo',
        value: 50000,
        associated_company: 'company-record-id',
        owner: 'workspace-member-id',
      },
      return_details: true,
    },
  ]),
});

export const updateDealDefinition = defineOperationTool({
  name: TOOL_NAMES.UPDATE_DEAL,
  facts: {
    operation: {
      customObjectSlugs: false,
      pagination: { kind: 'none', supported: false, cap: null },
      action: 'write',
      resourceTypes: ['deals'],
      authRequired: true,
      readOnly: false,
      destructive: true,
      idempotent: true,
    },
    guidance: {
      capability: 'Update one deal without naming a resource_type.',
      boundaries: 'create records, delete records, or update companies.',
      constraints:
        'May require explicit user approval from the host. Requires record_id and record_data with deal slugs.',
      recovery: 'Read the deal and its current stage before patching.',
      alternatives: ['records_update', 'records_merge', 'deals_create'],
    },
  },
  inputSchema: scopedUpdateSchema('Deal', [
    {
      record_id: 'deal-record-id',
      record_data: {
        stage: 'Proposal',
        value: 75000,
        associated_company: 'company-record-id',
      },
      return_details: true,
    },
  ]),
});
