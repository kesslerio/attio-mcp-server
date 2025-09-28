/**
 * Attio API client and related utilities
 * Unified client factory with strategy pattern for different environments
 */
import axios, { AxiosInstance } from 'axios';
import { debug, error, OperationType } from '@/utils/logger.js';
import { getContextApiKey, validateApiKey } from './client-context.js';
import {
  AttioAttributeSchema,
  AttioSelectOption,
  AttioStatusOption,
} from './types.js';
import { configureStandardInterceptors } from './client-interceptors.js';
import {
  ClientConfig,
  ClientMode,
  EnvironmentModeHandler,
} from './client-config.js';
import { ClientStrategyFactory } from './client-strategies.js';
import { ClientCache } from './client-cache.js';

// Module identification for debugging (compatible with both ESM and CJS)
const MODULE_FILE = 'attio-client';

// Debug loading info - use logger instead of console.log to avoid JSON parsing issues
debug('attio-client', 'Module loaded', {
  file: `${MODULE_FILE}.js`,
  E2E_MODE: process.env.E2E_MODE,
  USE_MOCK_DATA: process.env.USE_MOCK_DATA,
});
export const __MODULE_PATH__ = MODULE_FILE;

export type AttioClient = AxiosInstance;

/**
 * Validates and throws standardized error for API key issues
 * @param apiKey - The API key to validate
 * @param source - Source of the API key for error context
 * @throws {Error} With standardized error message for invalid API keys
 */
function validateAndThrowForApiKey(
  apiKey: string | undefined | null,
  source: string = 'provided'
): asserts apiKey is string {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error(
      `Invalid API key: API key must be a non-empty string (source: ${source})`
    );
  }

  if (!validateApiKey(apiKey)) {
    throw new Error(
      `Invalid API key format: API key contains invalid characters or whitespace (source: ${source})`
    );
  }

  // Basic length validation - Attio API keys should be a reasonable length
  if (apiKey.length < 10) {
    throw new Error(
      `Invalid API key: API key appears to be too short (source: ${source})`
    );
  }
}

// LEGACY: Global API client instance - replaced by ClientCache
let apiInstance: AxiosInstance | null = null;

/**
 * BACKWARD COMPATIBILITY: Support old createAttioClient(apiKey) signature
 *
 * @param apiKey - The Attio API key (legacy signature)
 * @returns Configured Axios instance
 */
export function createAttioClient(apiKey: string): AxiosInstance;
/**
 * UNIFIED CLIENT FACTORY: Support new createAttioClient(config) signature
 *
 * @param config - Client configuration options
 * @returns Configured Axios instance
 */
export function createAttioClient(config?: ClientConfig): AxiosInstance;
/**
 * Implementation of overloaded createAttioClient function
 */
export function createAttioClient(
  configOrApiKey: ClientConfig | string = {}
): AxiosInstance {
  // Handle legacy string API key parameter
  if (typeof configOrApiKey === 'string') {
    debug(
      'attio-client',
      'createAttioClient (LEGACY string signature) - redirecting to unified version'
    );
    return createLegacyAttioClient(configOrApiKey);
  }

  // Handle new config object parameter - this is the main implementation we defined above
  const config = configOrApiKey as ClientConfig;

  // Get API key from config, environment, or context
  const apiKey =
    config.apiKey ?? process.env.ATTIO_API_KEY ?? getContextApiKey() ?? '';

  // Determine the source for better error messages
  const apiKeySource = config.apiKey
    ? 'config parameter'
    : process.env.ATTIO_API_KEY
      ? 'environment variable'
      : 'context configuration';

  // Validate API key using standardized validation
  validateAndThrowForApiKey(apiKey, apiKeySource);

  // Get environment-aware configuration
  const environmentConfig = EnvironmentModeHandler.getClientConfig({
    rawE2E: config.mode === ClientMode.E2E_RAW,
  });

  // Merge configurations: environment defaults < config parameter
  const finalConfig: ClientConfig = {
    ...environmentConfig,
    ...config,
    apiKey, // Always use the validated API key
    interceptors: {
      ...environmentConfig.interceptors,
      ...config.interceptors,
    },
  };

  debug('attio-client', 'Creating unified client', {
    mode: finalConfig.mode,
    hasApiKey: Boolean(apiKey),
    apiKeySource,
    bypassCache: finalConfig.bypassCache,
    baseURL: finalConfig.baseURL,
    timeout: finalConfig.timeout,
  });

  // Use strategy factory to create the appropriate client
  return ClientStrategyFactory.createClient(finalConfig);
}

