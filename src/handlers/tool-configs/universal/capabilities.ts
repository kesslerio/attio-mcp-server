/**
 * Static capability manifest: a projection of permitted callable descriptors.
 * Descriptors own operation facts and guidance beside their input schemas.
 * Nothing here calls Attio or publishes credential grants. Schema documents
 * are data, never recursively expanded manifests.
 */
import type {
  ToolOperationMetadata,
  OperationTool,
} from '@/handlers/tool-types.js';
import {
  formatCapabilityGuidance,
  type CapabilityGuidance,
} from '@/handlers/tools/standards/index.js';
import { isSearchOnlyMode } from '@/config/tool-mode.js';
import { capabilitiesResultContract } from '@/handlers/tools/result-schemas.js';
import {
  defineOperationTool,
  permittedOperationGuidance,
  projectOperationTool,
} from '@/handlers/tools/operation-descriptor.js';

/** Shape of the published manifest. Bumped when the entry contract changes. */
export const CAPABILITY_MANIFEST_VERSION = 1;

/** Discovery surfaces the manifest can describe. */
export type CapabilityManifestMode = 'full' | 'search-only';

/** The manifest tool itself is only advertised in the full catalogue. */
export const CAPABILITIES_TOOL_NAME = 'capabilities_get';

/**
 * Live manifest for a request.
 *
 * `utils/mcp-discovery.ts` owns the registry projection, and the registry
 * imports this module through `universal/index.js`, so a static edge back to
 * discovery would read `universalToolDefinitions` before it is initialized.
 * The lookup is deferred to call time instead, which keeps one projection and
 * no import cycle.
 */
export async function readCapabilityManifest(): Promise<CapabilityManifest> {
  const discovery = await import('@/utils/mcp-discovery.js');
  return discovery.getCapabilityManifest();
}

/** One manifest entry: registry identity plus authored operation metadata. */
export interface CapabilityEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown> | null;
  outputSchema: Record<string, unknown> | null;
  annotations: Record<string, unknown>;
  operation: ToolOperationMetadata | null;
  guidance: (CapabilityGuidance & { summary: string }) | null;
  /** True when the registry offers no authored operation metadata for this name. */
  unannotated?: true;
}

/** The published manifest for the mode that produced `tools`. */
export interface CapabilityManifest {
  schemaVersion: number;
  mode: CapabilityManifestMode;
  toolCount: number;
  authorization: {
    enforcedAt: 'call-time';
    publishesCredentialGrants: false;
    note: string;
  };
  tools: CapabilityEntry[];
}

function asSchemaDocument(schema: unknown): Record<string, unknown> | null {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return null;
  }
  return schema as Record<string, unknown>;
}

/**
 * Project an advertised tool list into the capability manifest.
 *
 * `tools` must be the same mode-filtered descriptors `tools/list` returns, so
 * the manifest can never advertise a tool the server would not list.
 */
export function buildCapabilityManifest(
  tools: readonly OperationTool[]
): CapabilityManifest {
  const permitted = new Set(tools.map((tool) => tool.name));
  const entries: CapabilityEntry[] = tools.map((descriptor) => {
    const authored = descriptor.facts;
    const tool = projectOperationTool(descriptor, permitted);
    const permittedGuidance = permittedOperationGuidance(descriptor, permitted);
    const guidance = permittedGuidance
      ? {
          ...permittedGuidance,
          summary: formatCapabilityGuidance(permittedGuidance),
        }
      : null;

    return {
      name: tool.name,
      description: tool.description ?? '',
      inputSchema: asSchemaDocument(tool.inputSchema),
      outputSchema: asSchemaDocument(
        (tool as { outputSchema?: unknown }).outputSchema
      ),
      annotations: { ...(tool.annotations ?? {}) },
      operation: authored ? authored.operation : null,
      guidance,
      ...(authored ? {} : { unannotated: true as const }),
    };
  });

  return {
    schemaVersion: CAPABILITY_MANIFEST_VERSION,
    mode: isSearchOnlyMode() ? 'search-only' : 'full',
    toolCount: entries.length,
    authorization: {
      enforcedAt: 'call-time',
      publishesCredentialGrants: false,
      note: 'Entries describe configured functionality. Authorization is enforced on every call, so a listed tool can still be denied by the credential that reaches the server.',
    },
    tools: entries,
  };
}

