/**
 * Type-safe client resolver for Attio API client factory methods
 * Updated to use unified createAttioClient interface with backward compatibility
 */

import { AxiosInstance } from 'axios';
import * as AttioClientModule from '../api/attio-client.js';
import { getContextApiKey } from '../api/client-context.js';
import { ClientConfig } from '../api/client-config.js';
import { createScopedLogger } from './logger.js';

const logger = createScopedLogger('client-resolver');

/**
 * Supported factory method signatures exposed by attio-client module
 */
interface AttioClientFactories {
  getAttioClient?(): AxiosInstance | unknown;
  createAttioClient?(config: ClientConfig): AxiosInstance | unknown;
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

    logger.debug(`Validation failed for ${source}`, diagnostics);

    throw new Error(
      `${source} returned invalid Axios client instance (hasGetMethod=${hasGetMethod}, hasDefaults=${hasDefaults})`
    );
  }
}

function resolveApiKey(): string | undefined {
  return (
    process.env.ATTIO_API_KEY ||
    process.env.ATTIO_ACCESS_TOKEN ||
    getContextApiKey()
  );
}

/**
 * Resolves an Attio client instance using the unified interface.
 *
 * Security note: this resolver must always honor the current request context key.
 * Therefore it creates a fresh client with an explicitly resolved API key and
 * bypasses process-global caches that may hold another tenant's credentials.
 */
export function resolveAttioClient(): AxiosInstance {
  const mod = AttioClientModule as AttioClientFactories;

  // Debug logging for API key resolution (informational only)
  if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
    logger.debug('Credential resolution attempted');
  }

  const resolvedApiKey = resolveApiKey();

  // Prefer unified factory with explicit credentials and cache bypass
  if (typeof mod.createAttioClient === 'function') {
    logger.debug(
      'Using createAttioClient() with explicit apiKey and bypassCache'
    );
    let client: AxiosInstance | unknown;
    try {
      const config: ClientConfig = {
        apiKey: resolvedApiKey,
        bypassCache: true,
      };
      client = mod.createAttioClient(config);
    } catch (_error) {
      logger.debug('createAttioClient failed');
      // Continue to last resort
      client = undefined;
    }

    if (client !== undefined) {
      assertAxiosInstance(client, 'createAttioClient(config)');
      return client;
    }
  }

  // Last resort: buildAttioClient
  if (typeof mod.buildAttioClient === 'function') {
    if (!resolvedApiKey) {
      throw new Error(
        'Attio API key is required for client initialization. Please set ATTIO_API_KEY environment variable.'
      );
    }

    logger.debug('Last resort: buildAttioClient');
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
