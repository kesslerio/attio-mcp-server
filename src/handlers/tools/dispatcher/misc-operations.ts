import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ResourceType } from '../../../types/attio.js';
import type { ToolConfig } from '../../tool-types.js';

export async function handleInfoOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  const idParam =
    resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;
  if (!id) throw new Error(`${idParam} parameter is required`);

  const result = await (toolConfig as ToolConfig).handler(id);
  const formattedResult = toolConfig.formatResult
    ? toolConfig.formatResult(result)
    : result;

  return { content: [{ type: 'text', text: formattedResult }], isError: false };
}

export async function handleFieldsOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  const idParam =
    resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;
  const fields = request.params.arguments?.fields as string[];
  if (!id || !fields)
    throw new Error('Both id and fields parameters are required');

  const result = await (toolConfig as ToolConfig).handler(id, fields);
  const formattedResult = toolConfig.formatResult
    ? toolConfig.formatResult(result)
    : result;
  return { content: [{ type: 'text', text: formattedResult }], isError: false };
}

export async function handleGetAttributesOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  const idParam =
    resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;
  const attributeName = request.params.arguments?.attributeName as string;
  if (!id) throw new Error(`${idParam} parameter is required`);

  const result = await (toolConfig as ToolConfig).handler(id, attributeName);
  const formattedResult = toolConfig.formatResult
    ? toolConfig.formatResult(result)
    : result;
  return { content: [{ type: 'text', text: formattedResult }], isError: false };
}

export async function handleDiscoverAttributesOperation(
  _request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const result = await (toolConfig as ToolConfig).handler();
  const formattedResult = toolConfig.formatResult
    ? toolConfig.formatResult(result)
    : result;
  return { content: [{ type: 'text', text: formattedResult }], isError: false };
}
