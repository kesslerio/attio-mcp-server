import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { enhanceApiError } from '../utils/error-enhancer.js';

// If logger is used, ensure it's imported, e.g.:
// import { logger } from '../utils/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
}

export function createAttioApiClient(
  baseURL: string,
  apiKey: string
): AxiosInstance {
  const instance = axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: unknown) => {
      // Enhanced logging to inspect the error object thoroughly
      console.error(
        '[Interceptor] Raw error received by interceptor. Message:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.error('[Interceptor] Is Axios Error:', axios.isAxiosError(error));

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('[Interceptor] Axios error config:', axiosError.config);
        // console.error('[Interceptor] Axios error request:', axiosError.request); // Often large, skip for brevity unless needed
        console.error(
          '[Interceptor] Axios error response status:',
          axiosError.response?.status
        );
        console.error(
          '[Interceptor] Axios error response headers:',
          JSON.stringify(axiosError.response?.headers)
        );
        console.error(
          '[Interceptor] Axios error response data (raw):',
          JSON.stringify(axiosError.response?.data)
        );

        if (axiosError.response) {
          console.error(
            `[Interceptor] API Error: ${
              axiosError.response.status
            } ${axiosError.config?.method?.toUpperCase()} ${
              axiosError.config?.url
            }`
          );
          // console.error('[Interceptor] Full error.response object:', JSON.stringify(axiosError.response)); // Can be very verbose

          const config = axiosError.config as RetryableAxiosRequestConfig;
          const { status } = axiosError.response;

          // Attempt to enhance the error first
          const enhancedError = enhanceApiError(axiosError); // Pass the original AxiosError

          config.retryCount = config.retryCount || 0;

          if (
            config.retryCount < MAX_RETRIES &&
            (status === 429 || status >= 500)
          ) {
            config.retryCount++;
            console.warn(
              `[Interceptor] Retrying request (${config.retryCount}/${MAX_RETRIES}) for ${config.url} due to ${status}`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, RETRY_DELAY_MS * (config.retryCount || 1))
            );
            return instance.request(config);
          }
          return Promise.reject(enhancedError); // Reject with the potentially enhanced error
        }
      } else {
        console.error(
          '[Interceptor] Non-Axios error structure:',
          JSON.stringify(error, Object.getOwnPropertyNames(error || {}))
        );
      }

      // Fallback for non-Axios errors or Axios errors without a response
      return Promise.reject(error);
    }
  );

  return instance;
}

// Example of creating a default client (ensure env variables are set up)
// const defaultBaseURL = process.env.ATTIO_API_BASE_URL || 'https://api.attio.com/v2';
// const defaultApiKey = process.env.ATTIO_API_KEY;

// if (!defaultApiKey) {
//   console.warn('ATTIO_API_KEY is not set. Default Attio API client will not be functional.');
// }

// export const attio = defaultApiKey ? createAttioApiClient(defaultBaseURL, defaultApiKey) : null;

// If you had a global Attio instance like this, re-add it. For now, just exporting the factory.
