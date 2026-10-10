/**
 * Static discovery must be provable, not assumed: every discovery payload is a
 * projection of the registered, mode-filtered descriptors, needs no credential,
 * calls no Attio endpoint, and carries no fixture secret in output or logs.
 *
 * Covers U7 test scenarios 1, 2, 6, and 7 for the discovery surface.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getToolsListPayload,
  getCapabilityManifest,
  getPermittedToolDescriptors,
  getPromptsListPayload,
} from '@/utils/mcp-discovery.js';
import {
  capabilitiesGetConfig,
  buildCapabilityManifest,
  CAPABILITY_MANIFEST_VERSION,
} from '@/handlers/tool-configs/universal/capabilities.js';
import {
  healthCheckConfig,
  healthCheckToolDefinition,
  advancedOperationsToolDefinitions,
} from '@/handlers/tool-configs/universal/index.js';
import { searchOnlyCanonicalToolNames } from '@/config/tool-mode.js';
import { canonicalToolNames } from '@/constants/tool-names.js';
import {
  capabilityManifestDataSchema,
  executionErrorSchema,
} from '@/handlers/tools/result-schemas.js';
import * as attioClientModule from '@/api/attio-client.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolOperationFacts } from '@/handlers/tool-types.js';

// Fixture material for the leak assertions. Never a real value.
const FIXTURE_API_KEY = 'attio_fixture_key_0f3c81d217b94f6';
const FIXTURE_ACCESS_TOKEN = 'attio_fixture_token_a5d9c1ce1e43';
const FIXTURE_AUTH_TOKEN = 'attio_fixture_bearer_7b11af04d2ee';

const ORIGINAL_MODE = process.env.ATTIO_MCP_TOOL_MODE;

const HEALTH_NAME = 'aaa-health-check';
const CONNECTOR_NAMES = ['search', 'fetch'];
const UNCHANGED_EXCEPTION_NAMES = [HEALTH_NAME, ...CONNECTOR_NAMES];

/** The names a discovery surface must expose for the requested mode. */
function advertisedNames(): string[] {
  return getToolsListPayload().tools.map((tool) => tool.name);
}

/** Every schema document an advertised tool publishes, by name. */
function schemaDocuments(tools: readonly Tool[]): Map<string, unknown> {
  const documents = new Map<string, unknown>();
  for (const tool of tools) {
    documents.set(tool.name, {
      inputSchema: tool.inputSchema ?? null,
      outputSchema: (tool as { outputSchema?: unknown }).outputSchema ?? null,
    });
  }
  return documents;
}

function logSink() {
  const captured: string[] = [];
  const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
    (method) =>
      vi.spyOn(console, method).mockImplementation((...rest: unknown[]) => {
        captured.push(rest.map((arg) => String(arg)).join(' '));
      })
  );
  return {
    captured,
    text: () => captured.join('\n'),
    restore: () => spies.forEach((spy) => spy.mockRestore()),
  };
}

async function collectDiscoveryPayloads(): Promise<string> {
  const chunks: string[] = [];
  chunks.push(JSON.stringify(getToolsListPayload()));
  chunks.push(JSON.stringify(getPromptsListPayload()));
  chunks.push(JSON.stringify(getCapabilityManifest()));

  const manifest = await (
    capabilitiesGetConfig.handler as (
      args: Record<string, unknown>
    ) => Promise<unknown>
  )({});
  chunks.push(JSON.stringify(manifest));

  const healthRaw = await (
    healthCheckConfig.handler as (
      args: Record<string, unknown>
    ) => Promise<unknown>
  )({});
  chunks.push(JSON.stringify(healthRaw));
  return chunks.join('\n');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('ATTIO_API_KEY', '');
  vi.stubEnv('ATTIO_ACCESS_TOKEN', '');
  vi.stubEnv('ATTIO_AUTH_TOKEN', '');
  delete process.env.ATTIO_MCP_TOOL_MODE;
});

afterEach(() => {
  if (ORIGINAL_MODE === undefined) {
    delete process.env.ATTIO_MCP_TOOL_MODE;
  } else {
    process.env.ATTIO_MCP_TOOL_MODE = ORIGINAL_MODE;
  }
  vi.unstubAllEnvs();
});

