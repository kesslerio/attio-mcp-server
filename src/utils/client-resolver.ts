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
    throw new Error(`${source} returned invalid Axios client instance`);
  }
}

/**
 * Resolves an Attio client instance using the unified interface.
 * Prioritises createAttioClient(config) → createAttioClient(apiKey) → getAttioClient() → buildAttioClient().
 */
export function resolveAttioClient(): AxiosInstance {
  const mod = AttioClientModule as AttioClientFactories;
  const contextApiKey = getContextApiKey();
  const envApiKey = process.env.ATTIO_API_KEY;
  const resolvedApiKey = envApiKey || contextApiKey;

  // Debug logging for Issue #891: Track API key resolution
  if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
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

  // Try unified createAttioClient with config (new interface)
  if (typeof mod.createAttioClient === 'function') {
    try {
      // If we have an API key, prefer the legacy string signature for backward compatibility
      if (resolvedApiKey) {
        if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
          console.error(
            '[client-resolver:resolve] Creating client with API key'
          );
        }
        const client = (
          mod.createAttioClient as (apiKey: string) => AxiosInstance
        )(resolvedApiKey);
        assertAxiosInstance(client, 'createAttioClient(apiKey)');
        return client;
      } else {
        if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
          console.error(
            '[client-resolver:resolve] Creating client without API key (will fail on first request)'
          );
        }
        // Use config object (new unified interface)
        const config: ClientConfig = {};
        const client = (
          mod.createAttioClient as (config: ClientConfig) => AxiosInstance
        )(config);
        assertAxiosInstance(client, 'createAttioClient(config)');
        return client;
      }
    } catch (error) {
      if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
        console.error(
          '[client-resolver:resolve] createAttioClient failed:',
          error
        );
      }
      // Continue to fallback methods
    }
  }

  // Fallback to getAttioClient if createAttioClient fails
  if (typeof mod.getAttioClient === 'function') {
    const client = mod.getAttioClient();
    assertAxiosInstance(client, 'getAttioClient()');
    return client;
  }

  // Last resort: buildAttioClient
  if (typeof mod.buildAttioClient === 'function') {
    if (!resolvedApiKey) {
      throw new Error(
        'Attio API key is required for client initialization. Please set ATTIO_API_KEY environment variable.'
      );
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
