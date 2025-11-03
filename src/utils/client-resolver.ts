/**
 * Type-safe client resolver for Attio API client factory methods
 * Updated to use unified createAttioClient interface with backward compatibility
 */

import { AxiosInstance } from 'axios';
import * as AttioClientModule from '../api/attio-client.js';
import { getContextApiKey } from '../api/client-context.js';
import { ClientConfig } from '../api/client-config.js';

/**
 * Supported factory method signatures exposed by attio-client module
 */
interface AttioClientFactories {
  getAttioClient?(): AxiosInstance | unknown;
  createAttioClient?(apiKey: string): AxiosInstance | unknown;
  buildAttioClient?(config: { apiKey: string }): AxiosInstance | unknown;
  [key: string]: unknown;
}

/**
 * Guards that the resolved value behaves like an Axios instance. We keep the
 * checks intentionally simple so tests can provide lightweight mocks.
 */
function assertAxiosInstance(
  value: unknown,
  source: string
): asserts value is AxiosInstance {
  const candidate = value as Record<string, unknown> | null | undefined;

  const hasGetMethod =
    !!candidate &&
    typeof candidate === 'object' &&
    typeof candidate.get === 'function';

  const hasDefaults =
    hasGetMethod &&
    'defaults' in candidate &&
    typeof candidate.defaults === 'object';

  if (!hasGetMethod || !hasDefaults) {
    // Enhanced diagnostic information
    const diagnostics = {
      valueType: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      isObject: typeof value === 'object' && value !== null,
      hasGetMethod,
      hasDefaults,
      hasDefaultsProperty:
        candidate && typeof candidate === 'object' && 'defaults' in candidate,
      defaultsType:
        candidate && typeof candidate === 'object' && 'defaults' in candidate
          ? typeof candidate.defaults
          : 'N/A',
      availableProperties:
        candidate && typeof candidate === 'object'
          ? Object.keys(candidate).slice(0, 10)
          : [],
    };

    if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
      console.error(
        `[client-resolver:assertAxiosInstance] Validation failed for ${source}:`,
        diagnostics
      );
    }

    throw new Error(
      `${source} returned invalid Axios client instance (hasGetMethod=${hasGetMethod}, hasDefaults=${hasDefaults})`
    );
  }
}

/**
 * Resolves an Attio client instance using the unified interface.
 * Uses getAttioClient() which handles caching, environment detection, and strategy pattern.
 *
 * This simplification fixes Issue #904 client initialization validation failures by using
 * the proven getAttioClient() code path instead of attempting multiple factory methods.
 */
export function resolveAttioClient(): AxiosInstance {
  const mod = AttioClientModule as AttioClientFactories;

  // Debug logging for API key resolution (informational only)
  if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
    const contextApiKey = getContextApiKey();
    const envApiKey = process.env.ATTIO_API_KEY;
    const resolvedApiKey = envApiKey || contextApiKey;

    console.error('[client-resolver:resolve] API key resolution:', {
      hasEnvApiKey: Boolean(envApiKey),
      envKeyLength: envApiKey?.length || 0,
      hasContextApiKey: Boolean(contextApiKey),
      contextKeyLength: contextApiKey?.length || 0,
      resolved: Boolean(resolvedApiKey),
      resolvedKeyLength: resolvedApiKey?.length || 0,
      source:
        resolvedApiKey === envApiKey
          ? 'env'
          : resolvedApiKey === contextApiKey
            ? 'context'
            : 'none',
      timestamp: new Date().toISOString(),
    });
  }

  // Use getAttioClient() - it handles all the complexity:
  // - Caching (ClientCache and legacy apiInstance)
  // - Environment detection (E2E, test, production modes)
  // - Strategy pattern (ProductionClientStrategy, E2EClientStrategy, etc.)
  // - API key resolution (env, context, config)
  // This is the proven code path used throughout the codebase
  if (typeof mod.getAttioClient === 'function') {
    if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
      console.error('[client-resolver:resolve] Using getAttioClient()');
    }
    const client = mod.getAttioClient();
    assertAxiosInstance(client, 'getAttioClient()');
    return client;
  }

  // Fallback to createAttioClient with config object
  if (typeof mod.createAttioClient === 'function') {
    if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
      console.error(
        '[client-resolver:resolve] Fallback to createAttioClient(config)'
      );
    }
    try {
      const config: ClientConfig = {};
      const client = (
        mod.createAttioClient as (config: ClientConfig) => AxiosInstance
      )(config);
      assertAxiosInstance(client, 'createAttioClient(config)');
      return client;
    } catch (error) {
      if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
        console.error(
          '[client-resolver:resolve] createAttioClient failed:',
          error
        );
      }
      // Continue to last resort
    }
  }

  // Last resort: buildAttioClient
  if (typeof mod.buildAttioClient === 'function') {
    const contextApiKey = getContextApiKey();
    const envApiKey = process.env.ATTIO_API_KEY;
    const resolvedApiKey = envApiKey || contextApiKey;

    if (!resolvedApiKey) {
      throw new Error(
        'Attio API key is required for client initialization. Please set ATTIO_API_KEY environment variable.'
      );
    }

    if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
      console.error('[client-resolver:resolve] Last resort: buildAttioClient');
    }
    const client = mod.buildAttioClient({ apiKey: resolvedApiKey });
    assertAxiosInstance(client, 'buildAttioClient()');
    return client;
  }

  throw new Error(
    'Failed to initialize Attio client. Please check your API configuration and ensure the client module is properly installed.'
  );
}

/**
 * Checks whether an arbitrary value looks like an Attio Axios client.
 */
export function isAttioClient(client: unknown): client is AxiosInstance {
  try {
    assertAxiosInstance(client, 'isAttioClient check');
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves and validates the client, guaranteeing callers receive a proper
 * Axios instance or a descriptive error.
 */
export function getValidatedAttioClient(): AxiosInstance {
  const client = resolveAttioClient();
  assertAxiosInstance(client, 'getValidatedAttioClient()');
  return client;
}