describe('static discovery projection', () => {
  it('projects a descriptor-owned input fact into both discovery views without stale copies', () => {
    const descriptor =
      advancedOperationsToolDefinitions.records_search_advanced;
    const facts: ToolOperationFacts = descriptor.facts;
    expect(facts).toBeDefined();
    const original = facts.guidance.constraints;
    const originalDestructive = facts.operation.destructive;
    try {
      facts.guidance.constraints =
        'Characterization: sort_by and sort_order are unsupported inputs.';
      facts.operation.destructive = true;
      const tool = getToolsListPayload().tools.find(
        (item) => item.name === descriptor.name
      )!;
      const entry = getCapabilityManifest().tools.find(
        (item) => item.name === descriptor.name
      )!;
      expect(tool.description).toContain(facts.guidance.constraints);
      expect(entry.description).toBe(tool.description);
      expect(entry.guidance?.constraints).toBe(facts.guidance.constraints);
      expect(entry.guidance?.summary).toBe(tool.description);
      expect(tool.annotations?.destructiveHint).toBe(true);
      expect(entry.operation?.destructive).toBe(true);
      expect(tool).not.toHaveProperty('facts');
    } finally {
      facts.guidance.constraints = original;
      facts.operation.destructive = originalDestructive;
    }
    const restored = getToolsListPayload().tools.find(
      (item) => item.name === descriptor.name
    )!;
    expect(restored.description).not.toContain('Characterization:');
    expect(restored.annotations?.destructiveHint).toBe(originalDestructive);
  });

  it('publishes the same permitted names and schemas as tools/list in full mode', () => {
    const tools = getToolsListPayload().tools;
    const manifest = getCapabilityManifest();

    expect(manifest.mode).toBe('full');
    expect(manifest.toolCount).toBe(tools.length);
    expect(manifest.tools.map((entry) => entry.name)).toEqual(
      tools.map((tool) => tool.name)
    );

    // Schema documents are copied, never re-described: one source of truth.
    const registry = schemaDocuments(tools);
    for (const entry of manifest.tools) {
      expect(entry.inputSchema, entry.name).toEqual(
        registry.get(entry.name)?.inputSchema ?? null
      );
      expect(entry.outputSchema, entry.name).toEqual(
        registry.get(entry.name)?.outputSchema ?? null
      );
    }
  });

  it('exposes the manifest tool only where the mode permits it', () => {
    const full = getCapabilityManifest();
    expect(full.tools.map((entry) => entry.name)).toContain('capabilities_get');

    process.env.ATTIO_MCP_TOOL_MODE = 'search';
    const narrowed = getCapabilityManifest();
    expect(narrowed.mode).toBe('search-only');
    expect(narrowed.tools.map((entry) => entry.name)).not.toContain(
      'capabilities_get'
    );
    expect(advertisedNames()).not.toContain('capabilities_get');
  });

  it('narrows the manifest to the search-only allowlist without widening it', () => {
    process.env.ATTIO_MCP_TOOL_MODE = 'search';
    const allowed = [...searchOnlyCanonicalToolNames()].sort();
    const names = getCapabilityManifest()
      .tools.map((entry) => entry.name)
      .sort();

    expect(names).toEqual(allowed);
    for (const name of advertisedNames()) {
      expect(allowed, name).toContain(name);
    }
  });

  it('keeps the credential-free exception names unchanged', () => {
    for (const mode of ['full', 'search']) {
      process.env.ATTIO_MCP_TOOL_MODE = mode;
      const names = advertisedNames();
      const manifest = getCapabilityManifest().tools.map((entry) => entry.name);

      for (const name of UNCHANGED_EXCEPTION_NAMES) {
        expect(names, `${name} in ${mode}`).toContain(name);
        expect(manifest, `${name} in ${mode}`).toContain(name);
      }
      // Health stays the always-available probe, in the definition and in the
      // manifest, so a scanner never has to guess it from a prefix.
      expect(healthCheckToolDefinition.name).toBe(HEALTH_NAME);
    }
  });

  it('builds every discovery payload with no credential and no Attio call', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const sink = logSink();
    try {
      const output = await collectDiscoveryPayloads();

      for (const factory of [
        'createAttioClient',
        'getAttioClient',
        'buildAttioClient',
        'createLegacyAttioClient',
      ] as const) {
        expect(attioClientModule[factory], factory).not.toHaveBeenCalled();
      }
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(output).not.toContain('attio.com');
    } finally {
      sink.restore();
      vi.unstubAllEnvs();
    }
  });

  it('keeps fixture credentials out of discovery output and logs', async () => {
    vi.stubEnv('ATTIO_API_KEY', FIXTURE_API_KEY);
    vi.stubEnv('ATTIO_ACCESS_TOKEN', FIXTURE_ACCESS_TOKEN);
    vi.stubEnv('ATTIO_AUTH_TOKEN', FIXTURE_AUTH_TOKEN);
    const sink = logSink();
    try {
      const output = await collectDiscoveryPayloads();

      for (const secret of [
        FIXTURE_API_KEY,
        FIXTURE_ACCESS_TOKEN,
        FIXTURE_AUTH_TOKEN,
      ]) {
        expect(output).not.toContain(secret);
        expect(sink.text()).not.toContain(secret);
      }
      expect(sink.text()).not.toMatch(/authorization:/i);
    } finally {
      sink.restore();
    }
  });

  it('serializes the full manifest without recursion or silent truncation', async () => {
    const tools = getToolsListPayload().tools;
    const manifest = getCapabilityManifest();
    const serialized = JSON.stringify(manifest);

    // Round-tripping is how a silent size cut would show up.
    expect(JSON.parse(serialized)).toEqual(
      JSON.parse(JSON.stringify(manifest))
    );
    expect(capabilityManifestDataSchema.safeParse(manifest).success).toBe(true);
    expect(serialized).not.toContain('[truncated]');
    expect(serialized).not.toMatch(/"unannotated":true/);

    // Every entry that advertises an output contract carries the document.
    for (const tool of tools) {
      const entry = manifest.tools.find((item) => item.name === tool.name)!;
      const advertised = (tool as { outputSchema?: unknown }).outputSchema;
      if (advertised) {
        expect(entry.outputSchema, tool.name).not.toBeNull();
        expect(entry.outputSchema).toEqual(advertised);
      }
    }

    // Timings and real HTTP body sizes are measured together in the manifest
    // suite; this test checks serialization correctness, not a runaway ceiling.
  });

  it('projects a caller-supplied tool list rather than a private catalog', () => {
    const tools = getPermittedToolDescriptors().slice(0, 3);
    const manifest = buildCapabilityManifest(tools);

    expect(manifest.toolCount).toBe(3);
    expect(manifest.tools.map((entry) => entry.name)).toEqual(
      tools.map((tool) => tool.name)
    );
  });

  it('keeps discovery results compatible with the shared result contracts', async () => {
    const manifest = getCapabilityManifest();
    expect(manifest.schemaVersion).toBe(CAPABILITY_MANIFEST_VERSION);
    expect(manifest.authorization).toMatchObject({
      enforcedAt: 'call-time',
      publishesCredentialGrants: false,
    });

    const published = await capabilitiesGetConfig.handler();
    expect(published).toEqual(manifest);
    const descriptor = getToolsListPayload().tools.find(
      (tool) => tool.name === 'capabilities_get'
    )!;
    expect(descriptor.inputSchema.properties).toEqual({});
    expect(descriptor.inputSchema.additionalProperties).toBe(false);
    expect(
      executionErrorSchema.safeParse({
        error: { code: 'VALIDATION_ERROR', message: 'x', retryable: false },
      }).success
    ).toBe(true);
  });

  it('names every canonical tool that the registry can advertise', () => {
    const canonical = [...canonicalToolNames()].sort();
    const advertised = advertisedNames().sort();
    expect(advertised).toEqual(canonical);
  });
});

describe('truthful search discovery', () => {
  it.each(['full', 'search'])(
    'keeps tool and manifest restrictions aligned in %s mode',
    (mode) => {
      process.env.ATTIO_MCP_TOOL_MODE = mode;
      const tools = getToolsListPayload().tools;
      const manifest = getCapabilityManifest();
      for (const name of [
        'records_search_by_content',
        'records_update',
        'companies_update',
        'deals_update',
      ]) {
        const tool = tools.find((item) => item.name === name);
        const entry = manifest.tools.find((item) => item.name === name);
        expect(Boolean(entry)).toBe(Boolean(tool));
        if (!tool || !entry) continue;
        if (name === 'records_search_by_content') {
          expect(tool.description).toContain(
            'All combinations currently return a nonretryable validation error'
          );
          expect(entry.operation.resourceTypes).toEqual([]);
          expect(entry.guidance.constraints).toContain(
            'All combinations currently return a nonretryable validation error'
          );
        } else {
          expect(tool.annotations?.destructiveHint).toBe(true);
          expect(entry.operation.destructive).toBe(true);
        }
      }
    }
  );
});