/**
 * LEGACY: Centralized authenticated Attio client builder
 *
 * @deprecated Use createAttioClient() instead for unified interface
 * Guarantees proper Authorization header and fails fast if API key is missing
 */
export function buildAttioClient(opts?: {
  apiKey?: string;
  baseURL?: string;
  timeoutMs?: number;
}): AttioClient {
  // Convert legacy options to new config format
  const config: ClientConfig = {
    apiKey: opts?.apiKey,
    baseURL: opts?.baseURL,
    timeout: opts?.timeoutMs,
    mode: ClientMode.PRODUCTION, // buildAttioClient was used for production
  };

  debug(
    'attio-client',
    'buildAttioClient (LEGACY) - redirecting to unified createAttioClient',
    {
      hasApiKey: Boolean(opts?.apiKey),
      baseURL: opts?.baseURL,
      timeout: opts?.timeoutMs,
    }
  );

  // Use the new unified client factory
  return createAttioClient(config);
}

// Legacy getAttioClient exists below - it's already implemented

/**
 * LEGACY: Creates and configures an Axios instance for the Attio API
 *
 * @deprecated Use createAttioClient(config) instead for unified interface
 * @param apiKey - The Attio API key
 * @returns Configured Axios instance
 */
export function createLegacyAttioClient(apiKey: string): AxiosInstance {
  // Use standardized validation
  validateAndThrowForApiKey(apiKey, 'parameter');

  // Log client initialization for debugging (without exposing sensitive data)
  debug(
    MODULE_FILE,
    'Initializing Attio client with provided API key',
    { hasApiKey: Boolean(apiKey) },
    'createAttioClient',
    OperationType.API_CALL
  );

  const baseURL = (
    process.env.ATTIO_BASE_URL || 'https://api.attio.com/v2'
  ).replace(/\/+$/, '');

  // Log which client path is being used
  debug('attio-client', 'Client baseURL configured', { baseURL });

  const client = axios.create({
    baseURL,
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    // do NOT transform the response; we want raw server JSON
    transformResponse: [
      (data) => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      },
    ],
    validateStatus: (s) => s >= 200 && s < 300, // don't swallow 4xx/5xx
  });

  // Configure interceptors using the centralized module
  const isE2EMode = process.env.E2E_MODE === 'true';
  const interceptorPrefix = isE2EMode ? 'E2E' : '';

  debug('attio-client', 'Configuring client interceptors', {
    baseURL,
    isE2EMode,
    prefix: interceptorPrefix,
  });

  configureStandardInterceptors(client, {
    prefix: interceptorPrefix,
    enableDiagnostics: true,
    enableErrorHandling: true,
  });

  return client;
}

/**
 * Gets the schema for a specific attribute.
 * @param objectSlug - The slug of the object (e.g., 'companies').
 * @param attributeSlug - The slug of the attribute (e.g., 'categories').
 * @returns The attribute schema.
 */
export async function getAttributeSchema(
  objectSlug: string,
  attributeSlug: string
): Promise<AttioAttributeSchema> {
  const client = getAttioClient();
  const path = `/objects/${objectSlug}/attributes/${attributeSlug}`;
  try {
    const response = await client.get(path);
    return response.data?.data;
  } catch (err) {
    error(
      'attio-client',
      `Failed to get attribute schema for ${objectSlug}.${attributeSlug}`,
      err,
      { objectSlug, attributeSlug }
    );
    throw err;
  }
}

/**
 * Lists the available options for a select attribute.
 * @param objectSlug - The slug of the object.
 * @param attributeSlug - The slug of the select attribute.
 * @returns A list of available select options.
 */
