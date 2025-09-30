#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { getToolsListPayload } from '@/utils/mcp-discovery.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

function normaliseTool(tool: Tool): Tool {
  const clone = structuredClone(tool) as Tool;
  // Sort properties for determinism in snapshots
  if (clone.inputSchema && typeof clone.inputSchema === 'object') {
    const schema = clone.inputSchema as Record<string, unknown>;
    if (schema && typeof schema.properties === 'object') {
      const entries = Object.entries(
        schema.properties as Record<string, unknown>
      );
      entries.sort(([a], [b]) => a.localeCompare(b));
      schema.properties = Object.fromEntries(entries);
    }
  }
  return clone;
}

function main(): void {
  const destination =
    process.argv[2] ?? path.resolve('docs/tools/tool-discovery-baseline.json');

  const payload = getToolsListPayload();
  const tools = [...payload.tools];
  tools.sort((a, b) => a.name.localeCompare(b.name));

  const normalised = tools.map(normaliseTool);
  const data = {
    generatedAt: new Date().toISOString(),
    toolCount: tools.length,
    tools: normalised,
  };

  fs.writeFileSync(destination, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`✅ Snapshot written to ${destination}`);
}

main();
