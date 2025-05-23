/**
 * Type definitions for test utilities and mocks
 */
import type { Jest } from '@jest/environment';

export interface MockApiClient {
  post: jest.MockedFunction<any>;
  get: jest.MockedFunction<any>;
  put: jest.MockedFunction<any>;
  patch: jest.MockedFunction<any>;
  delete: jest.MockedFunction<any>;
  // Additional AxiosInstance properties for compatibility
  defaults?: any;
  interceptors?: any;
  getUri?: jest.MockedFunction<any>;
  request?: jest.MockedFunction<any>;
  head?: jest.MockedFunction<any>;
}

export interface MockApiResponse<T = any> {
  data: {
    data: T[];
  };
}

export interface MockCompanyUpdate {
  industry?: string;
  categories?: string | string[];
  [key: string]: any;
}

export interface TestCompanyData {
  name: string;
  industry?: string;
  categories?: string | string[];
  [key: string]: any;
}

export interface TestMockRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, any>;
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
