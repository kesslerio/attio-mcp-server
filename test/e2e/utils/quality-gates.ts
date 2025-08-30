/**
 * Phase 2 Scaffolding: Quality Gates & Aggregator (Issue #525)
 *
 * Provides a minimal framework for P0/P1/P2 pass-rate evaluation and a single
 * aggregator that can combine E2E stats and usability metrics into a
 * production-readiness signal. Intended to be wired into CI after iteration.
 */
import fs from 'node:fs';
import path from 'node:path';

import type { UsabilitySummary } from './usability-validators.js';

import type { UsabilitySummary } from './usability-validators.js';

export type Priority = 'P0' | 'P1' | 'P2';

export interface TestResult {
  name: string;
  passed: boolean;
}

export interface E2EStats {
  total: number;
  passed: number;
  failed: number;
}

export interface QualityGate {
  priority: Priority;
  requiredPassRate: number; // 1.0 = 100%
  testResults: TestResult[];
  productionReadiness: boolean;
}

export interface GateEvaluation {
  gates: QualityGate[];
  overallReady: boolean;
}

export function evaluateGates(gates: QualityGate[]): GateEvaluation {
      ? g.testResults.filter((t) => t.passed).length / g.testResults.length
      : 0;
    return { ...g, productionReadiness: rate >= g.requiredPassRate };
  });
  return { gates: evalGates, overallReady };
}

/**
 * Create a default set of gates from basic E2E stats and usability metrics.
 * Note: This is intentionally simple; real wiring should classify tests by P0/P1/P2.
 */
export function deriveDefaultGates(
  e2e: E2EStats,
  usability: UsabilitySummary
): QualityGate[] {
    (usability.averages.documentationClarity +
      usability.averages.parameterIntuitiveness +
      usability.averages.workflowDiscoverability +
      usability.averages.errorMessageClarity) /
    4;

  return [
    {
      priority: 'P0',
      requiredPassRate: 1.0, // critical
      testResults: [{ name: 'E2E pass-rate', passed: passRate >= 1.0 }],
      productionReadiness: false,
    },
    {
      priority: 'P1',
      requiredPassRate: 0.8,
      testResults: [
        { name: 'E2E pass-rate >= 80%', passed: passRate >= 0.8 },
        { name: 'Usability >= 0.7', passed: usabilityAvg >= 0.7 },
      ],
      productionReadiness: false,
    },
    {
      priority: 'P2',
      requiredPassRate: 0.5,
      testResults: [
        { name: 'E2E pass-rate >= 50%', passed: passRate >= 0.5 },
        { name: 'Usability >= 0.5', passed: usabilityAvg >= 0.5 },
      ],
      productionReadiness: false,
    },
  ];
}

export function writeGateReport(
  suiteName: string,
  evaluation: GateEvaluation
): string {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(evaluation, null, 2), 'utf8');
  return file;
}
