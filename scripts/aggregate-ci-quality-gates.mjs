#!/usr/bin/env node
/**
 * Aggregate Vitest results + usability metrics to produce CI quality gates.
 *
 * Usage examples:
 *   vitest --run --reporter=json > vitest-report.json || true
 *   node scripts/aggregate-ci-quality-gates.mjs \
 *     --vitest-json vitest-report.json \
 *     --suite core-workflows \
 *     --usability-json test/e2e/outputs/core-workflows-usability-<timestamp>.json \
 *     --enforce
 *
 * If --usability-json is omitted, the script will try to pick the latest
 * *-usability-*.json file from test/e2e/outputs.
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = { enforce: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--vitest-json') out.vitestJson = argv[++i];
    else if (a === '--usability-json') out.usabilityJson = argv[++i];
    else if (a === '--suite') out.suite = argv[++i];
    else if (a === '--enforce') out.enforce = true;
  }
  return out;
}

function loadJsonSafe(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function detectLatestUsabilityJson(dir = 'test/e2e/outputs') {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.includes('-usability-') && f.endsWith('.json'))
    .map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0] || null;
}

function extractE2EStatsFromVitest(jsonData) {
  // Tolerant extraction across possible reporter shapes
  let total = 0;
  let passed = 0;
  let failed = 0;

  if (!jsonData) return { total, passed, failed };

  // Vitest summary-like shapes
  if (jsonData.numTotalTests !== undefined) total = jsonData.numTotalTests;
  if (jsonData.numPassedTests !== undefined) passed = jsonData.numPassedTests;
  if (jsonData.numFailedTests !== undefined) failed = jsonData.numFailedTests;

  // Alternative stats property
  if (jsonData.stats) {
    total = jsonData.stats.tests ?? total;
    passed = jsonData.stats.passes ?? passed;
    failed = jsonData.stats.failures ?? failed;
  }

  // Jest-like testResults array
  if (Array.isArray(jsonData.testResults)) {
    total = 0;
    passed = 0;
    failed = 0;
    for (const tr of jsonData.testResults) {
      const assertions = tr.assertionResults || [];
      for (const a of assertions) {
        total++;
        if (a.status === 'passed') passed++;
        else if (a.status === 'failed') failed++;
      }
    }
  }

  // Events array (fallback): try to count tests with status
  if (Array.isArray(jsonData.events) && total === 0) {
    for (const e of jsonData.events) {
      if (e.type === 'test' && e.state) {
        total++;
        if (e.state === 'pass') passed++;
        else if (e.state === 'fail') failed++;
      }
    }
  }

  // Derived fallback
  if (total === 0 && passed + failed > 0) {
    total = passed + failed;
  }
  return { total, passed, failed };
}

function loadUsabilitySummary(file) {
  const json = loadJsonSafe(file);
  if (!json || !json.averages) return null;
  return json;
}

function evaluateGates(e2e, usability) {
  const passRate = e2e.total ? e2e.passed / e2e.total : 0;
  const u = usability.averages;
  const usabilityAvg = (u.documentationClarity + u.parameterIntuitiveness + u.workflowDiscoverability + u.errorMessageClarity) / 4;

  const gates = [
    {
      priority: 'P0',
      requiredPassRate: 1.0,
      testResults: [{ name: 'E2E pass-rate = 100%', passed: passRate >= 1.0 }],
    },
    {
      priority: 'P1',
      requiredPassRate: 0.8,
      testResults: [
        { name: 'E2E pass-rate >= 80%', passed: passRate >= 0.8 },
        { name: 'Usability >= 0.7', passed: usabilityAvg >= 0.7 },
      ],
    },
    {
      priority: 'P2',
      requiredPassRate: 0.5,
      testResults: [
        { name: 'E2E pass-rate >= 50%', passed: passRate >= 0.5 },
        { name: 'Usability >= 0.5', passed: usabilityAvg >= 0.5 },
      ],
    },
  ];

  const evaluated = gates.map((g) => {
    const rate = g.testResults.filter((t) => t.passed).length / g.testResults.length;
    return { ...g, productionReadiness: rate >= g.requiredPassRate };
  });
  const overallReady = evaluated.every((g) => g.productionReadiness);
  return { gates: evaluated, overallReady, passRate, usabilityAvg };
}

function writeReport(suiteName, evaluation) {
  const outDir = path.resolve('test/e2e/outputs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(outDir, `${suiteName || 'ci'}-quality-gates-${ts}.json`);
  fs.writeFileSync(file, JSON.stringify(evaluation, null, 2), 'utf8');
  return file;
}

async function main() {
  const args = parseArgs(process.argv);
  const suiteName = args.suite || 'core-workflows';

  if (!args.vitestJson || !fs.existsSync(args.vitestJson)) {
    console.error(`⚠️  Vitest JSON report not found: ${args.vitestJson || '(none)'}\n   Tip: run: vitest --run --reporter=json > vitest-report.json`);
  }
  const vitestJson = loadJsonSafe(args.vitestJson);
  const e2eStats = extractE2EStatsFromVitest(vitestJson);

  let usabilityPath = args.usabilityJson;
  if (!usabilityPath) usabilityPath = detectLatestUsabilityJson();
  if (!usabilityPath || !fs.existsSync(usabilityPath)) {
    console.error(`⚠️  Usability summary not found. Looked for: ${usabilityPath || 'latest in test/e2e/outputs'}`);
    process.exitCode = 0; // do not fail CI for missing artifacts at this stage
    return;
  }

  const usability = loadUsabilitySummary(usabilityPath);
  if (!usability) {
    console.error(`⚠️  Failed to parse usability summary at ${usabilityPath}`);
    process.exitCode = 0;
    return;
  }

  const evaluation = evaluateGates(e2eStats, usability);
  const reportPath = writeReport(suiteName, evaluation);
  console.error('🚦 Quality gates evaluation:', JSON.stringify({ e2eStats, reportPath, overallReady: evaluation.overallReady }, null, 2));

  if (args.enforce || process.env.ENFORCE_GATES === 'true') {
    if (!evaluation.overallReady) {
      console.error('❌ Quality gates not met. Failing CI due to --enforce.');
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error('❌ aggregate-ci-quality-gates error:', e);
  process.exit(1);
});

