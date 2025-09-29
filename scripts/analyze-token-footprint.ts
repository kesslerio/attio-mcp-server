#!/usr/bin/env node
import {
  analyzeBaselineTokenFootprint,
  writeReportFiles,
  formatConsoleSummary,
} from '../src/utils/token-footprint-analyzer.js';

function parseEnvInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function run(): void {
  const heavyThreshold = parseEnvInt(
    process.env.TOKEN_FOOTPRINT_THRESHOLD,
    250
  );
  const topN = parseEnvInt(process.env.TOKEN_FOOTPRINT_TOP_N, 10);

  const report = analyzeBaselineTokenFootprint({
    heavyThreshold,
    topN,
  });
  const { jsonPath, markdownPath } = writeReportFiles(report);

  console.log(formatConsoleSummary(report));
  console.log('');
  console.log('Detailed reports:');
  console.log(`  • ${jsonPath}`);
  console.log(`  • ${markdownPath}`);
}

run();
