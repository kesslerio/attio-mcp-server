import { TOOL_NAMES } from '@/constants/tool-names.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import type { UniversalRecord } from '@/types/attio.js';

import {
  UniversalCreateParams,
  UniversalResourceType,
  UniversalToolConfig,
  UniversalUpdateParams,
} from '../types.js';
import { createRecordConfig, updateRecordConfig } from './crud-operations.js';

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

export const createCompanyDefinition = {
  name: TOOL_NAMES.CREATE_COMPANY,
  description: formatToolDescription({
    capability: 'Create one company in Attio without choosing resource_type.',
    boundaries: 'update existing companies or create deals, people, or tasks',
    constraints:
      'Requires record_data with company attribute API slugs such as name, domains, or website.',
    requiresApproval: true,
    recoveryHint:
      'If fields are rejected, call discover_record_attributes with resource_type companies.',
  }),
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
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
};

export const updateCompanyDefinition = {
  name: TOOL_NAMES.UPDATE_COMPANY,
  description: formatToolDescription({
    capability: 'Update one company in Attio without choosing resource_type.',
    boundaries: 'create records, delete records, or update deals',
    constraints:
      'Requires record_id and record_data with company attribute API slugs.',
    requiresApproval: true,
    recoveryHint:
      'Call get_record_details or search_records for companies first to confirm the target company ID.',
  }),
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
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
  },
};

export const createDealDefinition = {
  name: TOOL_NAMES.CREATE_DEAL,
  description: formatToolDescription({
    capability: 'Create one deal in Attio without choosing resource_type.',
    boundaries: 'update existing deals or create companies, people, or tasks',
    constraints:
      'Requires record_data with deal attribute API slugs such as name, stage, value, owner, or associated company/person references.',
    requiresApproval: true,
    recoveryHint:
      'If stage or owner values are rejected, call discover_record_attributes or get_record_attribute_options for deals.',
  }),
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
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
};

export const updateDealDefinition = {
  name: TOOL_NAMES.UPDATE_DEAL,
  description: formatToolDescription({
    capability: 'Update one deal in Attio without choosing resource_type.',
    boundaries: 'create records, delete records, or update companies',
    constraints:
      'Requires record_id and record_data with deal attribute API slugs.',
    requiresApproval: true,
    recoveryHint:
      'Call search_records for deals first to confirm the target deal ID and current stage.',
  }),
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
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
  },
};
