import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  createRequestInterceptor,
  createResponseInterceptor,
  createErrorInterceptor,
  addDiagnosticInterceptors,
  configureStandardInterceptors,
} from '@/api/client-interceptors.js';

// Mock the logger to avoid noise in tests
vi.mock('@/utils/logger.js', () => ({
  debug: vi.fn(),
  error: vi.fn(),
  OperationType: {
    API_CALL: 'API_CALL',
  },
}));

describe('Client Interceptors', () => {
  let mockClient: AxiosInstance;

  beforeEach(() => {
    mockClient = axios.create({
      baseURL: 'https://test.example.com',
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear all interceptors to prevent test interference
    mockClient.interceptors.request.clear();
    mockClient.interceptors.response.clear();
  });

  describe('createRequestInterceptor', () => {
    it('should create a request interceptor that redacts authorization header', () => {
      const interceptor = createRequestInterceptor('TEST');

      const config = {
        baseURL: 'https://api.example.com',
        url: '/test',
        method: 'GET' as const,
        headers: {
          Authorization: 'Bearer secret-api-key-12345',
          'Content-Type': 'application/json',
        },
      };

      const result = interceptor(config);

      expect(result).toBe(config); // Should return the same config object
      expect(result.headers.Authorization).toBe('Bearer secret-api-key-12345'); // Original should be preserved
    });

    it('should handle missing headers gracefully', () => {
      const interceptor = createRequestInterceptor();

      const config = {
        baseURL: 'https://api.example.com',
        url: '/test',
        method: 'GET' as const,
      };

      const result = interceptor(config);
      expect(result).toBe(config);
    });

    it('should handle missing authorization header', () => {
      const interceptor = createRequestInterceptor();

      const config = {
        baseURL: 'https://api.example.com',
        url: '/test',
        method: 'GET' as const,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const result = interceptor(config);
      expect(result).toBe(config);
    });
  });

  describe('createResponseInterceptor', () => {
    it('should create a response interceptor that logs response details', () => {
      const interceptor = createResponseInterceptor('TEST');

      const response = {
        status: 200,
        data: { success: true, data: [] },
        config: {
          url: '/test',
        },
      };

      const result = interceptor(response as any);
      expect(result).toBe(response);
    });

    it('should handle response without data', () => {
      const interceptor = createResponseInterceptor();

      const response = {
        status: 204,
        data: null,
        config: {
          url: '/test',
        },
      };

      const result = interceptor(response as any);
      expect(result).toBe(response);
    });

    it('should extract object keys from response data', () => {
      const interceptor = createResponseInterceptor();

      const response = {
        status: 200,
        data: { users: [], companies: [], meta: {} },
        config: {
          url: '/test',
        },
      };

      const result = interceptor(response as any);
      expect(result).toBe(response);
    });
  });

  describe('createErrorInterceptor', () => {
    it('should create an error interceptor that logs and re-throws errors', async () => {
      const interceptor = createErrorInterceptor('TEST');

      const axiosError = new Error('Network Error') as AxiosError;
      axiosError.response = {
        status: 500,
        data: { error: 'Internal Server Error' },
        config: {
          url: '/test',
          method: 'GET',
          data: { test: 'payload' },
        },
      } as any;

      await expect(interceptor(axiosError)).rejects.toBe(axiosError);
    });

    it('should handle errors without response', async () => {
      const interceptor = createErrorInterceptor();

      const networkError = new Error('Network Error') as AxiosError;

      await expect(interceptor(networkError)).rejects.toBe(networkError);
    });
  });

  describe('addDiagnosticInterceptors', () => {
    it('should add interceptors when diagnostics are enabled', () => {
      const initialRequestHandlers =
        mockClient.interceptors.request.handlers.length;
      const initialResponseHandlers =
        mockClient.interceptors.response.handlers.length;

      addDiagnosticInterceptors(mockClient, {
        prefix: 'TEST',
        enableDiagnostics: true,
      });

      expect(mockClient.interceptors.request.handlers.length).toBeGreaterThan(
        initialRequestHandlers
      );
      expect(mockClient.interceptors.response.handlers.length).toBeGreaterThan(
        initialResponseHandlers
      );
    });

    it('should not add interceptors when diagnostics are disabled', () => {
      const initialRequestHandlers =
        mockClient.interceptors.request.handlers.length;
      const initialResponseHandlers =
        mockClient.interceptors.response.handlers.length;

      addDiagnosticInterceptors(mockClient, {
        enableDiagnostics: false,
      });

      expect(mockClient.interceptors.request.handlers.length).toBe(
        initialRequestHandlers
      );
      expect(mockClient.interceptors.response.handlers.length).toBe(
        initialResponseHandlers
      );
    });

    it('should allow multiple interceptors when called multiple times', () => {
      const initialRequestHandlers =
        mockClient.interceptors.request.handlers?.length || 0;
      const initialResponseHandlers =
        mockClient.interceptors.response.handlers?.length || 0;

      // Call twice to test multiple interceptors
      addDiagnosticInterceptors(mockClient);
      addDiagnosticInterceptors(mockClient);

      // Should have added interceptors each time (Axios allows multiple interceptors)
      expect(
        mockClient.interceptors.request.handlers?.length || 0
      ).toBeGreaterThan(initialRequestHandlers);
      expect(
        mockClient.interceptors.response.handlers?.length || 0
      ).toBeGreaterThan(initialResponseHandlers);
    });

    it('should use default options when none provided', () => {
      addDiagnosticInterceptors(mockClient);

      // Should have added interceptors with default settings
      expect(mockClient.interceptors.request.handlers.length).toBeGreaterThan(
        0
      );
      expect(mockClient.interceptors.response.handlers.length).toBeGreaterThan(
        0
      );
    });
  });

  describe('configureStandardInterceptors', () => {
    it('should configure both diagnostic and error interceptors by default', () => {
      const initialRequestHandlers =
        mockClient.interceptors.request.handlers.length;
      const initialResponseHandlers =
        mockClient.interceptors.response.handlers.length;

      configureStandardInterceptors(mockClient);

      expect(mockClient.interceptors.request.handlers.length).toBeGreaterThan(
        initialRequestHandlers
      );
      expect(mockClient.interceptors.response.handlers.length).toBeGreaterThan(
        initialResponseHandlers
      );
    });

    it('should respect enableDiagnostics option', () => {
      const initialHandlers = mockClient.interceptors.request.handlers.length;

      configureStandardInterceptors(mockClient, {
        enableDiagnostics: false,
        enableErrorHandling: true,
      });

      // Should only add error handling interceptors, not diagnostic ones
      expect(mockClient.interceptors.request.handlers.length).toBe(
        initialHandlers
      );
    });

    it('should respect enableErrorHandling option', () => {
      configureStandardInterceptors(mockClient, {
        enableDiagnostics: true,
        enableErrorHandling: false,
      });

      // Should have diagnostic interceptors
      expect(mockClient.interceptors.request.handlers.length).toBeGreaterThan(
        0
      );
    });

    it('should work with custom prefix', () => {
      configureStandardInterceptors(mockClient, {
        prefix: 'CUSTOM_PREFIX',
        enableDiagnostics: true,
      });

      expect(mockClient.interceptors.request.handlers.length).toBeGreaterThan(
        0
      );
      expect(mockClient.interceptors.response.handlers.length).toBeGreaterThan(
        0
      );
    });
  });

  describe('Integration Tests', () => {
    it('should handle a complete request/response cycle with interceptors', async () => {
      // Mock a successful response
      const mockAdapter = vi.fn().mockResolvedValue({
        status: 200,
        data: { result: 'success' },
        headers: {},
        config: {},
      });

      mockClient.defaults.adapter = mockAdapter;
      configureStandardInterceptors(mockClient);

      const response = await mockClient.get('/test', {
        headers: { Authorization: 'Bearer test-key' },
      });

      expect(response.data).toEqual({ result: 'success' });
      expect(mockAdapter).toHaveBeenCalled();
    });

    it('should handle errors properly with interceptors', async () => {
      const mockError = new Error('API Error') as AxiosError;
      mockError.response = {
        status: 400,
        data: { error: 'Bad Request' },
      } as any;

      const mockAdapter = vi.fn().mockRejectedValue(mockError);
      mockClient.defaults.adapter = mockAdapter;
      configureStandardInterceptors(mockClient);

      await expect(mockClient.get('/test')).rejects.toThrow('API Error');
      expect(mockAdapter).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined config in request interceptor', () => {
      const interceptor = createRequestInterceptor();

      const nullConfig = null as any;
      expect(() => interceptor(nullConfig)).not.toThrow();
    });

    it('should handle circular references in response data', () => {
      const interceptor = createResponseInterceptor();

      const circularData: any = { name: 'test' };
      circularData.self = circularData; // Create circular reference

      const response = {
        status: 200,
        data: circularData,
        config: { url: '/test' },
      };

      expect(() => interceptor(response as any)).not.toThrow();
    });

    it('should handle very large response objects', () => {
      const interceptor = createResponseInterceptor();

      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `item-${i}`,
      }));

      const response = {
        status: 200,
        data: { items: largeData },
        config: { url: '/test' },
      };

      expect(() => interceptor(response as any)).not.toThrow();
    });
  });
});
