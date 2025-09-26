/**
 * Tests for the refactored UniversalToolConfig interface
 * Validates the new generic type system from Phase 1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UniversalToolConfig } from '@handlers/tool-configs/universal/types.js';
import { AttioRecord } from '@shared-types/attio.js';

describe('UniversalToolConfig Interface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Generic Type Safety', () => {
    it('should enforce parameter type safety', async () => {
      interface TestParams {
        query: string;
        limit: number;
      }

      interface TestResult {
        data: string[];
        count: number;
      }

      const testConfig: UniversalToolConfig<TestParams, TestResult> = {
        name: 'test-tool',
        handler: async (params: TestParams): Promise<TestResult> => {
          // TypeScript should enforce that params is TestParams
          expect(params.query).toBeDefined();
          expect(params.limit).toBeDefined();

          return {
            data: [params.query],
            count: params.limit,
          };
        },
        formatResult: (results: TestResult, ...args: unknown[]): string => {
          // TypeScript should enforce that results is TestResult
          expect(results.data).toBeDefined();
          expect(results.count).toBeDefined();

          return `Found ${results.count} results: ${results.data.join(', ')}`;
        },
      };

      const params: TestParams = { query: 'test', limit: 5 };
      const result = await testConfig.handler(params);
      const formatted = testConfig.formatResult(result);

      expect(result.data).toEqual(['test']);
      expect(result.count).toBe(5);
      expect(formatted).toBe('Found 5 results: test');
    });

    it('should work with AttioRecord array results', async () => {
      interface SearchParams {
        resource_type: string;
        query: string;
      }

      const searchConfig: UniversalToolConfig<SearchParams, AttioRecord[]> = {
        name: 'search-records',
        handler: async (params: SearchParams): Promise<AttioRecord[]> => {
          return [
            {
              id: { record_id: 'record-1' },
              values: { name: [{ value: 'Test Record' }] },
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z',
            },
          ];
        },
        formatResult: (results: AttioRecord[], ...args: unknown[]): string => {
          const resourceType = args[0] as string | undefined;

          if (!Array.isArray(results)) {
            return 'No records found';
          }

          return `Found ${results.length} ${resourceType || 'record'}(s)`;
        },
      };

      const params: SearchParams = {
        resource_type: 'companies',
        query: 'test',
      };
      const result = await searchConfig.handler(params);
      const formatted = searchConfig.formatResult(result, 'companies');

      expect(result).toHaveLength(1);
      expect(result[0].id.record_id).toBe('record-1');
      expect(formatted).toBe('Found 1 companies(s)');
    });

    it('should handle default generic types', async () => {
      // Test with default types (Record<string, unknown> and unknown)
      const defaultConfig: UniversalToolConfig = {
        name: 'default-tool',
        handler: async (params: Record<string, unknown>) => {
          return { message: 'success', data: params };
        },
        formatResult: (results: unknown): string => {
          const typedResults = results as {
            message: string;
            data: Record<string, unknown>;
          };
          return `Result: ${typedResults.message}`;
        },
      };

      const params = { test: 'value' };
      const result = await defaultConfig.handler(params);
      const formatted = defaultConfig.formatResult(result);

      expect(result).toEqual({ message: 'success', data: params });
      expect(formatted).toBe('Result: success');
    });
  });

  describe('Handler Function Signatures', () => {
    it('should accept async handlers that return promises', async () => {
      interface SimpleParams {
        id: string;
      }

      const asyncConfig: UniversalToolConfig<SimpleParams, string> = {
        name: 'async-tool',
        handler: async (params: SimpleParams): Promise<string> => {
          // Simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 1));
          return `Processed ${params.id}`;
        },
        formatResult: (results: string): string => {
          return `Output: ${results}`;
        },
      };

      const result = await asyncConfig.handler({ id: 'test-123' });
      expect(result).toBe('Processed test-123');

      const formatted = asyncConfig.formatResult(result);
      expect(formatted).toBe('Output: Processed test-123');
    });

    it('should handle error cases in handlers', async () => {
      interface ErrorParams {
        shouldFail: boolean;
      }

      const errorConfig: UniversalToolConfig<ErrorParams, string> = {
        name: 'error-tool',
        handler: async (params: ErrorParams): Promise<string> => {
          if (params.shouldFail) {
            throw new Error('Intentional test error');
          }
          return 'success';
        },
        formatResult: (results: string): string => {
          return results;
        },
      };

      // Test success case
      const successResult = await errorConfig.handler({ shouldFail: false });
      expect(successResult).toBe('success');

      // Test error case
      await expect(errorConfig.handler({ shouldFail: true })).rejects.toThrow(
        'Intentional test error'
      );
    });
  });

  describe('FormatResult Function Signatures', () => {
    it('should handle multiple arguments through rest parameters', () => {
      interface MultiArgParams {
        type: string;
      }

      interface MultiArgResult {
        items: string[];
      }

      const multiArgConfig: UniversalToolConfig<
        MultiArgParams,
        MultiArgResult
      > = {
        name: 'multi-arg-tool',
        handler: async (params: MultiArgParams): Promise<MultiArgResult> => {
          return { items: [`item-${params.type}`] };
        },
        formatResult: (results: MultiArgResult, ...args: unknown[]): string => {
          const prefix = args[0] as string | undefined;
          const suffix = args[1] as string | undefined;
          const includeCount = args[2] as boolean | undefined;

          let output = results.items.join(', ');

          if (prefix) output = `${prefix}: ${output}`;
          if (suffix) output = `${output} ${suffix}`;
          if (includeCount)
            output = `${output} (${results.items.length} items)`;

          return output;
        },
      };

      const result = { items: ['test-item'] };

      // Test with no extra args
      expect(multiArgConfig.formatResult(result)).toBe('test-item');

      // Test with one arg
      expect(multiArgConfig.formatResult(result, 'Items')).toBe(
        'Items: test-item'
      );

      // Test with multiple args
      expect(multiArgConfig.formatResult(result, 'Items', '!', true)).toBe(
        'Items: test-item ! (1 items)'
      );
    });

    it('should always return string type', () => {
      interface StringTestParams {
        value: number;
      }

      const stringConfig: UniversalToolConfig<StringTestParams, number> = {
        name: 'string-test',
        handler: async (params: StringTestParams): Promise<number> => {
          return params.value * 2;
        },
        formatResult: (results: number): string => {
          // Must return string, not number
          return `Result: ${results}`;
        },
      };

      const formatted = stringConfig.formatResult(42);

      expect(typeof formatted).toBe('string');
      expect(formatted).toBe('Result: 42');
    });

    it('should handle complex nested result types', () => {
      interface ComplexResult {
        metadata: {
          total: number;
          page: number;
        };
        records: Array<{
          id: string;
          data: Record<string, unknown>;
        }>;
      }

      const complexConfig: UniversalToolConfig<
        Record<string, unknown>,
        ComplexResult
      > = {
        name: 'complex-tool',
        handler: async (): Promise<ComplexResult> => {
          return {
            metadata: { total: 2, page: 1 },
            records: [
              { id: '1', data: { name: 'Record 1' } },
              { id: '2', data: { name: 'Record 2' } },
            ],
          };
        },
        formatResult: (results: ComplexResult, ...args: unknown[]): string => {
          const showMetadata = args[0] as boolean | undefined;

          let output = `Found ${results.records.length} records:\n`;
          output += results.records
            .map((r) => `- ${r.id}: ${JSON.stringify(r.data)}`)
            .join('\n');

          if (showMetadata) {
            output += `\nMetadata: Total ${results.metadata.total}, Page ${results.metadata.page}`;
          }

          return output;
        },
      };

      const result: ComplexResult = {
        metadata: { total: 2, page: 1 },
        records: [
          { id: '1', data: { name: 'Record 1' } },
          { id: '2', data: { name: 'Record 2' } },
        ],
      };

      const formattedWithoutMeta = complexConfig.formatResult(result);
      expect(formattedWithoutMeta).toContain('Found 2 records:');
      expect(formattedWithoutMeta).not.toContain('Metadata:');

      const formattedWithMeta = complexConfig.formatResult(result, true);
      expect(formattedWithMeta).toContain('Found 2 records:');
      expect(formattedWithMeta).toContain('Metadata: Total 2, Page 1');
    });
  });

  describe('Type Inheritance and Compatibility', () => {
    it('should be compatible with ToolConfig base interface', () => {
      // This test ensures UniversalToolConfig properly extends ToolConfig
      interface BasicParams {
        id: string;
      }

      const config: UniversalToolConfig<BasicParams, string> = {
        name: 'inheritance-test',
        handler: async (params: BasicParams): Promise<string> => {
          return `Handled ${params.id}`;
        },
        formatResult: (results: string): string => {
          return results;
        },
      };

      // Should have the required ToolConfig properties
      expect(config.name).toBe('inheritance-test');
      expect(typeof config.handler).toBe('function');
      expect(typeof config.formatResult).toBe('function');
    });

    it('should work with union types', () => {
      type UnionResult = string | number | boolean;

      const unionConfig: UniversalToolConfig<
        Record<string, unknown>,
        UnionResult
      > = {
        name: 'union-test',
        handler: async (
          params: Record<string, unknown>
        ): Promise<UnionResult> => {
          const type = params.type as string;
          switch (type) {
            case 'string':
              return 'text';
            case 'number':
              return 42;
            case 'boolean':
              return true;
            default:
              return 'unknown';
          }
        },
        formatResult: (results: UnionResult): string => {
          return `Value: ${results} (type: ${typeof results})`;
        },
      };

      const stringResult = unionConfig.formatResult('text');
      expect(stringResult).toBe('Value: text (type: string)');

      const numberResult = unionConfig.formatResult(42);
      expect(numberResult).toBe('Value: 42 (type: number)');

      const booleanResult = unionConfig.formatResult(true);
      expect(booleanResult).toBe('Value: true (type: boolean)');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined results gracefully', () => {
      const nullConfig: UniversalToolConfig<Record<string, unknown>, null> = {
        name: 'null-test',
        handler: async (): Promise<null> => {
          return null;
        },
        formatResult: (results: null): string => {
          return results === null ? 'No data' : 'Unexpected data';
        },
      };

      const formatted = nullConfig.formatResult(null);
      expect(formatted).toBe('No data');
    });

    it('should handle empty arrays and objects', () => {
      interface EmptyTestResult {
        items: never[];
        metadata: Record<string, never>;
      }

      const emptyConfig: UniversalToolConfig<
        Record<string, unknown>,
        EmptyTestResult
      > = {
        name: 'empty-test',
        handler: async (): Promise<EmptyTestResult> => {
          return {
            items: [],
            metadata: {},
          };
        },
        formatResult: (results: EmptyTestResult): string => {
          if (results.items.length === 0) {
            return 'No items found';
          }
          return `Found ${results.items.length} items`;
        },
      };

      const result = { items: [], metadata: {} };
      const formatted = emptyConfig.formatResult(result);
      expect(formatted).toBe('No items found');
    });

    it('should handle large result sets without performance issues', () => {
      interface LargeResult {
        data: string[];
      }

      const largeConfig: UniversalToolConfig<
        Record<string, unknown>,
        LargeResult
      > = {
        name: 'large-test',
        handler: async (): Promise<LargeResult> => {
          // Create a large array
          const data = Array.from({ length: 1000 }, (_, i) => `item-${i}`);
          return { data };
        },
        formatResult: (results: LargeResult): string => {
          // Should handle large arrays efficiently
          return `Found ${results.data.length} items (showing first 3): ${results.data.slice(0, 3).join(', ')}...`;
        },
      };

      const result = {
        data: Array.from({ length: 1000 }, (_, i) => `item-${i}`),
      };
      const formatted = largeConfig.formatResult(result);

      expect(formatted).toBe(
        'Found 1000 items (showing first 3): item-0, item-1, item-2...'
      );
    });
  });
});
