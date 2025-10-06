import { describe, it, expect, afterEach } from 'vitest';

import {
  countTokens,
  countJsonTokens,
  countStrings,
  getCountModel,
} from '@/utils/token-count.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('token-count utilities', () => {
  it('counts tokens for simple strings deterministically', async () => {
    expect(await countTokens('')).toBe(0);
    expect(await countTokens('Hello world')).toBe(2);
    expect(await countTokens('Attio MCP server')).toBe(4);
  });

  it('counts JSON structures using serialization', async () => {
    const payload = { foo: 'bar', count: 3 };
    const expected = await countTokens(JSON.stringify(payload));
    expect(await countJsonTokens(payload)).toBe(expected);
  });

  it('counts joined strings consistently', async () => {
    const values = ['alpha', 'beta', 'gamma'];
    const direct = await countTokens(values.join('\n'));
    expect(await countStrings(values)).toBe(direct);
  });

  it('honors COUNT_MODEL_DEFAULT environment override', () => {
    process.env.COUNT_MODEL_DEFAULT = 'custom-model';
    expect(getCountModel()).toBe('custom-model');
  });
});
