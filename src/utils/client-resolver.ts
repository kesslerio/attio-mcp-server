/**
 * Type-safe client resolver for Attio API client factory methods
 * Provides reliable fallbacks and rich diagnostics when resolution fails.
 */

import { AxiosInstance } from 'axios';
import * as AttioClientModule from '../api/attio-client.js';
import { getContextApiKey } from '../api/client-context.js';

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
 * Collects available method names on the mocked or real module so error
 * messages can help the caller understand why resolution failed.
 */
function getAvailableMethodNames(mod: AttioClientFactories): string[] {
  return Object.keys(mod).filter((key) => typeof mod[key] === 'function');
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
 * Resolves an Attio client instance using the available factory methods.
 * Prioritises getAttioClient() → createAttioClient() → buildAttioClient().
 */
export function resolveAttioClient(): AxiosInstance {
  const mod = AttioClientModule as AttioClientFactories;
  const resolvedApiKey = process.env.ATTIO_API_KEY || getContextApiKey();

  if (typeof mod.getAttioClient === 'function') {
    const client = mod.getAttioClient();
    assertAxiosInstance(client, 'getAttioClient()');
    return client;
  }

  if (typeof mod.createAttioClient === 'function') {
    if (!resolvedApiKey) {
      throw new Error(
        'No available Attio client factory method found. Available methods: createAttioClient. Has API key: false'
      );
    }
    const client = mod.createAttioClient(resolvedApiKey);
    assertAxiosInstance(client, 'createAttioClient()');
    return client;
  }

  if (typeof mod.buildAttioClient === 'function') {
    if (!resolvedApiKey) {
      throw new Error(
        'No available Attio client factory method found. Available methods: buildAttioClient. Has API key: false'
      );
    }
    const client = mod.buildAttioClient({ apiKey: resolvedApiKey });
    assertAxiosInstance(client, 'buildAttioClient()');
    return client;
  }

  const availableMethods = getAvailableMethodNames(mod);
  throw new Error(
    `No available Attio client factory method found. Available methods: ${
      availableMethods.length > 0 ? availableMethods.join(', ') : 'none'
    }. Has API key: ${Boolean(resolvedApiKey)}`
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
