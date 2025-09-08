import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

import { ResourceType } from '../../../types/attio.js';
import type { ToolConfig } from '../../tool-types.js';

export async function handleInfoOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
    resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  if (!id) throw new Error(`${idParam} parameter is required`);

    ? toolConfig.formatResult(result)
    : result;

  return { content: [{ type: 'text', text: formattedResult }], isError: false };
}

export async function handleFieldsOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
    resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  if (!id || !fields)
    throw new Error('Both id and fields parameters are required');

    ? toolConfig.formatResult(result)
    : result;
  return { content: [{ type: 'text', text: formattedResult }], isError: false };
}

export async function handleGetAttributesOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
    resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  if (!id) throw new Error(`${idParam} parameter is required`);

    ? toolConfig.formatResult(result)
    : result;
  return { content: [{ type: 'text', text: formattedResult }], isError: false };
}

export async function handleDiscoverAttributesOperation(
  _request: CallToolRequest,
  toolConfig: ToolConfig
) {
    ? toolConfig.formatResult(result)
    : result;
  return { content: [{ type: 'text', text: formattedResult }], isError: false };
}
