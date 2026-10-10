/**
 * Universal MCP tool configurations - Main module
 *
 * This module implements the universal tool consolidation strategy from Issue #352
 * to reduce tool count from 70 to ~30 tools while maintaining full functionality.
 *
 * Universal tools use parameter-based routing with resource_type discrimination
 * to provide consolidated operations across companies, people, records, and tasks.
 */

import {
  coreOperationsToolConfigs,
  coreOperationsToolDefinitions,
} from './core/index.js';

import {
  advancedOperationsToolConfigs,
  advancedOperationsToolDefinitions,
} from './operations/index.js';

import {
  batchSearchConfig,
  batchSearchToolDefinition,
} from './batch-search.js';
import { openAiToolConfigs, openAiToolDefinitions } from '../openai/index.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import {
  healthDataSchema,
  healthResultContract,
} from '@/handlers/tools/result-schemas.js';
import {
  smitheryDiagnosticsToolDefinition,
  smitheryDiagnosticsConfig,
} from './smithery-diagnostics.js';
import {
  capabilitiesGetToolDefinition,
  capabilitiesGetConfig,
  healthCapabilityProjection,
  readCapabilityManifest,
} from './capabilities.js';

/**
 * Simple no-auth health-check tool to support unauthenticated capability scanning
 * This tool intentionally performs no Attio API calls and always succeeds.
 */
export const healthCheckToolDefinition = {
  name: 'aaa-health-check',
  description: formatToolDescription({
    capability:
      'Run a lightweight health probe that echoes deployment metadata.',
    boundaries: 'query Attio APIs, mutate data, or require credentials.',
    constraints:
      'Accepts optional echo text; returns JSON payload as text for MCP clients.',
    recoveryHint:
      'If unavailable, review Smithery sandbox logs or restart the server process.',
  }),
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: true,
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};

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
export * from './types.js';
export * from './schemas.js';
export * from './shared-handlers.js';

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
