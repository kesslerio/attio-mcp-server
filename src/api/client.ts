import axios from 'axios';
import type {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosRequestConfig,
} from 'axios';
import { enhanceApiError } from '../utils/error-enhancer.js';
import { createScopedLogger, OperationType } from '../utils/logger.js';

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
      Accept: 'application/json',
    },
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: unknown) => {
      const log = createScopedLogger(
        'api.client',
        'responseInterceptor',
        OperationType.API_CALL
      );
      // Enhanced logging to inspect the error object thoroughly
      log.error('Raw error received by interceptor', error, {
        isAxiosError: axios.isAxiosError(error),
      });

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        log.debug('Axios error config', { config: axiosError.config as any });
        // console.error('[Interceptor] Axios error request:', axiosError.request); // Often large, skip for brevity unless needed
        log.error('Axios error response details', undefined, {
          status: axiosError.response?.status,
          headers: axiosError.response?.headers as any,
          data: axiosError.response?.data as any,
        });

        if (axiosError.response) {
          log.error('API Error', axiosError, {
            status: axiosError.response.status,
            method: axiosError.config?.method?.toUpperCase(),
            url: axiosError.config?.url,
          });
          // console.error('[Interceptor] Full error.response object:', JSON.stringify(axiosError.response)); // Can be very verbose

          const config = (axiosError.config ??
            {}) as RetryableAxiosRequestConfig;
          const { status } = axiosError.response;

          // Attempt to enhance the error first
          const enhancedError = enhanceApiError(axiosError); // Pass the original AxiosError

          config.retryCount = config.retryCount || 0;

          // Only retry network errors, 429 (throttling), and 5xx server errors
          // Never retry 4xx client errors (400, 401, 403, 404, etc.) except 429
          const shouldRetry = !status || status === 429 || status >= 500;

          if (config.retryCount < MAX_RETRIES && shouldRetry) {
            config.retryCount++;
            const target = config.url ?? '(unknown url)';
            log.warn('Retrying request due to error status', {
              retryCount: config.retryCount,
              maxRetries: MAX_RETRIES,
              target,
              status,
            });
            // Exponential backoff with jitter to prevent thundering herd
            const baseDelay =
              RETRY_DELAY_MS * Math.pow(2, config.retryCount - 1);
            const jitter = Math.floor(Math.random() * 300); // 0-300ms jitter
            const totalDelay = Math.min(baseDelay + jitter, 5000); // Cap at 5s
            await new Promise((resolve) => setTimeout(resolve, totalDelay));

            // Convert InternalAxiosRequestConfig to AxiosRequestConfig before retrying
            const retryConfig: AxiosRequestConfig = { ...config };
            return instance.request(retryConfig);
          }
          return Promise.reject(enhancedError); // Reject with the potentially enhanced error
        }
      } else {
        log.error('Non-Axios error structure', error);
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
