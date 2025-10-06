import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { countJsonTokens } from '@/utils/token-count.js';
import {
  analyzeBaselineTokenFootprint,
  renderMarkdownReport,
  writeReportFiles,
  formatConsoleSummary,
} from '@/utils/token-footprint-analyzer.js';
import type {
  ToolsListPayload,
  PromptsListPayload,
} from '@/utils/mcp-discovery.js';

const FIXTURE_TOOLS: ToolsListPayload = {
  tools: [
    {
      name: 'fixture-tool-one',
      description: 'Example tool that demonstrates counting.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
      },
      annotations: {
        idempotentHint: true,
      },
    },
    {
      name: 'fixture-tool-two',
      description: 'Example tool with two properties.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          offset: { type: 'number' },
        },
      },
    },
  ],
};

const FIXTURE_PROMPTS: PromptsListPayload = {
  prompts: [
    {
      id: 'prompt-one.v1',
      name: 'Prompt One',
      description: 'First prompt used for validation.',
      category: 'testing',
    },
    {
      id: 'prompt-two.v1',
      name: 'Prompt Two',
      description: 'Second prompt used for validation.',
      category: 'testing',
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('token footprint analyzer', () => {
  it('analyzes baseline payloads with deterministic totals', async () => {
    const report = await analyzeBaselineTokenFootprint({
      toolsPayload: FIXTURE_TOOLS,
      promptsPayload: FIXTURE_PROMPTS,
      heavyThreshold: 10,
      topN: 3,
    });

    const expectedToolsTokens = await countJsonTokens({
      tools: FIXTURE_TOOLS.tools,
    });
    const expectedPromptsTokens = await countJsonTokens({
      prompts: FIXTURE_PROMPTS.prompts,
    });

    expect(report.baselineContextLoad.tools.totalTokens).toBe(
      expectedToolsTokens
    );
    expect(report.baselineContextLoad.prompts.totalTokens).toBe(
      expectedPromptsTokens
    );
    expect(report.baselineContextLoad.totalTokens).toBe(
      expectedToolsTokens + expectedPromptsTokens
    );
    expect(report.baselineContextLoad.tools.count).toBe(
      FIXTURE_TOOLS.tools.length
    );
    expect(report.baselineContextLoad.prompts.count).toBe(
      FIXTURE_PROMPTS.prompts.length
    );
    expect(report.heaviestItems.length).toBeLessThanOrEqual(3);
  });

  it('renders markdown with key sections', async () => {
    const report = await analyzeBaselineTokenFootprint({
      toolsPayload: FIXTURE_TOOLS,
      promptsPayload: FIXTURE_PROMPTS,
      heavyThreshold: 10,
      topN: 2,
    });

    const markdown = renderMarkdownReport(report);
    expect(markdown).toContain('# Attio MCP Token Footprint Report');
    expect(markdown).toContain('### Top Heavy Items');
    expect(markdown).toContain('fixture-tool-one');
    expect(markdown).toContain('| Category | Tokens | Prompt Count |');
  });

  it('writes reports to disk and outputs console summary', async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'token-footprint-test-')
    );

    const report = await analyzeBaselineTokenFootprint({
      toolsPayload: FIXTURE_TOOLS,
      promptsPayload: FIXTURE_PROMPTS,
    });

    const { jsonPath, markdownPath } = writeReportFiles(report, tmpDir);

    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(markdownPath)).toBe(true);

    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(parsed.baselineContextLoad.totalTokens).toBe(
      report.baselineContextLoad.totalTokens
    );

    const summary = formatConsoleSummary(report);
    expect(summary).toContain('Total tokens');
    expect(summary).toContain('Context window impact');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
