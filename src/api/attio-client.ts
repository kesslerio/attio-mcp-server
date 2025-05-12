/**
 * Client for the Attio API
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Creates and returns an authenticated Axios instance for Attio API
 * @returns Axios instance configured for Attio API
 */
export function getAttioClient(): AxiosInstance {
  const apiKey = process.env.ATTIO_API_KEY;
  
  if (!apiKey) {
    throw new Error('ATTIO_API_KEY environment variable is required');
  }
  
  const config: AxiosRequestConfig = {
    baseURL: 'https://api.attio.com/v2',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
  
  return axios.create(config);
}