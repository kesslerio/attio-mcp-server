import type { Tool } from '@modelcontextprotocol/server';
import type {
  OperationTool,
  ToolOperationFacts,
} from '@/handlers/tool-types.js';
import {
  formatCapabilityGuidance,
  type CapabilityGuidance,
} from '@/handlers/tools/standards/index.js';

/** Define facts beside a tool's schema, with no independently authored hints. */
export function defineOperationTool<
  T extends {
    facts: ToolOperationFacts;
    annotations?: Record<string, unknown>;
  },
>(definition: T) {
  return {
    ...definition,
    get description(): string {
      return formatCapabilityGuidance(definition.facts.guidance);
    },
    get annotations(): Record<string, unknown> {
      const { operation } = definition.facts;
      return {
        ...definition.annotations,
        readOnlyHint: operation.readOnly,
        destructiveHint: operation.destructive,
        idempotentHint: operation.idempotent,
        openWorldHint: definition.annotations?.openWorldHint ?? true,
      };
    },
  };
}

/** Restrict selection advice to the same permitted set as discovery itself. */
export function permittedOperationGuidance(
  tool: OperationTool,
  permitted: ReadonlySet<string>
): CapabilityGuidance | null {
  if (!tool.facts) return null;
  return {
    ...tool.facts.guidance,
    alternatives: (tool.facts.guidance.alternatives ?? []).filter(
      (name) => name === 'tools/list' || permitted.has(name)
    ),
  };
}

/** Strip internal facts and render only the ordinary MCP descriptor fields. */
export function projectOperationTool(
  descriptor: OperationTool,
  permitted: ReadonlySet<string>
): Tool {
  const { facts, ...tool } = descriptor;
  const guidance = permittedOperationGuidance(descriptor, permitted);
  return {
    ...tool,
    ...(guidance ? { description: formatCapabilityGuidance(guidance) } : {}),
    annotations: {
      openWorldHint: true,
      ...tool.annotations,
      ...(facts
        ? {
            readOnlyHint: facts.operation.readOnly,
            destructiveHint: facts.operation.destructive,
            idempotentHint: facts.operation.idempotent,
          }
        : {}),
    },
  };
}
