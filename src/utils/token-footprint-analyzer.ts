import fs from 'node:fs';
import path from 'node:path';
import {
  getToolsListPayload,
  getPromptsListPayload,
} from '@/utils/mcp-discovery.js';
import { countJsonTokens, getCountModel } from '@/utils/token-count.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type {
  ToolsListPayload,
  PromptsListPayload,
  PromptSummary,
} from '@/utils/mcp-discovery.js';
import { TOOL_DEFINITIONS } from '@/handlers/tools/registry.js';

export interface TokenFootprintItem {
  type: 'tool' | 'prompt';
  name: string;
  tokens: number;
  category: string;
  isHeavy: boolean;
}

export interface SectionBreakdown {
  totalTokens: number;
  count: number;
  byCategory: Record<
    string,
    {
      tokens: number;
      items: string[];
    }
  >;
  items: TokenFootprintItem[];
}

export interface TokenFootprintReport {
  timestamp: string;
  model: string;
  baselineContextLoad: {
    totalTokens: number;
    tools: SectionBreakdown;
    prompts: SectionBreakdown;
  };
  contextWindowPercentages: Record<'32k' | '128k' | '200k', number>;
  heaviestItems: TokenFootprintItem[];
  threshold: number;
}

export interface AnalyzeOptions {
  topN?: number;
  heavyThreshold?: number;
  toolsPayload?: ToolsListPayload;
  promptsPayload?: PromptsListPayload;
  model?: string;
}

const DEFAULT_THRESHOLD = 250;
const DEFAULT_TOP_N = 10;
const CONTEXT_WINDOWS: Record<'32k' | '128k' | '200k', number> = {
  '32k': 32_000,
  '128k': 128_000,
  '200k': 200_000,
};

function resolveCategoryKey(rawKey: string): string {
  if (!rawKey) {
    return 'unclassified';
  }

  return rawKey.toLowerCase();
}

function buildToolCategoryIndex(): Record<string, string> {
  const index: Record<string, string> = {};

  for (const [categoryKey, toolDefs] of Object.entries(
    TOOL_DEFINITIONS as Record<string, unknown>
  )) {
    if (!toolDefs) continue;
    const category = resolveCategoryKey(categoryKey);

    if (Array.isArray(toolDefs)) {
      for (const tool of toolDefs as Tool[]) {
        index[tool.name] = category;
      }
    } else if (typeof toolDefs === 'object') {
      for (const tool of Object.values(toolDefs as Record<string, Tool>)) {
        index[tool.name] = category;
      }
    }
  }

  return index;
}

interface CategorisedTool {
  tool: Tool;
  category: string;
}

function mapToolsToCategories(
  tools: Tool[],
  index: Record<string, string>
): CategorisedTool[] {
  return tools.map((tool) => ({
    tool,
    category: index[tool.name] ?? 'unclassified',
  }));
}

async function analyzeTools(
  toolsPayload: ToolsListPayload,
  heavyThreshold: number,
  model: string
): Promise<SectionBreakdown> {
  const categoryIndex = buildToolCategoryIndex();
  const categorised = mapToolsToCategories(toolsPayload.tools, categoryIndex);

  const categoryMap: Record<string, { tokens: number; items: string[] }> = {};
  const items: TokenFootprintItem[] = [];
  const payloadTokens = await countJsonTokens(
    { tools: toolsPayload.tools },
    model
  );

  for (const entry of categorised) {
    const tokens = await countJsonTokens(entry.tool, model);
    const category = entry.category;

    if (!categoryMap[category]) {
      categoryMap[category] = { tokens: 0, items: [] };
    }

    categoryMap[category].tokens += tokens;
    categoryMap[category].items.push(entry.tool.name);

    items.push({
      type: 'tool',
      name: entry.tool.name,
      tokens,
      category,
      isHeavy: tokens >= heavyThreshold,
    });
  }

  items.sort((a, b) => b.tokens - a.tokens || a.name.localeCompare(b.name));

  return {
    totalTokens: payloadTokens,
    count: items.length,
    byCategory: categoryMap,
    items,
  };
}

async function analyzePrompts(
  promptsPayload: PromptsListPayload,
  heavyThreshold: number,
  model: string
): Promise<SectionBreakdown> {
  const categoryMap: Record<string, { tokens: number; items: string[] }> = {};
  const items: TokenFootprintItem[] = [];
  const payloadTokens = await countJsonTokens(
    { prompts: promptsPayload.prompts },
    model
  );

  for (const prompt of promptsPayload.prompts) {
    const tokens = await countJsonTokens(prompt, model);
    const category = resolveCategoryKey(prompt.category);

    if (!categoryMap[category]) {
      categoryMap[category] = { tokens: 0, items: [] };
    }

    categoryMap[category].tokens += tokens;
    categoryMap[category].items.push(prompt.id);

    items.push({
      type: 'prompt',
      name: prompt.id,
      tokens,
      category,
      isHeavy: tokens >= heavyThreshold,
    });
  }

  items.sort((a, b) => b.tokens - a.tokens || a.name.localeCompare(b.name));

  return {
    totalTokens: payloadTokens,
    count: items.length,
    byCategory: categoryMap,
    items,
  };
}

function calculatePercentages(
  totalTokens: number
): Record<'32k' | '128k' | '200k', number> {
  const result = {
    '32k': 0,
    '128k': 0,
    '200k': 0,
  } as Record<'32k' | '128k' | '200k', number>;

  for (const [label, size] of Object.entries(CONTEXT_WINDOWS)) {
    result[label as keyof typeof result] = Number(
      ((totalTokens / size) * 100).toFixed(2)
    );
  }

  return result;
}

