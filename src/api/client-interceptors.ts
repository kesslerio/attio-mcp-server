/**
 * Reusable Axios interceptors for Attio API client
 * Consolidates duplicate interceptor logic and improves maintainability
 */

import {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { debug, error, OperationType } from '../utils/logger.js';

export interface InterceptorOptions {
  prefix?: string;
  enableDiagnostics?: boolean;
  enableErrorHandling?: boolean;
}

/**
 * Creates a request interceptor that logs outgoing requests with redacted auth
 */
export function createRequestInterceptor(prefix = '') {
  return (config: InternalAxiosRequestConfig) => {
    // Handle null/undefined config gracefully
    if (!config) {
      return config;
    }

    const redacted = { ...(config.headers || {}) };
    if (redacted.Authorization) redacted.Authorization = 'Bearer ***';

    const logPrefix = prefix ? `${prefix} ` : '';
    debug('attio-client', `${logPrefix}Request sent`, {
      baseURL: config.baseURL,
      url: config.url,
      method: config.method,
      headers: redacted,
    });

    return config;
  };
}

/**
 * Creates a response interceptor that logs successful responses
 */
export function createResponseInterceptor(prefix = '') {
  return (res: AxiosResponse) => {
    const logPrefix = prefix ? `${prefix} ` : '';
    debug('attio-client', `${logPrefix}Response received`, {
      status: res.status,
      url: res.config?.url,
      topKeys:
        res?.data && typeof res.data === 'object'
          ? Object.keys(res.data)
          : null,
      rawType: typeof res.data,
    });

    return res;
  };
}

/**
 * Creates an error interceptor that logs failed requests
 */
export function createErrorInterceptor(prefix = '') {
  return (err: AxiosError) => {
    const r = err?.response;
    const logPrefix = prefix ? `${prefix} ` : '';

    error(
      'attio-client',
      `${logPrefix}HTTP request failed`,
      err as Error,
      {
        url: r?.config?.url,
        status: r?.status,
        method: r?.config?.method,
        serverData: r?.data,
        requestPayload: r?.config?.data,
      },
      'http-request',
      OperationType.API_CALL
    );

    return Promise.reject(err);
  };
}

/**
 * Adds diagnostic interceptors to an Axios instance
 * Uses a simple approach without checking for existing interceptors
 */
export function addDiagnosticInterceptors(
  client: AxiosInstance,
  options: InterceptorOptions = {}
): void {
  const { prefix = '', enableDiagnostics = true } = options;

  if (!enableDiagnostics) {
    return;
  }

  // Add interceptors (multiple interceptors are allowed and will run in sequence)
  client.interceptors.request.use(createRequestInterceptor(prefix));
  client.interceptors.response.use(
    createResponseInterceptor(prefix),
    createErrorInterceptor(prefix)
  );
}

/**
 * Adds error handling interceptors specifically for Attio API responses
 */
export function addAttioErrorInterceptors(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      // This preserves the existing Attio-specific error handling
      // from the original attio-client.ts implementation
      return Promise.reject(error);
    }
  );
}

/**
 * Configures all standard interceptors for an Attio client
 */
export function configureStandardInterceptors(
  client: AxiosInstance,
  options: InterceptorOptions = {}
): void {
  const { enableDiagnostics = true, enableErrorHandling = true } = options;

  if (enableDiagnostics) {
    addDiagnosticInterceptors(client, options);
  }

  if (enableErrorHandling) {
    addAttioErrorInterceptors(client);
  }
}
