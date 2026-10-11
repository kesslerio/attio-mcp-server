/**
 * Universal MCP tool configurations - Main module
 *
 * This module implements the universal tool consolidation strategy from Issue #352
 * to reduce tool count from 70 to ~30 tools while maintaining full functionality.
 *
 * Universal tools use parameter-based routing with resource_type discrimination
 * to provide consolidated operations across companies, people, records, and tasks.
 */
import { defineOperationTool } from '@/handlers/tools/operation-descriptor.js';

import {
  coreOperationsToolConfigs,
  coreOperationsToolDefinitions,
} from '@/handlers/tool-configs/universal/core/index.js';

import {
  advancedOperationsToolConfigs,
  advancedOperationsToolDefinitions,
} from '@/handlers/tool-configs/universal/operations/index.js';

import {
  batchSearchConfig,
  batchSearchToolDefinition,
} from '@/handlers/tool-configs/universal/batch-search.js';
import {
  openAiToolConfigs,
  openAiToolDefinitions,
} from '@/handlers/tool-configs/openai/index.js';
import {
  healthDataSchema,
  healthResultContract,
} from '@/handlers/tools/result-schemas.js';
import {
  smitheryDiagnosticsToolDefinition,
  smitheryDiagnosticsConfig,
} from '@/handlers/tool-configs/universal/smithery-diagnostics.js';
import {
  capabilitiesGetToolDefinition,
  capabilitiesGetConfig,
  healthCapabilityProjection,
  readCapabilityManifest,
} from '@/handlers/tool-configs/universal/capabilities.js';

/**
 * Simple no-auth health-check tool to support unauthenticated capability scanning
 * This tool intentionally performs no Attio API calls and always succeeds.
 */
export const healthCheckToolDefinition = defineOperationTool({
  name: 'aaa-health-check',
  facts: {
    operation: {
      pagination: { kind: 'none', supported: false, cap: null },
      action: 'diagnostic',
      resourceTypes: [],
      customObjectSlugs: false,
      authRequired: false,
      readOnly: true,
      destructive: false,
      idempotent: true,
    },
    guidance: {
      capability: 'Probe deployment liveness without touching Attio.',
      boundaries:
        'read workspace data, validate credentials, or report credential scopes.',
      constraints:
        'Always succeeds while the process is up; no credential is required.',
      recovery: 'If unavailable, restart the server or check sandbox logs.',
      alternatives: ['diagnostics_get'],
    },
  },
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: true,
  },
});

export const healthCheckConfig = {
  name: 'aaa-health-check',
  ...healthResultContract,
  structuredOutput: (payload: unknown): Record<string, unknown> => ({
    data: healthDataSchema.parse(payload),
  }),
  handler: async (params: { [key: string]: unknown }) => {
    const payload = {
      ok: true,
      name: 'attio-mcp',
      ...(typeof params?.echo === 'string' ? { echo: params.echo } : {}),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      needs_api_key: true,
      // Health is the discovery surface a search-only client can reach without
      // credentials, so it carries the same mode-filtered manifest the
      // discovery tool publishes, projected to its operation sections (KTD8).
      capabilities: healthCapabilityProjection(await readCapabilityManifest()),
    } as const;

    // The adapter owns the envelope; the handler returns the domain payload.
    return payload;
  },
  formatResult: (res: Record<string, unknown>): string => {
    const parts: string[] = ['✅ Server healthy'];
    if (res?.echo) parts.push(`echo: ${String(res.echo)}`);
    if (res?.environment) parts.push(`env: ${String(res.environment)}`);
    return parts.join(' | ');
  },
};

// Re-export individual tool config objects for testing
export {
  coreOperationsToolConfigs,
  coreOperationsToolDefinitions,
  advancedOperationsToolConfigs,
  advancedOperationsToolDefinitions,
};

// Re-export types for external use
export * from '@/handlers/tool-configs/universal/types.js';
export * from '@/handlers/tool-configs/universal/schemas.js';
export * from '@/handlers/tool-configs/universal/shared-handlers.js';

/**
 * All universal tool configurations
 * These expose the universal tool group plus focused scoped write tools.
 */
export const universalToolConfigs = {
  // Ensure health-check is listed first alphabetically for best-guess scanners
  'aaa-health-check': healthCheckConfig,
  diagnostics_get: smitheryDiagnosticsConfig,
  capabilities_get: capabilitiesGetConfig,
  ...coreOperationsToolConfigs,
  ...advancedOperationsToolConfigs,
  records_batch_search: batchSearchConfig,
  ...openAiToolConfigs,
};

/**
 * All universal tool definitions for MCP protocol
 */
export const universalToolDefinitions = {
  // Ensure health-check is listed first alphabetically for best-guess scanners
  'aaa-health-check': healthCheckToolDefinition,
  diagnostics_get: smitheryDiagnosticsToolDefinition,
  capabilities_get: capabilitiesGetToolDefinition,
  ...coreOperationsToolDefinitions,
  ...advancedOperationsToolDefinitions,
  records_batch_search: batchSearchToolDefinition,
  ...openAiToolDefinitions,
};

/**
 * Core universal operations (15 tools)
 * These consolidate the majority of CRUD and basic search operations
 */
export const coreUniversalTools = [
  'records_search',
  'records_get_details',
  'companies_create',
  'companies_update',
  'deals_create',
  'deals_update',
  'records_create',
  'records_update',
  'records_upsert',
  'records_delete',
  'records_get_attributes',
  'records_discover_attributes',
  'records_get_info',
  'records_get_interactions',
  'records_merge',
];

/**
 * Advanced universal operations (6 tools)
 * These provide sophisticated search and batch capabilities
 */
export const advancedUniversalTools = [
  'records_search_advanced',
  'records_search_by_relationship',
  'records_search_by_content',
  'records_search_by_timeframe',
  'records_batch',
  'records_batch_search',
];
