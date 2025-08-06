/**
 * Type definitions for test utilities and mocks
 */
import type { MockedFunction } from 'vitest';
import { vi } from 'vitest';

export interface MockApiClient {
  post: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  get: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  put: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  patch: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  delete: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  // Additional AxiosInstance properties for compatibility
  defaults?: Record<string, unknown>;
  interceptors?: Record<string, unknown>;
  getUri?: MockedFunction<(...args: unknown[]) => string>;
  request?: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  head?: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
}

export interface MockApiResponse<T = unknown> {
  data: {
    data: T[];
  };
}

export interface MockCompanyUpdate {
  industry?: string;
  categories?: string | string[];
  [key: string]: unknown;
}

export interface TestCompanyData {
  name: string;
  industry?: string;
  categories?: string | string[];
  [key: string]: unknown;
}

export interface TestMockRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export function createMockApiClient(): MockApiClient {
  return {
    post: vi.fn().mockResolvedValue({
      data: { data: { id: { record_id: 'test-id' }, values: {} } },
    }),
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    put: vi.fn().mockResolvedValue({
      data: { data: { id: { record_id: 'test-id' }, values: {} } },
    }),
    patch: vi.fn().mockResolvedValue({
      data: { data: { id: { record_id: 'test-id' }, values: {} } },
    }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
    defaults: {},
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
}

export function createMockResponse<T>(data: T[]): MockApiResponse<T> {
  return {
    data: {
      data,
    },
  };
}
