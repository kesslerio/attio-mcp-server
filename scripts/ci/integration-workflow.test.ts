import { describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Job = {
  if: string;
  needs: string[];
  outputs?: Record<string, string>;
  steps: { name: string; run?: string; env?: Record<string, string> }[];
};
const workflow = Bun.YAML.parse(
  readFileSync('.github/workflows/smart-ci.yml', 'utf8')
) as { on: Record<string, unknown>; jobs: Record<string, Job> };
const prerequisite = workflow.jobs['integration-prerequisites'];
const integration = workflow.jobs['integration-tests'];

function runPrerequisite(untrusted: boolean, key: string) {
  const directory = mkdtempSync(join(tmpdir(), 'integration-prerequisite-'));
  const output = join(directory, 'output');
  const summary = join(directory, 'summary');
  writeFileSync(output, '');
  writeFileSync(summary, '');
  try {
    const step = prerequisite.steps.find(
      (entry) => entry.name === 'Check integration availability'
    );
    expect(step?.run).toBeDefined();
    const result = spawnSync('bash', ['-e', '-c', step!.run!], {
      env: {
        PATH: '/usr/bin:/bin',
        UNTRUSTED_FORK: String(untrusted),
        ATTIO_API_KEY: key,
        GITHUB_OUTPUT: output,
        GITHUB_STEP_SUMMARY: summary,
      },
      encoding: 'utf8',
      timeout: 5000,
    });
    return {
      status: result.status,
      output: readFileSync(output, 'utf8'),
      summary: readFileSync(summary, 'utf8'),
      log: result.stdout + result.stderr,
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('integration workflow credential boundary', () => {
  it('fails selected trusted verification when its key is missing', () => {
    const result = runPrerequisite(false, '');
    expect(result.status).toBe(1);
    expect(result.output).not.toContain('available=true');
    expect(result.summary).toContain('unavailable');
    expect(result.log).toContain('::error::');
    expect(result.log).toContain('ATTIO_TEST_API_KEY');
  });

  it('allows a trusted synthetic key without exposing it or claiming coverage', () => {
    const key = 'synthetic-not-a-secret';
    const result = runPrerequisite(false, key);
    expect(result.status).toBe(0);
    expect(result.output).toContain('available=true');
    expect(result.summary + result.log + result.output).not.toContain(key);
    expect(result.summary).not.toMatch(/passed|coverage/i);
  });

  it.each(['', 'synthetic-not-a-secret'])(
    'denies fork execution even if a key is supplied (%s)',
    (key) => {
      const result = runPrerequisite(true, key);
      expect(result.status).toBe(0);
      expect(result.output).toContain('available=false');
      expect(result.output).not.toContain('available=true');
      expect(result.summary).toContain('untrusted fork');
      expect(result.summary).toContain('not exercised');
      if (key) expect(result.summary + result.log).not.toContain(key);
    }
  );

  it('keeps the existing selection and withholds secrets from forks before checkout', () => {
    expect(workflow.on).not.toHaveProperty('pull_request_target');
    expect(prerequisite.if.trim()).toBe(
      "needs.change-analysis.outputs.needs-integration == 'true' ||\n" +
        "contains(github.event.pull_request.labels.*.name, 'run-integration-tests')"
    );
    expect(prerequisite.steps).toHaveLength(1);
    expect(prerequisite.outputs?.available).toBe(
      '${{ steps.availability.outputs.available }}'
    );
    const env = prerequisite.steps[0].env!;
    expect(env.UNTRUSTED_FORK).toBe(
      "${{ github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name != github.repository }}"
    );
    expect(env.ATTIO_API_KEY).toBe(
      "${{ (github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository) && secrets.ATTIO_TEST_API_KEY || '' }}"
    );
    expect(integration.needs).toEqual(['integration-prerequisites']);
    expect(integration.if).toBe(
      "needs.integration-prerequisites.outputs.available == 'true'"
    );
  });

  it('runs the integration command and propagates failures after admission', () => {
    const step = integration.steps.find(
      (entry) => entry.name === 'Run integration tests'
    )!;
    expect(step.env?.ATTIO_API_KEY).toBe('${{ secrets.ATTIO_TEST_API_KEY }}');
    for (const code of [0, 23]) {
      const result = spawnSync(
        'bash',
        [
          '-e',
          '-c',
          `bun() { echo "called:$*"; return ${code}; }\n${step.run}`,
        ],
        { env: { PATH: '/usr/bin:/bin' }, encoding: 'utf8', timeout: 5000 }
      );
      expect(result.stdout).toContain('called:run test:integration');
      expect(result.status).toBe(code);
    }
  });

  it('includes unavailable integration verification in the CI summary', () => {
    const summary = workflow.jobs['smart-summary'];
    expect(summary.needs).toContain('integration-prerequisites');
    expect(summary.needs).toContain('integration-tests');
    const source = readFileSync('.github/workflows/smart-ci.yml', 'utf8');
    expect(source).toContain('Real API integration tests were not exercised');
    expect(source).toContain("'${{ needs.integration-tests.result }}'");
  });
});
