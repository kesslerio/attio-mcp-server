import { TOOL_DEFINITIONS } from '@/handlers/tools/registry.js';
import { filterAllowedTools } from '@/config/tool-mode.js';
import { getAllPrompts } from '@/prompts/templates/index.js';
import { ATTIO_WIDGET_URI } from '@/ui/attio-widget.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

type ToolWithExtensions = Tool & {
  _meta?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  securitySchemes?: Array<Record<string, unknown>>;
};

const DEFAULT_SECURITY_SCHEMES: Array<Record<string, unknown>> = [
  {
    type: 'apiKey',
    in: 'header',
    name: 'Authorization',
    description:
      'Bearer token. Provide ATTIO_API_KEY (and optional ATTIO_WORKSPACE_ID) to access Attio APIs.',
  },
];

const WRITE_PATTERN = /create|update|delete|remove|add|batch/i;
const DESTRUCTIVE_PATTERN = /delete|remove/i;

function isWriteTool(name: string): boolean {
  return WRITE_PATTERN.test(name);
}

function isDestructiveTool(name: string): boolean {
  return DESTRUCTIVE_PATTERN.test(name);
}

function enrichToolDefinition(original: Tool): Tool {
  const tool = original as ToolWithExtensions;
  const annotations: Record<string, unknown> = {
    ...(tool.annotations ?? {}),
  };

  if (annotations.readOnlyHint === undefined) {
    annotations.readOnlyHint = !isWriteTool(tool.name);
  }

  if (annotations.destructiveHint === undefined) {
    annotations.destructiveHint = isDestructiveTool(tool.name);
  }

  const meta = {
    ...(tool._meta ?? {}),
  };

  if (!meta['openai/outputTemplate']) {
    meta['openai/outputTemplate'] = ATTIO_WIDGET_URI;
  }

  if (!meta['openai/toolInvocation/invoking']) {
    meta['openai/toolInvocation/invoking'] = `Running ${tool.name}…`;
  }

  if (!meta['openai/toolInvocation/invoked']) {
    meta['openai/toolInvocation/invoked'] = `${tool.name} finished.`;
  }

  if (meta['openai/widgetAccessible'] === undefined) {
    meta['openai/widgetAccessible'] = false;
  }

  const securitySchemes =
    tool.securitySchemes && tool.securitySchemes.length > 0
      ? tool.securitySchemes
      : DEFAULT_SECURITY_SCHEMES;

  return {
    ...tool,
    annotations,
    securitySchemes,
    _meta: meta,
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

  const allowedTools = filterAllowedTools(allTools) as Tool[];
  return allowedTools.map((tool) => enrichToolDefinition(tool));
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
