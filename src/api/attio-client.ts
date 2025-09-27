/**
 * Attio API client and related utilities
 */
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { debug, error, OperationType } from '@/utils/logger.js';
import { getContextApiKey, validateApiKey } from './client-context.js';
import { configureStandardInterceptors } from './client-interceptors.js';
import {
  AttioAxiosError,
  AttioAttributeSchema,
  AttioSelectOption,
  AttioStatusOption,
  isAttioErrorData,
} from './types.js';

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

// Global API client instance
let apiInstance: AxiosInstance | null = null;

/**
 * Centralized authenticated Attio client builder
 * Guarantees proper Authorization header and fails fast if API key is missing
 */
export function buildAttioClient(opts?: {
  apiKey?: string;
  baseURL?: string;
  timeoutMs?: number;
}): AttioClient {
  const apiKey =
    opts?.apiKey ?? process.env.ATTIO_API_KEY ?? getContextApiKey() ?? '';
  const baseURL =
    opts?.baseURL ?? process.env.ATTIO_BASE_URL ?? 'https://api.attio.com/v2';
  const timeout = opts?.timeoutMs ?? 30000;

  // Use standardized validation
  const apiKeySource = opts?.apiKey
    ? 'opts parameter'
    : process.env.ATTIO_API_KEY
      ? 'environment variable'
      : 'context configuration';
  validateAndThrowForApiKey(apiKey, apiKeySource);

  const client = axios.create({ baseURL, timeout });

  // IMPORTANT: Axios stores auth under headers.common
  client.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
  client.defaults.headers.common['Accept'] = 'application/json';
  client.defaults.headers.post['Content-Type'] = 'application/json';

  // Response interceptor to attach serverData for error handling
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      const data = error?.response?.data;
      if (isAttioErrorData(data)) {
        // Mirror serverData onto the error so wrappers can preserve it
        const attioError = error as AttioAxiosError;
        attioError.serverData = {
          status_code: data.status_code ?? error.response?.status,
          type: data.type,
          code: data.code,
          message: data.message,
        };
        return Promise.reject(attioError);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

// Legacy getAttioClient exists below - it's already implemented

/**
 * Creates and configures an Axios instance for the Attio API
 *
 * @param apiKey - The Attio API key
 * @returns Configured Axios instance
 */
export function createAttioClient(apiKey: string): AxiosInstance {
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
 * @param apiKey - The Attio API key
 */
export function initializeAttioClient(apiKey: string): AxiosInstance {
  apiInstance = createAttioClient(apiKey);
  return apiInstance;
}

/**
 * Gets the global API client instance
 *
 * @deprecated Use getLazyAttioClient from lazy-client.js instead for lazy initialization
 * @returns The Axios instance for the Attio API
 * @throws If the API client hasn't been initialized and no API key is available
 */
export function getAttioClient(opts?: { rawE2E?: boolean }): AxiosInstance {
  const isE2E = process.env.E2E_MODE === 'true';
  const useMocks =
    process.env.USE_MOCK_DATA === 'true' || process.env.OFFLINE_MODE === 'true';
  const forceReal = isE2E && !useMocks;

  // Debug log the client mode selection
  debug('attio-client', 'Client mode selection', {
    isE2E,
    useMocks,
    forceReal,
    rawE2E: opts?.rawE2E,
    NODE_ENV: process.env.NODE_ENV,
    E2E_MODE: process.env.E2E_MODE,
    USE_MOCK_DATA: process.env.USE_MOCK_DATA,
    OFFLINE_MODE: process.env.OFFLINE_MODE,
  });
  debug('AttioClient', 'mode', {
    isE2E,
    useMocks,
    forceReal,
    rawE2E: opts?.rawE2E,
    NODE_ENV: process.env.NODE_ENV,
  });

  // If we need the raw E2E client, do NOT reuse any cached instance
  if (forceReal || opts?.rawE2E) {
    debug('AttioClient', 'E2E MODE: bypassing cache, creating fresh client');
    apiInstance = null; // guarantee we don't return a stale client
    debug('AttioClient', 'Creating raw E2E client', {
      forceReal,
      rawE2E: opts?.rawE2E,
      isE2E,
      useMocks,
    });
    debug('AttioClient', 'Creating raw E2E client with http adapter');

    // Create a fresh client instance with no interceptors for E2E
    const apiKey = process.env.ATTIO_API_KEY || getContextApiKey();
    const apiKeySource = process.env.ATTIO_API_KEY
      ? 'environment variable'
      : 'context configuration';
    validateAndThrowForApiKey(apiKey, `${apiKeySource} (E2E mode)`);

    const baseURL = (
      process.env.ATTIO_BASE_URL || 'https://api.attio.com/v2'
    ).replace(/\/+$/, '');

    const rawClient = axios.create({
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

    // Configure E2E interceptors using centralized module
    debug('attio-client', 'Configuring E2E raw client interceptors', {
      baseURL,
    });

    configureStandardInterceptors(rawClient, {
      prefix: 'E2E-RAW',
      enableDiagnostics: true,
      enableErrorHandling: true,
    });

    debug('AttioClient', 'Returning E2E raw client');
    return rawClient;
  }

  if (!apiInstance) {
    // Fallback: try to initialize from environment variable
    const apiKey = process.env.ATTIO_API_KEY || getContextApiKey();
    const apiKeySource = process.env.ATTIO_API_KEY
      ? 'environment variable'
      : 'context configuration';

    try {
      validateAndThrowForApiKey(apiKey, apiKeySource);
      debug(
        'attio-client',
        `Creating default client (auto-init from ${apiKeySource})`
      );
      debug(
        'attio-client',
        `API client not initialized, auto-initializing from ${apiKeySource}`,
        undefined,
        'initialization',
        OperationType.SYSTEM
      );
      apiInstance = createAttioClient(apiKey);
    } catch (validationError) {
      const errorMessage =
        validationError instanceof Error
          ? validationError.message
          : String(validationError);
      throw new Error(
        `API client not initialized and no valid API key available. ${errorMessage} Call initializeAttioClient first or set ATTIO_API_KEY environment variable.`
      );
    }
  } else {
    debug('attio-client', 'Returning cached default client');
  }

  return apiInstance;
}
