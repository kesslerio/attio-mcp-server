/**
 * Attio API client and related utilities
 */
import axios, { type AxiosInstance } from 'axios';
import { createAttioError } from '../utils/error-handler.js';

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
    (response) => response,
    (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Attio API] Request failed:');
        console.error('URL:', error.config?.url);
        console.error('Method:', error.config?.method);
        console.error('Data:', error.config?.data);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
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
export function initializeAttioClient(apiKey: string): void {
  apiInstance = createAttioClient(apiKey);
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
      console.warn(
        '[Attio API] API client not initialized, auto-initializing from environment variable'
      );
      initializeAttioClient(apiKey);
      if (!apiInstance) {
        throw new Error('Failed to initialize Attio API client');
      }
      return apiInstance;
    }
    throw new Error(
      'API client not initialized. Call initializeAttioClient first or set ATTIO_API_KEY environment variable.'
    );
  }
  return apiInstance;
}
