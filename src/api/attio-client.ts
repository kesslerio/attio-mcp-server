/**
 * Attio API client and related utilities
 */
import axios, { AxiosInstance } from 'axios';
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
      // CRITICAL DEBUG: Log ALL responses in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[AXIOS INTERCEPTOR] Response received:', {
          url: response.config?.url,
          method: response.config?.method,
          status: response?.status,
          hasResponse: !!response,
          responseType: typeof response,
          hasData: !!response?.data,
        });
      }

      // Debug logging for successful responses
      if (response.config?.url?.includes('/tasks')) {
        debug(
          'attio-client',
          'Request succeeded',
          {
            url: response.config?.url,
            method: response.config?.method,
            status: response.status,
            responseData: response.data,
          },
          'api-request',
          OperationType.API_CALL
        );
      }
      // IMPORTANT: Must return the response object for it to be available to the caller
      return response;
    },
    (error) => {
      if (error.config?.url?.includes('/tasks')) {
        const errorData = {
          url: error.config?.url,
          method: error.config?.method,
          requestHeaders: error.config?.headers,
          requestData: error.config?.data,
          requestDataType: typeof error.config?.data,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
          validationErrors: error.response?.data?.validation_errors,
        };

        logError(
          'attio-client',
          'Request failed',
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
  // CRITICAL DEBUG: Log client state
  if (process.env.NODE_ENV === 'development') {
    console.log('[getAttioClient] Client state:', {
      hasApiInstance: !!apiInstance,
      baseURL: apiInstance?.defaults?.baseURL,
      hasInterceptors: !!apiInstance?.interceptors?.response,
    });
  }

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
      const initializedClient = initializeAttioClient(apiKey);

      // CRITICAL DEBUG: Log client state after initialization
      if (process.env.NODE_ENV === 'development') {
        console.log('[getAttioClient] After auto-init:', {
          hasApiInstance: true,
          baseURL: initializedClient.defaults?.baseURL || 'none',
          hasInterceptors: !!initializedClient.interceptors?.response,
        });
      }

      return initializedClient;
    }
    throw new Error(
      'API client not initialized. Call initializeAttioClient first or set ATTIO_API_KEY environment variable.'
    );
  }
  return apiInstance;
}
