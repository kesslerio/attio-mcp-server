import { TOOL_DEFINITIONS, findToolConfig } from '@/handlers/tools/registry.js';
import { filterAllowedTools } from '@/config/tool-mode.js';
import { getAllPrompts } from '@/prompts/templates/index.js';
import {
  buildCapabilityManifest,
  capabilityOperationFor,
  type CapabilityManifest,
} from '@/handlers/tool-configs/universal/capabilities.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

type ToolWithAnnotations = Tool & {
  annotations?: Record<string, unknown>;
};

/**
 * Attach the MCP annotation set from authored operation metadata.
 *
 * The read/write/destructive/idempotent hints come from the same table the
 * capability manifest projects, so discovery never guesses capability from a
 * name shape (KTD8). A tool with no authored entry keeps whatever its
 * descriptor declares, and the schema linter fails a missing entry rather
 * than letting a guess stand.
 */
function ensureAnnotations(tool: Tool): Tool {
  const typedTool = tool as ToolWithAnnotations;
  const operation = capabilityOperationFor(tool.name);
  const annotations: Record<string, unknown> = {
    ...(typedTool.annotations ?? {}),
  };

  if (operation) {
    annotations.readOnlyHint = operation.readOnly;
    annotations.destructiveHint = operation.destructive;
    annotations.idempotentHint = operation.idempotent;
  }

  if (annotations.openWorldHint === undefined) {
    annotations.openWorldHint = true;
  }

  const outputSchema = findToolConfig(tool.name)?.toolConfig.outputSchema;
  return {
    ...tool,
    ...(outputSchema ? { outputSchema } : {}),
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

/**
 * The permitted capability manifest for the active server mode.
 *
 * It is a projection of the very same mode-filtered descriptors that
 * `tools/list` advertises, so the manifest and the advertised surface cannot
 * disagree, and building it needs no credential and no Attio call.
 */
export function getCapabilityManifest(): CapabilityManifest {
  return buildCapabilityManifest(getToolsListPayload().tools);
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