function selectTopItems(
  items: TokenFootprintItem[],
  topN: number
): TokenFootprintItem[] {
  return items.slice(0, topN);
}

export async function analyzeBaselineTokenFootprint(
  options: AnalyzeOptions = {}
): Promise<TokenFootprintReport> {
  const model = options.model || getCountModel();
  const heavyThreshold = options.heavyThreshold ?? DEFAULT_THRESHOLD;
  const topN = options.topN ?? DEFAULT_TOP_N;

  const toolsPayload = options.toolsPayload ?? getToolsListPayload();
  const promptsPayload = options.promptsPayload ?? getPromptsListPayload();

  const tools = await analyzeTools(toolsPayload, heavyThreshold, model);
  const prompts = await analyzePrompts(promptsPayload, heavyThreshold, model);

  const totalTokens = tools.totalTokens + prompts.totalTokens;

  const heaviestItems = selectTopItems(
    [...tools.items, ...prompts.items].sort((a, b) => b.tokens - a.tokens),
    topN
  );

  return {
    timestamp: new Date().toISOString(),
    model,
    baselineContextLoad: {
      totalTokens,
      tools,
      prompts,
    },
    contextWindowPercentages: calculatePercentages(totalTokens),
    heaviestItems,
    threshold: heavyThreshold,
  };
}

export function renderMarkdownReport(report: TokenFootprintReport): string {
  const lines: string[] = [];
  lines.push('# Attio MCP Token Footprint Report');
  lines.push('');
  lines.push(`Generated: ${report.timestamp}`);
  lines.push(`Model: ${report.model}`);
  lines.push('');
  lines.push('## Baseline Context Load');
  lines.push('');
  const total = report.baselineContextLoad.totalTokens;
  const toolTotal = report.baselineContextLoad.tools.totalTokens;
  const promptTotal = report.baselineContextLoad.prompts.totalTokens;

  lines.push(`- Total tokens: ${total}`);
  lines.push(`- Tools: ${toolTotal}`);
  lines.push(`- Prompts: ${promptTotal}`);
  lines.push('');

  lines.push('### Context Window Impact');
  lines.push('');
  for (const [label, percentage] of Object.entries(
    report.contextWindowPercentages
  )) {
    lines.push(`- ${label}: ${percentage}%`);
  }
  lines.push('');

  lines.push('### Tools by Category');
  lines.push('');
  lines.push('| Category | Tokens | Tool Count |');
  lines.push('|----------|--------|------------|');
  for (const [category, data] of Object.entries(
    report.baselineContextLoad.tools.byCategory
  )) {
    lines.push(`| ${category} | ${data.tokens} | ${data.items.length} |`);
  }
  lines.push('');

  lines.push('### Prompts by Category');
  lines.push('');
  lines.push('| Category | Tokens | Prompt Count |');
  lines.push('|----------|--------|--------------|');
  for (const [category, data] of Object.entries(
    report.baselineContextLoad.prompts.byCategory
  )) {
    lines.push(`| ${category} | ${data.tokens} | ${data.items.length} |`);
  }
  lines.push('');

  lines.push('### Top Heavy Items');
  lines.push('');
  lines.push('| Type | Name | Tokens | Category | Flagged |');
  lines.push('|------|------|--------|----------|---------|');
  for (const item of report.heaviestItems) {
    lines.push(
      `| ${item.type} | ${item.name} | ${item.tokens} | ${item.category} | ${item.isHeavy ? '⚠️' : ''} |`
    );
  }

  return lines.join('\n');
}

export interface ReportFilePaths {
  jsonPath: string;
  markdownPath: string;
}

export function writeReportFiles(
  report: TokenFootprintReport,
  directory: string = '/tmp'
): ReportFilePaths {
  const timestamp = report.timestamp.replace(/[:.]/g, '-');
  const baseName = `attio-mcp-token-footprint-${timestamp}`;
  const jsonPath = path.join(directory, `${baseName}.json`);
  const markdownPath = path.join(directory, `${baseName}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(markdownPath, renderMarkdownReport(report), 'utf8');

  return { jsonPath, markdownPath };
}

export function formatConsoleSummary(
  report: TokenFootprintReport,
  maxItems: number = 5
): string {
  const lines: string[] = [];
  const { totalTokens, tools, prompts } = report.baselineContextLoad;

  lines.push('');
  lines.push('Attio MCP Baseline Token Footprint');
  lines.push('----------------------------------');
  lines.push(`Total tokens: ${totalTokens}`);
  lines.push(
    `Tools: ${tools.totalTokens} tokens across ${tools.count} definitions`
  );
  lines.push(
    `Prompts: ${prompts.totalTokens} tokens across ${prompts.count} definitions`
  );
  lines.push('');
  lines.push('Context window impact:');
  for (const [label, percentage] of Object.entries(
    report.contextWindowPercentages
  )) {
    lines.push(`  - ${label}: ${percentage}%`);
  }
  lines.push('');
  lines.push('Top items:');
  for (const item of report.heaviestItems.slice(0, maxItems)) {
    const flag = item.isHeavy ? ' ⚠️' : '';
    lines.push(
      `  - ${item.type} :: ${item.name} :: ${item.tokens} tokens (category: ${item.category})${flag}`
    );
  }

  return lines.join('\n');
}

// Helper exposed for unit testing with fixtures
export async function buildPromptSummary(
  prompts: PromptSummary[],
  heavyThreshold: number,
  model: string
): Promise<SectionBreakdown> {
  return analyzePrompts({ prompts }, heavyThreshold, model);
}
