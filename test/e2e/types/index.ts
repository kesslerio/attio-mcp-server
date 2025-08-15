/**
 * Type definitions for E2E test suite
 *
 * Provides proper TypeScript types to replace `any` usage
 * and improve type safety in E2E tests.
 */

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface ResponseMetadata {
  timestamp?: string;
  requestId?: string;
  [key: string]: unknown;
}

// Tool Parameter Types
export interface ToolParameters {
  resource_type?: string;
  record_data?: RecordData;
  record_id?: string;
  query?: string;
  limit?: number;
  offset?: number;
  filters?: FilterParams;
  fields?: string[];
  [key: string]: unknown;
}

export interface RecordData {
  id?: string;
  name?: string;
  description?: string;
  attributes?: Record<string, AttributeValue>;
  [key: string]: unknown;
}

export type AttributeValue =
  | string
  | number
  | boolean
  | null
  | AttributeValue[]
  | { [key: string]: AttributeValue };

export interface FilterParams {
  [key: string]: FilterValue;
}

export type FilterValue =
  | string
  | number
  | boolean
  | null
  | FilterCondition
  | FilterValue[];

export interface FilterCondition {
  operator?: string;
  value?: FilterValue;
  values?: FilterValue[];
}

// Test Data Types
export interface TestRecord {
  id: string;
  type: string;
  attributes?: Record<string, AttributeValue>;
  created_at?: string;
  updated_at?: string;
}

export interface TestFixture {
  name: string;
  data: RecordData;
  expectedResponse?: Partial<TestRecord>;
}

// Logger Types
export interface LogParameters {
  [key: string]: unknown;
}

export interface LogResponse {
  success: boolean;
  data?: unknown;
  error?: ApiError;
  [key: string]: unknown;
}

export interface LogMetadata {
  testSuite?: string;
  testName?: string;
  timestamp?: string;
  [key: string]: unknown;
}

// Tool Migration Types
export type ParameterTransformFn = (params: ToolParameters) => ToolParameters;
export type ResponseTransformFn = (response: ApiResponse) => ApiResponse;

// Enhanced Tool Caller Types
export interface ToolCallOptions {
  timeout?: number;
  retries?: number;
  validateResponse?: boolean;
  mockError?: ApiError;
}

export interface ToolCallResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timing?: {
    start: number;
    end: number;
    duration: number;
  };
}
