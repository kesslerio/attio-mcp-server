import { describe, it, expect, afterEach } from 'vitest';
import { findToolConfig } from '@/handlers/tools/registry.js';

const originalMode = process.env.ATTIO_MCP_TOOL_MODE;

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.ATTIO_MCP_TOOL_MODE;
  } else {
    process.env.ATTIO_MCP_TOOL_MODE = originalMode;
  }
});

describe('findToolConfig in search-only mode', () => {
  it('returns undefined for write tools when in search-only mode', () => {
    process.env.ATTIO_MCP_TOOL_MODE = 'search';

    expect(findToolConfig('create-record')).toBeUndefined();
    expect(findToolConfig('search')).toBeDefined();
  });
});
