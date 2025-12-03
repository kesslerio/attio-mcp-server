/**
 * Edge-compatible HTTP client using native fetch API
 * Works in Node.js 18+, Cloudflare Workers, and browsers
 */

import type {
  HttpClientConfig,
  HttpResponse,
  HttpError,
} from '../types/index.js';

/**
 * HTTP client interface for making API requests
 */
export interface HttpClient {
  get<T = unknown>(path: string): Promise<HttpResponse<T>>;
  post<T = unknown>(path: string, body?: unknown): Promise<HttpResponse<T>>;
  patch<T = unknown>(path: string, body?: unknown): Promise<HttpResponse<T>>;
  delete<T = unknown>(path: string): Promise<HttpResponse<T>>;
}

/**
 * Create an HTTP error from a fetch response
 */
async function createHttpError(response: Response): Promise<HttpError> {
  let message = `HTTP ${response.status}: ${response.statusText}`;
  let details: unknown;

  try {
    const body = await response.json();
    if (body && typeof body === 'object') {
      if ('message' in body && typeof body.message === 'string') {
        message = body.message;
      }
      if ('error' in body && typeof body.error === 'string') {
        message = body.error;
      }
      details = body;
    }
  } catch {
    // Response body is not JSON, use default message
  }

  return {
    status: response.status,
    message,
    details,
  };
}

/**
 * Convert Headers to a plain object
 */
function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

/**
 * Create a fetch-based HTTP client
 * This implementation is edge-compatible and works without Node.js APIs
 *
 * @param config - HTTP client configuration
 * @returns HTTP client instance
 *
 * @example
 * ```typescript
 * const client = createFetchClient({
 *   baseUrl: 'https://api.attio.com',
 *   authorization: 'Bearer your-token',
 *   timeout: 30000,
 * });
 *
 * const response = await client.get('/v2/objects/companies/records');
 * ```
 */
export function createFetchClient(config: HttpClientConfig): HttpClient {
  const {
    baseUrl,
    authorization,
    timeout = 30000,
    headers: customHeaders = {},
  } = config;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: authorization,
    ...customHeaders,
  };

  async function request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<HttpResponse<T>> {
    const url = `${baseUrl}${path}`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: defaultHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await createHttpError(response);
        throw error;
      }

      // Handle empty responses (204 No Content)
      let data: T;
      const contentLength = response.headers.get('content-length');
      if (response.status === 204 || contentLength === '0') {
        data = {} as T;
      } else {
        data = (await response.json()) as T;
      }

      return {
        status: response.status,
        data,
        headers: headersToObject(response.headers),
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw {
          status: 408,
          message: `Request timeout after ${timeout}ms`,
          code: 'TIMEOUT',
        } as HttpError;
      }

      // Re-throw HttpError
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      // Wrap other errors
      throw {
        status: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'NETWORK_ERROR',
      } as HttpError;
    }
  }

  return {
    get<T>(path: string): Promise<HttpResponse<T>> {
      return request<T>('GET', path);
    },

    post<T>(path: string, body?: unknown): Promise<HttpResponse<T>> {
      return request<T>('POST', path, body);
    },

    patch<T>(path: string, body?: unknown): Promise<HttpResponse<T>> {
      return request<T>('PATCH', path, body);
    },

    delete<T>(path: string): Promise<HttpResponse<T>> {
      return request<T>('DELETE', path);
    },
  };
}

/**
 * Create an HTTP client for the Attio API
 *
 * @param token - Attio API key or OAuth access token
 * @returns HTTP client configured for Attio API
 */
export function createAttioClient(token: string): HttpClient {
  return createFetchClient({
    baseUrl: 'https://api.attio.com',
    authorization: `Bearer ${token}`,
    timeout: 30000,
  });
}
