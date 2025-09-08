import { enhanceApiError } from '../utils/error-enhancer.js';


interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
}

export function createAttioApiClient(
  baseURL: string,
  apiKey: string
): AxiosInstance {
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

          const { status } = axiosError.response;

          // Attempt to enhance the error first

          config.retryCount = config.retryCount || 0;

          // Only retry network errors, 429 (throttling), and 5xx server errors
          // Never retry 4xx client errors (400, 401, 403, 404, etc.) except 429

          if (config.retryCount < MAX_RETRIES && shouldRetry) {
            config.retryCount++;
            console.warn(
              `[Interceptor] Retrying request (${config.retryCount}/${MAX_RETRIES}) for ${config.url} due to ${status}`
            );
            // Exponential backoff with jitter to prevent thundering herd
              RETRY_DELAY_MS * Math.pow(2, config.retryCount - 1);
            await new Promise((resolve) => setTimeout(resolve, totalDelay));
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
