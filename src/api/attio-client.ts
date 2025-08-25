/**
 * Attio API client and related utilities
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import { createAttioError } from '../utils/error-handler.js';
import { debug, error as logError, OperationType } from '../utils/logger.js';

// Global API client instance
let apiInstance: AxiosInstance | null = null;

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
      `[createAttioClient] Initializing with API key (length: ${apiKey.length}, starts with: ${apiKey.substring(0, 4)}...)`
    );
  }

  const client = axios.create({
    baseURL: 'https://api.attio.com/v2',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  // Add response interceptor for error handling
  client.interceptors.response.use(
    (response) => {
      // Debug logging for ALL successful responses to understand what's happening
      debug(
        'attio-client',
        'Response interceptor called',
        {
          url: response.config?.url,
          method: response.config?.method,
          status: response.status,
          hasData: !!response.data,
          isTasksRequest: response.config?.url?.includes('/tasks'),
        },
        'api-request',
        OperationType.API_CALL
      );

      // More detailed logging for tasks requests
      if (response.config?.url?.includes('/tasks')) {
        debug(
          'attio-client',
          'Tasks request succeeded',
          {
            url: response.config?.url,
            method: response.config?.method,
            status: response.status,
            responseData: response.data,
            responseType: typeof response,
            responseKeys: Object.keys(response),
          },
          'api-request',
          OperationType.API_CALL
        );
      }
      // IMPORTANT: Must return the response object for it to be available to the caller
      return response;
    },
    (error: AxiosError) => {
      // Log ALL errors to understand what's happening
      const errorInfo = {
        url: error.config?.url,
        method: error.config?.method,
        message: error.message,
        code: error.code,
        hasResponse: !!error.response,
        responseStatus: error.response?.status,
        isTasksRequest: error.config?.url?.includes('/tasks'),
        responseData: error.response?.data,
      };

      debug(
        'attio-client',
        'Error interceptor called',
        errorInfo,
        'api-request',
        OperationType.API_CALL
      );

      // Special handling for authentication errors
      if (error.response?.status === 401) {
        console.error(
          '[attio-client] Authentication error - API key may be invalid or expired'
        );
        console.error('[attio-client] Response:', error.response?.data);
      }

      // Special handling for forbidden errors
      if (error.response?.status === 403) {
        console.error(
          '[attio-client] Forbidden error - API key may not have required permissions'
        );
        console.error('[attio-client] Response:', error.response?.data);
      }

      // Log create operation failures specifically
      if (
        error.config?.method === 'post' &&
        (process.env.NODE_ENV === 'development' ||
          process.env.E2E_MODE === 'true')
      ) {
        console.error('[attio-client] CREATE operation failed:', errorInfo);
      }

      if (error.config?.url?.includes('/tasks')) {
        const errorData = {
          url: error.config?.url,
          method: error.config?.method,
          requestHeaders: error.config?.headers,
          requestData: error.config?.data,
          requestDataType: typeof error.config?.data,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
          validationErrors: (error.response?.data as Record<string, unknown>)
            ?.validation_errors,
        };

        logError(
          'attio-client',
          'Tasks request failed',
          error,
          errorData,
          'api-request',
          OperationType.API_CALL
        );
      }
      const enhancedError = createAttioError(error);
      return Promise.reject(enhancedError);
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
export function getAttioClient(): AxiosInstance {
  if (!apiInstance) {
    // Fallback: try to initialize from environment variable
    const apiKey = process.env.ATTIO_API_KEY;
    if (apiKey) {
      debug(
        'attio-client',
        'API client not initialized, auto-initializing from environment variable',
        undefined,
        'initialization',
        OperationType.SYSTEM
      );
      return initializeAttioClient(apiKey);
    }
    throw new Error(
      'API client not initialized. Call initializeAttioClient first or set ATTIO_API_KEY environment variable.'
    );
  }
  return apiInstance;
}
