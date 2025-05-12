/**
 * Attio API client implementation
 */
import axios, { AxiosInstance } from 'axios';
import { createAttioError } from '../errors/api-errors.js';

// Singleton instance of the Attio API client
let attioClient: AxiosInstance | null = null;

/**
 * Creates an Axios instance for Attio API communication
 * 
 * @param apiKey - The Attio API key
 * @returns Configured Axios instance
 */
export function createAttioClient(apiKey: string): AxiosInstance {
  const client = axios.create({
    baseURL: "https://api.attio.com/v2",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  
  // Add response interceptor for error handling
  client.interceptors.response.use(
    response => response,
    error => {
      const enhancedError = createAttioError(error);
      return Promise.reject(enhancedError);
    }
  );
  
  return client;
}

/**
 * Initializes the Attio API client singleton
 * 
 * @param apiKey - The Attio API key
 */
export function initializeAttioClient(apiKey: string): void {
  if (!apiKey) {
    throw new Error("API key is required");
  }
  attioClient = createAttioClient(apiKey);
}

/**
 * Gets the initialized Attio API client instance
 * 
 * @returns The Attio API client
 * @throws Error if the client has not been initialized
 */
export function getAttioClient(): AxiosInstance {
  if (!attioClient) {
    throw new Error("API client not initialized");
  }
  return attioClient;
}