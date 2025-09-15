#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

function countWarnings(eslintJson) {
  let warnings = 0;
  for (const file of eslintJson) {
    for (const msg of file.messages) {
      if (msg.severity === 1) warnings++;
    }
  }
  return warnings;
}

try {
  const tmp = path.join(process.cwd(), '.lint-src.json');
  // Write output directly to file to avoid large stdout buffers
  execFileSync('npx', ['eslint', '-f', 'json', '-o', tmp, 'src/**/*.ts'], {
    stdio: 'inherit',
    maxBuffer: 1024 * 1024 * 128,
  });
  const report = JSON.parse(readFileSync(tmp, 'utf8'));
  const current = countWarnings(report);

  const baselinePath = path.join(process.cwd(), '.github/lint-baseline.json');
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const allowed = Number(
    process.env.LINT_SRC_BASELINE || baseline.srcWarnings || 0
  );

  // Allow a small slack if provided (e.g., LINT_SRC_SLACK=5)
  const slack = Number(process.env.LINT_SRC_SLACK || 0);
  const limit = allowed + slack;

  if (current > limit) {
    console.error(
      `❌ Lint warnings increased in src: current=${current} > limit=${limit} (baseline=${allowed}, slack=${slack})`
    );
    process.exit(1);
  }
  console.log(
    `✅ Lint warnings check: current=${current} <= limit=${limit} (baseline=${allowed}, slack=${slack})`
  );
} catch (e) {
  console.error('Lint warning guard failed:', e?.message || e);
  process.exit(1);
}