export async function getSelectOptions(
  objectSlug: string,
  attributeSlug: string
): Promise<AttioSelectOption[]> {
  const client = getAttioClient();
  const path = `/objects/${objectSlug}/attributes/${attributeSlug}/options`;
  try {
    const response = await client.get(path);
    return response.data?.data || [];
  } catch (err) {
    error(
      'attio-client',
      `Failed to get select options for ${objectSlug}.${attributeSlug}`,
      err,
      { objectSlug, attributeSlug }
    );
    throw err;
  }
}

/**
 * Lists the available statuses for a status attribute.
 * @param objectSlug - The slug of the object.
 * @param attributeSlug - The slug of the status attribute.
 * @returns A list of available statuses.
 */
export async function getStatusOptions(
  objectSlug: string,
  attributeSlug: string
): Promise<AttioStatusOption[]> {
  const client = getAttioClient();
  const path = `/objects/${objectSlug}/attributes/${attributeSlug}/statuses`;
  try {
    const response = await client.get(path);
    return response.data?.data || [];
  } catch (err) {
    error(
      'attio-client',
      `Failed to get status options for ${objectSlug}.${attributeSlug}`,
      err,
      { objectSlug, attributeSlug }
    );
    throw err;
  }
}

/**
 * Initializes the global API client with the provided API key
 *
 * @deprecated Use createAttioClient() with ClientCache instead
 * @param apiKey - The Attio API key
 */
export function initializeAttioClient(apiKey: string): AxiosInstance {
  apiInstance = createAttioClient(apiKey); // This will use the legacy signature
  ClientCache.setInstance(apiInstance);
  return apiInstance;
}

/**
 * Gets the global API client instance - SIMPLIFIED using unified architecture
 *
 * @deprecated Use createAttioClient() or getLazyAttioClient() instead
 * @returns The Axios instance for the Attio API
 * @throws If the API client hasn't been initialized and no API key is available
 */
export function getAttioClient(opts?: { rawE2E?: boolean }): AxiosInstance {
  debug('attio-client', 'getAttioClient (LEGACY) called', {
    rawE2E: opts?.rawE2E,
    hasCache: ClientCache.hasInstance(),
    E2E_MODE: process.env.E2E_MODE,
    USE_MOCK_DATA: process.env.USE_MOCK_DATA,
  });

  // Check if we should bypass cache and create fresh client
  const shouldBypassCache =
    EnvironmentModeHandler.shouldUseRealClient() || opts?.rawE2E;

  if (shouldBypassCache) {
    debug('attio-client', 'Bypassing cache - creating fresh client');
    // Clear cache to ensure fresh client
    ClientCache.clearInstance();
    apiInstance = null;

    // Determine mode based on rawE2E option
    const mode = opts?.rawE2E
      ? ClientMode.E2E_RAW
      : EnvironmentModeHandler.determineMode();

    const config: ClientConfig = {
      mode,
      bypassCache: true,
    };

    const client = createAttioClient(config);
    debug('attio-client', 'Returning fresh E2E client');
    return client;
  }

  // Check cache first
  const cachedClient = ClientCache.getInstance();
  if (cachedClient) {
    debug('attio-client', 'Returning cached client from ClientCache');
    return cachedClient;
  }

  // Check legacy cache
  if (apiInstance) {
    debug('attio-client', 'Returning cached client from legacy apiInstance');
    return apiInstance;
  }

  // No cached client - create new one
  debug('attio-client', 'No cached client found - creating new client');

  try {
    const config: ClientConfig = {}; // Use environment defaults
    const client = createAttioClient(config);

    // Cache the client in both new and legacy systems
    ClientCache.setInstance(client);
    apiInstance = client;

    debug('attio-client', 'Created and cached new client');
    return client;
  } catch (validationError) {
    const errorMessage =
      validationError instanceof Error
        ? validationError.message
        : String(validationError);
    throw new Error(
      `API client not initialized and no valid API key available. ${errorMessage} Call initializeAttioClient first or set ATTIO_API_KEY environment variable.`
    );
  }
}
