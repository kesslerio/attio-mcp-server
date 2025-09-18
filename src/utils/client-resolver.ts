/**
 * Type-safe client resolver for Attio API client factory methods
 * Handles multiple factory patterns without relying on any types
 */

import * as AttioClientModule from '../api/attio-client.js';

/**
 * Supported client factory method signatures
 */
interface AttioClientFactories {
  getAttioClient?(): unknown;
  createAttioClient?(apiKey: string): unknown;
  buildAttioClient?(config: { apiKey: string }): unknown;
}

/**
 * Type guard to check if a module has a specific factory method
 */
function hasFactoryMethod<K extends keyof AttioClientFactories>(
  mod: unknown,
  method: K
): mod is Record<K, NonNullable<AttioClientFactories[K]>> {
  return (
    typeof mod === 'object' &&
    mod !== null &&
    method in mod &&
    typeof (mod as Record<string, unknown>)[method] === 'function'
  );
}

/**
 * Resolves an Attio client instance using available factory methods
 * Prioritizes: getAttioClient() > createAttioClient() > buildAttioClient()
 */
export function resolveAttioClient(): unknown {
  const mod = AttioClientModule as unknown;

  // Try getAttioClient() first (no parameters needed)
  if (hasFactoryMethod(mod, 'getAttioClient')) {
    return mod.getAttioClient();
  }

  // Try createAttioClient(apiKey) if API key is available
  if (hasFactoryMethod(mod, 'createAttioClient') && process.env.ATTIO_API_KEY) {
    return mod.createAttioClient(process.env.ATTIO_API_KEY);
  }

  // Try buildAttioClient({apiKey}) if API key is available
  if (hasFactoryMethod(mod, 'buildAttioClient') && process.env.ATTIO_API_KEY) {
    return mod.buildAttioClient({ apiKey: process.env.ATTIO_API_KEY });
  }

  throw new Error('No available Attio client factory method found');
}

/**
 * Type guard to check if resolved client has the expected API methods
 */
export function isAttioClient(
  client: unknown
): client is { get(path: string): Promise<unknown> } {
  return (
    typeof client === 'object' &&
    client !== null &&
    'get' in client &&
    typeof (client as Record<string, unknown>).get === 'function'
  );
}

/**
 * Safely resolves and validates an Attio client instance
 */
export function getValidatedAttioClient(): {
  get(path: string): Promise<unknown>;
} {
  const client = resolveAttioClient();

  if (!isAttioClient(client)) {
    throw new Error('Resolved client does not have expected API interface');
  }

  return client;
}
