/**
 * Attio API client and related utilities
 */
import axios, { AxiosInstance } from 'axios';
import { debug, error, OperationType } from '../utils/logger.js';
import { fileURLToPath } from 'url';

// module banner – shows up as soon as the file is evaluated
// import.meta is valid with NodeNext module resolution in tsconfig.json
const MODULE_FILE = fileURLToPath(import.meta.url);
// Debug loading info - use logger instead of console.log to avoid JSON parsing issues
debug('attio-client', 'Module loaded', {
  file: MODULE_FILE,
  E2E_MODE: process.env.E2E_MODE,
  USE_MOCK_DATA: process.env.USE_MOCK_DATA,
});
export const __MODULE_PATH__ = MODULE_FILE;

export type AttioClient = AxiosInstance;

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
  const apiKey = opts?.apiKey ?? process.env.ATTIO_API_KEY ?? '';
  const baseURL =
    opts?.baseURL ?? process.env.ATTIO_BASE_URL ?? 'https://api.attio.com/v2';
  const timeout = opts?.timeoutMs ?? 30000;

  if (!apiKey) {
    // Hard fail so E2E points to the real cause
    throw new Error(
      'ATTIO_API_KEY is missing; cannot build authenticated Attio client.'
    );
  }

  const client = axios.create({ baseURL, timeout });

  // IMPORTANT: Axios stores auth under headers.common
  client.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
  client.defaults.headers.common['Accept'] = 'application/json';
  client.defaults.headers.post['Content-Type'] = 'application/json';

  // Optional: very lightweight debug logging (no bodies)
  if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
    client.interceptors.request.use((config) => {
      console.debug(
        '[attio] →',
        config.method?.toUpperCase(),
        (config.baseURL || '') + (config.url || ''),
        {
          hasAuth:
            !!config.headers?.Authorization ||
            !!client.defaults.headers.common?.Authorization,
        }
      );
      return config;
    });
    client.interceptors.response.use(
      (res) => {
        console.debug('[attio] ←', res.status, res.config.url);
        return res;
      },
      (err) => {
        console.debug('[attio] ← ERR', err?.response?.status, err?.config?.url);
        return Promise.reject(err);
      }
    );
  }

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
  // Validate API key format and presence
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Invalid API key: API key must be a non-empty string');
  }

  // Basic format validation - Attio API keys should be a reasonable length
  if (apiKey.length < 10) {
    throw new Error('Invalid API key: API key appears to be too short');
  }

  // Log API key info for debugging (without exposing the actual key)
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.E2E_MODE === 'true'
  ) {
    console.error(
      `[createAttioClient] Initializing with API key (length: ${
        apiKey.length
      }, starts with: ${apiKey.substring(0, 4)}...)`
    );
  }

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

  // TEMP DIAGNOSTICS (E2E only): show final URL + top-level shape
  if (process.env.E2E_MODE === 'true') {
    client.interceptors.request.use((config) => {
      const redacted = { ...(config.headers || {}) };
      if (redacted.Authorization) redacted.Authorization = 'Bearer ***';
      debug('attio-client', 'Request sent', {
        baseURL: config.baseURL,
        url: config.url,
        method: config.method,
        headers: redacted,
      });
      return config;
    });
    client.interceptors.response.use(
      (res) => {
        debug('attio-client', 'Response received', {
          status: res.status,
          url: res.config?.url,
          keys:
            res?.data && typeof res.data === 'object'
              ? Object.keys(res.data)
              : null,
          rawType: typeof res.data,
        });
        return res;
      },
      (err) => {
        const r = err?.response;
        error(
          'attio-client',
          'HTTP request failed',
          err,
          {
            url: r?.config?.url,
            status: r?.status,
            method: r?.config?.method,
          },
          'http-request',
          OperationType.API_CALL
        );
        return Promise.reject(err);
      }
    );
  }

  // Add unconditional diagnostics and passthrough error handling
  debug('attio-client', 'Default client baseURL configured', { baseURL });

  client.interceptors.request.use((config) => {
    const redacted = { ...(config.headers || {}) };
    if (redacted.Authorization) redacted.Authorization = 'Bearer ***';
    debug('attio-client', 'Request interceptor', {
      baseURL: config.baseURL,
      url: config.url,
      method: config.method,
      headers: redacted,
    });
    return config;
  });

  client.interceptors.response.use(
    (res) => {
      debug('attio-client', 'Response interceptor', {
        status: res.status,
        url: res.config?.url,
        topKeys:
          res?.data && typeof res.data === 'object'
            ? Object.keys(res.data)
            : null,
      });
      return res;
    },
    (err) => {
      const r = err?.response;
      error('attio-client', 'HTTP response error', err, {
        url: r?.config?.url,
        method: r?.config?.method,
        status: r?.status,
        serverData: r?.data,
        requestPayload: r?.config?.data,
      });
      return Promise.reject(err); // PRESERVE axios error (don't wrap)
    }
  );

  return client;
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
    console.log('🚨 E2E MODE: bypassing cache, creating fresh client');
    apiInstance = null; // guarantee we don't return a stale client
    console.log('🚨 CREATING RAW E2E CLIENT', {
      forceReal,
      rawE2E: opts?.rawE2E,
      isE2E,
      useMocks,
    });
    debug('AttioClient', 'Creating raw E2E client with http adapter');

    // Create a fresh client instance with no interceptors for E2E
    const apiKey = process.env.ATTIO_API_KEY;
    if (!apiKey) {
      throw new Error('ATTIO_API_KEY required for E2E mode');
    }

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

    // Add diagnostics and passthrough error handling
    debug('attio-client', 'E2E RAW client baseURL configured', { baseURL });

    rawClient.interceptors.request.use((config) => {
      const redacted = { ...(config.headers || {}) };
      if (redacted.Authorization) redacted.Authorization = 'Bearer ***';
      debug('attio-client', 'E2E Request sent', {
        baseURL: config.baseURL,
        url: config.url,
        method: config.method,
        headers: redacted,
      });
      return config;
    });

    rawClient.interceptors.response.use(
      (res) => {
        debug('attio-client', 'E2E Response received', {
          status: res.status,
          url: res.config?.url,
          topKeys:
            res?.data && typeof res.data === 'object'
              ? Object.keys(res.data)
              : null,
        });
        return res;
      },
      (err) => {
        const r = err?.response;
        error('attio-client', 'E2E HTTP error', err, {
          url: r?.config?.url,
          method: r?.config?.method,
          status: r?.status,
          serverData: r?.data,
          requestPayload: r?.config?.data,
        });
        return Promise.reject(err); // PRESERVE axios error (don't wrap)
      }
    );

    console.log('🚀 RETURNING E2E RAW CLIENT');
    return rawClient;
  }

  if (!apiInstance) {
    // Fallback: try to initialize from environment variable
    const apiKey = process.env.ATTIO_API_KEY;
    if (apiKey) {
      console.log('🆕 CREATING DEFAULT CLIENT (auto-init from env)');
      debug(
        'attio-client',
        'API client not initialized, auto-initializing from environment variable',
        undefined,
        'initialization',
        OperationType.SYSTEM
      );
      apiInstance = createAttioClient(apiKey);
    } else {
      throw new Error(
        'API client not initialized. Call initializeAttioClient first or set ATTIO_API_KEY environment variable.'
      );
    }
  } else {
    debug('attio-client', 'Returning cached default client');
  }

  return apiInstance;
}
