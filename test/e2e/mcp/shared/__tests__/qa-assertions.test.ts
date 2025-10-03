import { describe, it, expect } from 'vitest';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';

import { QAAssertions } from '../qa-assertions';

const createToolResult = (text: string, isError: boolean = false): ToolResult =>
  ({
    content: [
      {
        type: 'text',
        text,
      },
    ],
    isError,
  }) as ToolResult;

describe('QAAssertions.assertBatchOperationSuccess', () => {
  it('passes for successful batch create summary', () => {
    const result = createToolResult(
      'Batch create completed: 3 successful, 0 failed\n\nSuccessful operations:\n1. Acme (ID: 1)'
    );

    expect(() =>
      QAAssertions.assertBatchOperationSuccess(result, 'create', 3)
    ).not.toThrow();
  });

  it('passes when summary names the resource instead of operation', () => {
    const result = createToolResult(
      'Batch companies completed: 2 successful, 0 failed\n\nSuccessful operations:\n1. Foo (ID: 1)'
    );

    expect(() =>
      QAAssertions.assertBatchOperationSuccess(result, 'search', 2)
    ).not.toThrow();
  });

  it('rejects when success count differs from expected', () => {
    const result = createToolResult(
      'Batch update completed: 2 successful, 0 failed'
    );

    expect(() =>
      QAAssertions.assertBatchOperationSuccess(result, 'update', 3)
    ).toThrow();
  });

  it('rejects when failures are reported', () => {
    const result = createToolResult(
      'Batch search completed: 2 successful, 1 failed\n\nFailed searches:\n1. Query: "missing" - Error: Not found'
    );

    expect(() =>
      QAAssertions.assertBatchOperationSuccess(result, 'search', 2)
    ).toThrow();
  });

  it('rejects when summary is missing', () => {
    const result = createToolResult('Unexpected response payload');

    expect(() =>
      QAAssertions.assertBatchOperationSuccess(result, 'operation', 1)
    ).toThrow(/Missing batch summary/i);
  });
});
