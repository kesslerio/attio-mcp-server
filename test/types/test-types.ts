/**
 * Type definitions for test utilities and mocks
 */
import type { Jest } from '@jest/environment';

export interface MockApiClient {
  post: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  get: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  put: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  patch: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  delete: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  // Additional AxiosInstance properties for compatibility
  defaults?: Record<string, unknown>;
  interceptors?: Record<string, unknown>;
  getUri?: jest.MockedFunction<(...args: unknown[]) => string>;
  request?: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  head?: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
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
    post: jest.fn(),
    get: jest.fn().mockResolvedValue({ data: { data: [] } }),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
}

export function createMockResponse<T>(data: T[]): MockApiResponse<T> {
  return {
    data: {
      data,
    },
  };
}
