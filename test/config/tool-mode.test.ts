import { describe, it, expect, afterEach } from 'vitest';
import {
  filterAllowedTools,
  isSearchOnlyMode,
  isToolAllowed,
} from '@/config/tool-mode.js';

const originalMode = process.env.ATTIO_MCP_TOOL_MODE;

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.ATTIO_MCP_TOOL_MODE;
  } else {
    process.env.ATTIO_MCP_TOOL_MODE = originalMode;
  }
});

describe('tool mode configuration', () => {
  it('returns false for search-only mode by default', () => {
    delete process.env.ATTIO_MCP_TOOL_MODE;
    expect(isSearchOnlyMode()).toBe(false);
  });

  it('filters tools when ATTIO_MCP_TOOL_MODE=search', () => {
    process.env.ATTIO_MCP_TOOL_MODE = 'search';

    expect(isSearchOnlyMode()).toBe(true);
    expect(isToolAllowed('search')).toBe(true);
    expect(isToolAllowed('create-record')).toBe(false);

    const filtered = filterAllowedTools([
      { name: 'search' },
      { name: 'create-record' },
      { name: 'fetch' },
    ]);

    expect(filtered.map((tool) => tool.name)).toEqual(['search', 'fetch']);
  });
});
