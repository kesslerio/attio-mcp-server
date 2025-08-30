/**
 * Usability Testing Framework (Phase 1 of Issue #525)
 *
 * Provides fresh-agent style validations around:
 * - Documentation clarity (error/help text usefulness)
 * - Parameter intuitiveness (missing/invalid param messaging)
 * - Workflow discoverability (reasonable defaults and mappings)
 * - Error message clarity (actionable, consistent wording)
 */
import fs from 'node:fs';
import path from 'node:path';

import { callUniversalTool, callTasksTool } from './enhanced-tool-caller.js';
import type { McpToolResponse } from './assertions.js';

import { callUniversalTool, callTasksTool } from './enhanced-tool-caller.js';
import type { McpToolResponse } from './assertions.js';

export interface UsabilityTestResult {
  scenario: string;
  freshAgentPerspective: boolean;
  documentationClarity: number; // 0..1
  parameterIntuitiveness: number; // 0..1
  workflowDiscoverability: number; // 0..1
  errorMessageClarity: number; // 0..1
  notes?: string;
}

export interface UsabilitySummary {
  results: UsabilityTestResult[];
  averages: {
    documentationClarity: number;
    parameterIntuitiveness: number;
    workflowDiscoverability: number;
    errorMessageClarity: number;
  };
}

function scoreBoolean(ok: boolean): number {
  return ok ? 1 : 0;
}

function includesAny(text: string | undefined, patterns: RegExp[]): boolean {
  if (!text) return false;
  return patterns.some((re) => re.test(text));
}

/**
 * Run a minimal set of usability checks that do not require prior internal knowledge.
 */
export async function runUsabilityChecks(): Promise<UsabilitySummary> {
  const results: UsabilityTestResult[] = [];

  // 1) Invalid resource_type should suggest valid types (documentation clarity, parameter intuitiveness)
  {
      resource_type: 'invalid_resource_type_12345',
      query: 'test',
      limit: 1,
    })) as McpToolResponse;

      /Must be one of: .*records, .*lists, .*people, .*companies, .*tasks, .*deals, .*notes/i.test(
        String(msg)
      );
    results.push({
      scenario: 'Invalid resource_type lists valid options',
      freshAgentPerspective: true,
      documentationClarity: scoreBoolean(mentionsValidTypes),
      parameterIntuitiveness: scoreBoolean(mentionsValidTypes),
      workflowDiscoverability: 0.5, // partial – error guides a user toward discovery
      errorMessageClarity: scoreBoolean(
        /Invalid resource_type/i.test(String(msg))
      ),
      notes: typeof msg === 'string' ? msg.slice(0, 200) : undefined,
    });
  }

  // 2) Missing required parameter (e.g., people.create without email)
  {
      resource_type: 'people',
      record_data: { name: 'Only Name' },
    })) as McpToolResponse;

      /missing required parameter/i,
      /email_addresses/i,
      /required/i,
    ]);
    results.push({
      scenario: 'Create person missing email hints requirement',
      freshAgentPerspective: true,
      documentationClarity: scoreBoolean(mentionsMissing),
      parameterIntuitiveness: scoreBoolean(mentionsMissing),
      workflowDiscoverability: 0.4,
      errorMessageClarity: scoreBoolean(/failed|missing/i.test(msg)),
      notes: msg.slice(0, 200),
    });
  }

  // 3) Task title maps to content on create (discoverability)
  {
      resource_type: 'tasks',
      record_data: { title: 'Quick Task' },
    })) as McpToolResponse;

    results.push({
      scenario: 'Task title accepted (maps to content)',
      freshAgentPerspective: true,
      documentationClarity: 0.5,
      parameterIntuitiveness: scoreBoolean(ok),
      workflowDiscoverability: scoreBoolean(ok),
      errorMessageClarity: ok ? 1 : 0,
    });
  }

  // 4) Invalid record id clarity
  {
      resource_type: 'companies',
      record_id: 'definitely-not-a-uuid',
    })) as McpToolResponse;
      /invalid record identifier format/i,
      /record not found|not found/i,
    ]);
    results.push({
      scenario: 'Invalid record_id returns clear error',
      freshAgentPerspective: true,
      documentationClarity: scoreBoolean(clear),
      parameterIntuitiveness: scoreBoolean(clear),
      workflowDiscoverability: 0.3,
      errorMessageClarity: scoreBoolean(clear),
      notes: msg.slice(0, 200),
    });
  }

  // 5) Unknown field name provides suggestions (companies.create with 'nam')
  {
      resource_type: 'companies',
      record_data: { nam: 'Acme Inc.' } as any,
    })) as McpToolResponse;
      /did you mean/i,
      /name/i,
      /unknown field/i,
    ]);
    results.push({
      scenario: "Unknown field 'nam' suggests 'name'",
      freshAgentPerspective: true,
      documentationClarity: scoreBoolean(suggests),
      parameterIntuitiveness: scoreBoolean(suggests),
      workflowDiscoverability: 0.3,
      errorMessageClarity: scoreBoolean(suggests),
      notes: msg.slice(0, 200),
    });
  }

  // 6) Partial field 'domain' is accepted or mapped (companies.create)
  {
      resource_type: 'companies',
      record_data: { name: 'Acme', domain: 'acme.com' } as any,
    })) as McpToolResponse;
      /domain/i,
      /domains/i,
      /mapped/i,
      /invalid/i,
    ]);
    results.push({
      scenario: "Field 'domain' discoverability (maps to 'domains')",
      freshAgentPerspective: true,
      documentationClarity: ok ? 0.6 : scoreBoolean(informative),
      parameterIntuitiveness: ok ? 1 : scoreBoolean(informative),
      workflowDiscoverability: ok ? 1 : 0.5,
      errorMessageClarity: ok ? 1 : scoreBoolean(informative),
      notes: ok ? 'accepted' : msg.slice(0, 200),
    });
  }

  // Aggregate
    results.reduce((s, r) => s + (r[k] as number), 0) / results.length;

  return {
    results,
    averages: {
      documentationClarity: avg('documentationClarity'),
      parameterIntuitiveness: avg('parameterIntuitiveness'),
      workflowDiscoverability: avg('workflowDiscoverability'),
      errorMessageClarity: avg('errorMessageClarity'),
    },
  };
}

export function writeUsabilityReports(
  suiteName: string,
  summary: UsabilitySummary
): { jsonPath: string; csvPath: string } {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // JSON
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8');

  // CSV
    'scenario',
    'freshAgentPerspective',
    'documentationClarity',
    'parameterIntuitiveness',
    'workflowDiscoverability',
    'errorMessageClarity',
  ];
  for (const r of summary.results) {
    lines.push(
      [
        JSON.stringify(r.scenario),
        r.freshAgentPerspective ? '1' : '0',
        r.documentationClarity.toFixed(2),
        r.parameterIntuitiveness.toFixed(2),
        r.workflowDiscoverability.toFixed(2),
        r.errorMessageClarity.toFixed(2),
      ].join(',')
    );
  }
  fs.writeFileSync(csvPath, lines.join('\n'), 'utf8');

  return { jsonPath, csvPath };
}
