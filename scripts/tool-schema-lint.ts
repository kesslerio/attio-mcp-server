#!/usr/bin/env node

/**
 * Tool catalog lint (U7).
 *
 * Two jobs:
 * 1. Per-descriptor shape: name, description, and input-schema rules.
 * 2. Catalog consistency: the registry, the published annotations, and the
 *    authored capability manifest must describe one surface, so nobody has to
 *    keep a second catalog in prose or in code.
 */
import process from 'node:process';
import { TOOL_DEFINITIONS } from '@/handlers/tools/registry.js';
import { findAdvertisedNameViolations } from '@/constants/tool-names.js';
import {
  CAPABILITY_CATALOG,
  CAPABILITY_MANIFEST_VERSION,
  buildCapabilityManifest,
} from '@/handlers/tool-configs/universal/capabilities.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

interface Violation {
  tool: string;
  code: string;
  message: string;
  severity: 'error' | 'warn';
}

type ToolGroups = Record<string, unknown>;

function flattenTools(groups: ToolGroups): Tool[] {
  const tools: Tool[] = [];

  for (const group of Object.values(groups)) {
    if (!group) continue;

    if (Array.isArray(group)) {
      tools.push(...(group as Tool[]));
      continue;
    }

    if (typeof group === 'object') {
      tools.push(...Object.values(group as Record<string, Tool>));
    }
  }

  return tools;
}

function validateTool(tool: Tool): Violation[] {
  const violations: Violation[] = [];

  if (!tool || typeof tool !== 'object') {
    violations.push({
      tool: '(unknown)',
      code: 'tool.invalid_object',
      message: 'Tool definition is not an object',
      severity: 'error',
    });
    return violations;
  }

  if (!tool.name || typeof tool.name !== 'string') {
    violations.push({
      tool: tool.name ?? '(unknown)',
      code: 'tool.name_missing',
      message: 'Tool missing name',
      severity: 'error',
    });
  }

  if (!tool.description || typeof tool.description !== 'string') {
    violations.push({
      tool: tool.name ?? '(unknown)',
      code: 'tool.description_missing',
      message: 'Description must be a non-empty string',
      severity: 'error',
    });
  } else {
    const trimmed = tool.description.trim();
    if (trimmed.length === 0) {
      violations.push({
        tool: tool.name ?? '(unknown)',
        code: 'tool.description_empty',
        message: 'Description cannot be blank',
        severity: 'error',
      });
    }
    // Issue #776 requires: purpose + boundaries + constraints + recovery hints
    // This yields ~40-60 words (200-300 chars) for comprehensive descriptions
    // Industry research shows enterprise tools average 500-1000 tokens, so 300 chars is reasonable
    if (trimmed.length > 300) {
      violations.push({
        tool: tool.name ?? '(unknown)',
        code: 'tool.description_length',
        message: `Description too long (${trimmed.length} chars, limit 300)`,
        severity: 'error',
      });
    }
    if (!trimmed.includes('Does not:')) {
      violations.push({
        tool: tool.name ?? '(unknown)',
        code: 'tool.description_boundaries',
        message:
          'Description should document boundaries via "Does not:" segment',
        severity: 'warn',
      });
    }
  }

  const schema = (tool as Record<string, unknown>).inputSchema as
    | Record<string, unknown>
    | undefined;
  if (!schema) {
    violations.push({
      tool: tool.name ?? '(unknown)',
      code: 'schema.missing',
      message: 'Input schema is required',
      severity: 'error',
    });
    return violations;
  }

  if (schema.type !== 'object') {
    violations.push({
      tool: tool.name ?? '(unknown)',
      code: 'schema.type',
      message: 'Input schema type must be "object"',
      severity: 'error',
    });
  }

  if (!Object.prototype.hasOwnProperty.call(schema, 'additionalProperties')) {
    violations.push({
      tool: tool.name ?? '(unknown)',
      code: 'schema.additionalProperties',
      message: 'Input schema must declare additionalProperties',
      severity: 'error',
    });
  }

  const properties = schema.properties as Record<string, unknown> | undefined;
  if (!properties || Object.keys(properties).length === 0) {
    violations.push({
      tool: tool.name ?? '(unknown)',
      code: 'schema.properties',
      message: 'Tools should expose at least one schema property',
      severity: 'warn',
    });
  }

  if (!Object.prototype.hasOwnProperty.call(schema, 'examples')) {
    violations.push({
      tool: tool.name ?? '(unknown)',
      code: 'schema.examples',
      message: 'Schema should include usage examples',
      severity: 'warn',
    });
  }

  return violations;
}

/**
 * Registry / annotation / manifest agreement (KTD8).
 *
 * The manifest is a projection, so a divergence means someone wrote the fact
 * down twice. Each rule below names the fact and where the two copies drifted.
 */