export const capabilitiesGetInputSchema = {
  type: 'object' as const,
  properties: {},
  required: [] as const,
  additionalProperties: false,
  examples: [{}],
};

/** MCP descriptor for the static discovery tool. */
export const capabilitiesGetToolDefinition = defineOperationTool({
  name: CAPABILITIES_TOOL_NAME,
  facts: {
    operation: {
      customObjectSlugs: false,
      pagination: { kind: 'none', supported: false, cap: null },
      action: 'read',
      resourceTypes: [],
      authRequired: false,
      readOnly: true,
      destructive: false,
      idempotent: true,
    },
    guidance: {
      capability:
        'List every tool this server can serve, with its schemas and operation semantics.',
      boundaries:
        'report credential-specific grants, list workspace objects, or call Attio.',
      constraints:
        'Static and mode-filtered; a listed tool still enforces authorization when called.',
      recovery: 'Re-read after a mode or deployment change.',
      alternatives: ['tools/list', 'aaa-health-check'],
    },
  },
  inputSchema: capabilitiesGetInputSchema,
  annotations: { openWorldHint: false },
});

/**
 * Handler for `capabilities_get`.
 *
 * The manifest builder lives in `utils/mcp-discovery.ts`, which also owns the
 * registry projection. It is imported lazily so this module stays loadable
 * from the registry itself without an import cycle.
 */
export const capabilitiesGetConfig = {
  name: CAPABILITIES_TOOL_NAME,
  ...capabilitiesResultContract,
  handler: async () => readCapabilityManifest(),
  structuredOutput: (payload: unknown): Record<string, unknown> => ({
    data: payload as Record<string, unknown>,
  }),
  formatResult: (manifest: Record<string, unknown>): string => {
    const tools = Array.isArray(manifest?.tools) ? manifest.tools : [];
    const mode = manifest?.mode ?? 'full';
    const lines = [
      `Capability manifest v${manifest?.schemaVersion ?? 1} (${mode}): ${tools.length} tools`,
    ];
    for (const entry of tools as Array<Record<string, unknown>>) {
      const operation = (entry.operation ?? {}) as Record<string, unknown>;
      const pagination = (operation.pagination ?? {}) as Record<
        string,
        unknown
      >;
      lines.push(
        `- ${entry.name}: ${operation.action ?? 'unknown'} ` +
          `read=${operation.readOnly ?? '?'} destructive=${operation.destructive ?? '?'} ` +
          `idempotent=${operation.idempotent ?? '?'} ` +
          `pagination=${pagination.kind ?? 'none'} auth=${operation.authRequired ?? '?'}`
      );
    }
    return lines.join('\n');
  },
};

/**
 * Sections the health probe publishes.
 *
 * Health is a credential-free liveness probe, so it carries the *operation*
 * facts for its permitted set and leaves the schema documents to
 * `capabilities_get` and `tools/list`. This is an explicit, self-described
 * projection, not a shorter catalog: the names and facts are identical.
 */
export const HEALTH_CAPABILITY_SECTIONS = [
  'operations',
  'annotations',
  'guidance',
] as const;

/** Health-shaped projection of the live manifest. */
export function healthCapabilityProjection(
  manifest: CapabilityManifest
): Record<string, unknown> {
  return {
    ...manifest,
    tools: manifest.tools.map(
      ({ inputSchema: _inputSchema, outputSchema: _outputSchema, ...entry }) =>
        entry
    ),
    projection: {
      sections: [...HEALTH_CAPABILITY_SECTIONS],
      schemaSource:
        manifest.mode === 'search-only' ? 'tools/list' : CAPABILITIES_TOOL_NAME,
      note: 'Health publishes the operation facts for the permitted set; input and output schema documents come from tools/list (or capabilities_get in full mode).',
    },
  };
}
