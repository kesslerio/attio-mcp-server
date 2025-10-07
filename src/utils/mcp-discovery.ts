import { TOOL_DEFINITIONS } from '@/handlers/tools/registry.js';
import { filterAllowedTools } from '@/config/tool-mode.js';
import { getAllPrompts } from '@/prompts/templates/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

type ToolWithAnnotations = Tool & {
  annotations?: Record<string, unknown>;
};

const WRITE_TOOL_PATTERN =
  /(create|update|delete|remove|add|batch|commit|write)/i;

function ensureAnnotations(tool: Tool): Tool {
  const typedTool = tool as ToolWithAnnotations;
  const annotations: Record<string, unknown> = {
    ...(typedTool.annotations ?? {}),
  };

  if (annotations.readOnlyHint === undefined) {
    annotations.readOnlyHint = !WRITE_TOOL_PATTERN.test(tool.name);
  }

  if (annotations.openWorldHint === undefined) {
    annotations.openWorldHint = true;
  }

  return {
    ...tool,
    annotations,
  } as Tool;
}

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

function flattenToolDefinitions(): Tool[] {
  const allTools: Tool[] = [];

  for (const toolDefs of Object.values(TOOL_DEFINITIONS)) {
    if (!toolDefs) {
      continue;
    }

    if (Array.isArray(toolDefs)) {
      allTools.push(...(toolDefs as Tool[]));
      continue;
    }

    if (typeof toolDefs === 'object') {
      allTools.push(...(Object.values(toolDefs) as Tool[]));
    }
  }

  const allowed = filterAllowedTools(allTools) as Tool[];
  return allowed.map((tool) => ensureAnnotations(tool));
}

export function getToolsListPayload(): ToolsListPayload {
  return {
    tools: flattenToolDefinitions(),
  };
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