function validateCapabilityConsistency(tools: Tool[]): Violation[] {
  const violations: Violation[] = [];
  const registered = new Set(tools.map((tool) => tool.name));

  for (const tool of tools) {
    if (!tool.name) continue;
    const entry = (
      CAPABILITY_CATALOG as Record<
        string,
        (typeof CAPABILITY_CATALOG)[string] | undefined
      >
    )[tool.name];

    if (!entry) {
      violations.push({
        tool: tool.name,
        code: 'capability.missing',
        message:
          'Registered tool has no authored operation metadata; discovery would have to guess its capability',
        severity: 'error',
      });
      continue;
    }

    const { operation } = entry;
    const annotations = (tool as { annotations?: Record<string, unknown> })
      .annotations;
    const pairs: Array<[keyof typeof annotations | string, unknown, unknown]> =
      [
        ['readOnlyHint', annotations?.readOnlyHint, operation.readOnly],
        [
          'destructiveHint',
          annotations?.destructiveHint,
          operation.destructive,
        ],
        ['idempotentHint', annotations?.idempotentHint, operation.idempotent],
      ];
    for (const [key, declared, published] of pairs) {
      if (declared !== undefined && declared !== published) {
        violations.push({
          tool: tool.name,
          code: 'capability.annotation_mismatch',
          message: `Descriptor annotation ${String(key)}=${String(
            declared
          )} disagrees with manifest operation metadata ${String(published)}`,
          severity: 'error',
        });
      }
    }

    if (
      !entry.guidance.capability.trim() ||
      !entry.guidance.boundaries.trim()
    ) {
      violations.push({
        tool: tool.name,
        code: 'capability.guidance_incomplete',
        message:
          'Capability guidance needs at least a capability and a boundaries statement',
        severity: 'error',
      });
    }

    for (const alternative of entry.guidance.alternatives ?? []) {
      // Pointers must exist now, not in a remembered catalog.
      const known =
        registered.has(alternative) ||
        Object.prototype.hasOwnProperty.call(CAPABILITY_CATALOG, alternative) ||
        alternative === 'tools/list';
      if (!known) {
        violations.push({
          tool: tool.name,
          code: 'capability.alternative_unknown',
          message: `Guidance names ${alternative}, which is not in the current catalog`,
          severity: 'error',
        });
      }
    }
  }

  // An entry that no longer has a descriptor is a second catalog's leftover.
  for (const name of Object.keys(CAPABILITY_CATALOG)) {
    if (!registered.has(name)) {
      violations.push({
        tool: name,
        code: 'capability.orphan',
        message:
          'Capability entry exists for a tool the registry does not advertise',
        severity: 'error',
      });
    }
  }

  // The projection must be buildable and must not silently drop tools.
  const manifest = buildCapabilityManifest(tools);
  if (manifest.schemaVersion !== CAPABILITY_MANIFEST_VERSION) {
    violations.push({
      tool: '(manifest)',
      code: 'capability.version',
      message: `Manifest version ${manifest.schemaVersion} does not match the published constant`,
      severity: 'error',
    });
  }
  if (manifest.tools.length !== tools.length) {
    violations.push({
      tool: '(manifest)',
      code: 'capability.incomplete',
      message: `Manifest covers ${manifest.tools.length} of ${tools.length} registered tools`,
      severity: 'error',
    });
  }
  if (manifest.tools.some((entry) => entry.unannotated)) {
    violations.push({
      tool: '(manifest)',
      code: 'capability.unannotated',
      message:
        'Manifest contains an unannotated tool, which means discovery fell back to guessing',
      severity: 'error',
    });
  }

  return violations;
}

function isStrict(): boolean {
  const mode = process.env.MCP_TOOL_LINT_MODE;
  if (!mode) return false;
  return mode.toLowerCase() === 'strict';
}

function main(): void {
  const tools = flattenTools(TOOL_DEFINITIONS as ToolGroups);
  const violations = tools
    .map(validateTool)
    .flat()
    .filter((v) => Boolean(v));
  violations.push(
    ...findAdvertisedNameViolations(tools).map((violation) => ({
      ...violation,
      severity: 'error' as const,
    })),
    ...validateCapabilityConsistency(tools)
  );

  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warn');

  if (violations.length === 0) {
    console.log('✅ Tool schema lint passed: no issues found.');
    return;
  }

  if (errors.length > 0) {
    console.error('❌ Tool schema lint failed with errors:');
    for (const violation of errors) {
      console.error(
        `  [${violation.code}] ${violation.tool}: ${violation.message}`
      );
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Tool schema lint warnings:');
    for (const violation of warnings) {
      console.warn(
        `  [${violation.code}] ${violation.tool}: ${violation.message}`
      );
    }
  }

  if (errors.length > 0 && isStrict()) {
    process.exitCode = 1;
  } else if (errors.length > 0) {
    console.warn(
      'Tool schema lint encountered errors but running in warning mode. Set MCP_TOOL_LINT_MODE=strict to fail.'
    );
  }
}

main();
