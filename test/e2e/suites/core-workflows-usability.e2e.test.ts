/**
 * Core Workflows – Usability Validation (Issue #525 Phase 1)
 *
 * Validates documentation clarity, parameter intuitiveness, workflow discoverability,
 * and error message clarity from a fresh-agent perspective.
 */
import { describe, it, expect, beforeAll } from 'vitest';

import { loadE2EConfig } from '../utils/config-loader.js';
import { validateTestEnvironment } from '../utils/enhanced-tool-caller.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Core Workflows – Usability Validation', () => {
  beforeAll(async () => {
    loadE2EConfig();
    if (!env.valid) {
      // Do not fail suite – these are usability metrics, not functional gates
      // but signal in logs for visibility
       
      console.warn('⚠️  E2E environment warnings:', env.warnings);
    }
  });

  it('evaluates usability metrics with fresh-agent scenarios', async () => {
    // Basic sanity assertions
    expect(summary.results.length).toBeGreaterThan(0);
    expect(summary.averages.documentationClarity).toBeGreaterThanOrEqual(0);
    expect(summary.averages.documentationClarity).toBeLessThanOrEqual(1);

    // Log summarized metrics for reporting (non-fatal)
     
    console.error(
      '📊 Usability Metrics (Phase 1):',
      JSON.stringify(summary, null, 2)
    );

    // Export JSON/CSV for CI artifacts
     
    console.error('📝 Usability reports written:', reports);

    // Phase 2 scaffolding: compute quality gates (using placeholder E2E stats for now)
     
    console.error('🚦 Quality gate evaluation written:', gateReport);
  }, 60000);
});
