import { TOOL_DEFINITIONS, findToolConfig } from '@/handlers/tools/registry.js';
import { filterAllowedTools } from '@/config/tool-mode.js';
import { getAllPrompts } from '@/prompts/templates/index.js';
import {
  buildCapabilityManifest,
  type CapabilityManifest,
} from '@/handlers/tool-configs/universal/capabilities.js';
import type { Tool } from '@modelcontextprotocol/server';

import type { OperationTool } from '@/handlers/tool-types.js';
import { projectOperationTool } from '@/handlers/tools/operation-descriptor.js';

export interface ToolsListPayload {
  tools: Tool[];
}

export interface PromptSummary {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface PromptsListPayload {
  prompts: PromptSummary[];
}

export function getPermittedToolDescriptors(): OperationTool[] {
  const allTools: OperationTool[] = [];

  for (const toolDefs of Object.values(TOOL_DEFINITIONS)) {
    if (!toolDefs) {
      continue;
    }

    if (Array.isArray(toolDefs)) {
      allTools.push(...(toolDefs as OperationTool[]));
      continue;
    }

    if (typeof toolDefs === 'object') {
      allTools.push(...(Object.values(toolDefs) as OperationTool[]));
    }
  }

  const allowed = filterAllowedTools(allTools) as OperationTool[];
  return allowed.map((tool) => {
    const outputSchema = findToolConfig(tool.name)?.toolConfig.outputSchema;
    return { ...tool, ...(outputSchema ? { outputSchema } : {}) };
  });
}

export function getToolsListPayload(): ToolsListPayload {
  const descriptors = getPermittedToolDescriptors();
  const permitted = new Set(descriptors.map((tool) => tool.name));
  return {
    tools: descriptors.map((tool) => projectOperationTool(tool, permitted)),
  };
}

/**
 * The permitted capability manifest for the active server mode.
 *
 * It is a projection of the very same mode-filtered descriptors that
 * `tools/list` advertises, so the manifest and the advertised surface cannot
 * disagree, and building it needs no credential and no Attio call.
 */
export function getCapabilityManifest(): CapabilityManifest {
  return buildCapabilityManifest(getPermittedToolDescriptors());
}

export function getPromptsListPayload(): PromptsListPayload {
  const prompts = getAllPrompts();
  return {
    prompts: prompts.map((prompt) => ({
      id: prompt.id,
      name: prompt.title,
      description: prompt.description,
      category: prompt.category,
    })),
  };
}
