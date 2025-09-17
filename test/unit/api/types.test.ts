/**
 * Type-only tests to validate API type definitions
 *
 * These tests ensure our types compile correctly and maintain type safety.
 * They serve as compile-time validation without runtime overhead.
 */

import { describe, it, expectTypeOf } from 'vitest';
import type {
  AttioResponse,
  AttioServerError,
  AttioAxiosError,
  AttioAttributeSchema,
  AttioSelectOption,
  AttioStatusOption,
  TypedAxiosResponse,
} from '../../../src/api/types.js';
import type { AxiosError, AxiosResponse } from 'axios';

describe('API Types - Type Safety Validation', () => {
  describe('AttioResponse<T>', () => {
    it('should properly type generic response data', () => {
      type TestResponse = AttioResponse<{ name: string; id: number }>;

      expectTypeOf<TestResponse['data']>().toEqualTypeOf<{
        name: string;
        id: number;
      }>();
      expectTypeOf<TestResponse['status']>().toEqualTypeOf<
        number | undefined
      >();
      expectTypeOf<TestResponse['message']>().toEqualTypeOf<
        string | undefined
      >();
      expectTypeOf<TestResponse['meta']>().toEqualTypeOf<
        | {
            total?: number;
            cursor?: string;
            has_more?: boolean;
            [key: string]: unknown;
          }
        | undefined
      >();
    });

    it('should default to unknown for unspecified data type', () => {
      type DefaultResponse = AttioResponse;
      expectTypeOf<DefaultResponse['data']>().toEqualTypeOf<unknown>();
    });
  });

  describe('AttioServerError', () => {
    it('should have correct error structure', () => {
      expectTypeOf<AttioServerError['status_code']>().toEqualTypeOf<
        number | undefined
      >();
      expectTypeOf<AttioServerError['type']>().toEqualTypeOf<
        string | undefined
      >();
      expectTypeOf<AttioServerError['code']>().toEqualTypeOf<
        string | undefined
      >();
      expectTypeOf<AttioServerError['message']>().toEqualTypeOf<
        string | undefined
      >();
    });
  });

  describe('AttioAxiosError', () => {
    it('should extend AxiosError with serverData', () => {
      expectTypeOf<AttioAxiosError>().toMatchTypeOf<AxiosError>();
      expectTypeOf<AttioAxiosError['serverData']>().toEqualTypeOf<
        AttioServerError | undefined
      >();
    });
  });

  describe('AttioAttributeSchema', () => {
    it('should have required and optional properties', () => {
      expectTypeOf<AttioAttributeSchema['api_slug']>().toEqualTypeOf<string>();
      expectTypeOf<AttioAttributeSchema['title']>().toEqualTypeOf<string>();
      expectTypeOf<AttioAttributeSchema['type']>().toMatchTypeOf<string>();
      expectTypeOf<AttioAttributeSchema['is_system']>().toEqualTypeOf<
        boolean | undefined
      >();
    });

    it('should have properly typed config object', () => {
      type Config = NonNullable<AttioAttributeSchema['config']>;
      expectTypeOf<Config['options']>().toEqualTypeOf<
        Array<{ id: string; title: string; color?: string }> | undefined
      >();
      expectTypeOf<Config['precision']>().toEqualTypeOf<number | undefined>();
      expectTypeOf<Config['max_length']>().toEqualTypeOf<number | undefined>();
    });
  });

  describe('AttioSelectOption', () => {
    it('should have correct option structure', () => {
      expectTypeOf<AttioSelectOption['id']>().toEqualTypeOf<
        string | undefined
      >();
      expectTypeOf<AttioSelectOption['title']>().toEqualTypeOf<string>();
      expectTypeOf<AttioSelectOption['value']>().toEqualTypeOf<string>();
      expectTypeOf<AttioSelectOption['color']>().toEqualTypeOf<
        string | undefined
      >();
      expectTypeOf<AttioSelectOption['order']>().toEqualTypeOf<
        number | undefined
      >();
      expectTypeOf<AttioSelectOption['is_archived']>().toEqualTypeOf<
        boolean | undefined
      >();
      expectTypeOf<AttioSelectOption['created_at']>().toEqualTypeOf<
        string | undefined
      >();
      expectTypeOf<AttioSelectOption['updated_at']>().toEqualTypeOf<
        string | undefined
      >();
    });
  });

  describe('AttioStatusOption', () => {
    it('should extend AttioSelectOption with status_type', () => {
      expectTypeOf<AttioStatusOption>().toMatchTypeOf<AttioSelectOption>();
      expectTypeOf<AttioStatusOption['status_type']>().toEqualTypeOf<
        'active' | 'inactive' | 'completed' | 'custom' | undefined
      >();
    });
  });

  describe('TypedAxiosResponse<T>', () => {
    it('should properly wrap Axios response with AttioResponse', () => {
      type TestTypedResponse = TypedAxiosResponse<{ users: string[] }>;
      expectTypeOf<TestTypedResponse>().toMatchTypeOf<
        AxiosResponse<AttioResponse<{ users: string[] }>>
      >();
    });
  });

  describe('Type Guards Compilation', () => {
    it('should compile type guard functions without errors', () => {
      // This test ensures type guards compile correctly
      // The actual runtime tests are in separate files
      const mockError: unknown = {};
      const mockData: unknown = {};

      // These should compile without TypeScript errors
      expectTypeOf<
        typeof import('../../../src/api/types.js').hasAttioServerData
      >().toEqualTypeOf<(error: unknown) => error is AttioAxiosError>();

      expectTypeOf<
        typeof import('../../../src/api/types.js').isAttioErrorData
      >().toEqualTypeOf<(data: unknown) => data is AttioServerError>();

      expectTypeOf<
        typeof import('../../../src/api/types.js').extractAttioError
      >().toEqualTypeOf<(error: unknown) => AttioServerError | undefined>();

      expectTypeOf<
        typeof import('../../../src/api/types.js').extractResponseData
      >().toEqualTypeOf<
        <T>(response: AxiosResponse<unknown> | unknown) => T | undefined
      >();
    });
  });
});
