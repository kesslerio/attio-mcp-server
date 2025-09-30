#!/usr/bin/env node

import process from 'node:process';
import { TOOL_DEFINITIONS } from '@/handlers/tools/registry.js';
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
