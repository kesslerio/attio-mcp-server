import { describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

type Job = {
  if: string;
  needs: string[];
  outputs?: Record<string, string>;
  steps: {
    name: string;
    run?: string;
    env?: Record<string, string>;
    with?: { script: string };
  }[];
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

  it.each([
    ['missing key', 'failure', 'skipped'],
    ['fork', 'success', 'skipped'],
    ['unselected', 'skipped', 'skipped'],
    ['passed run', 'success', 'success'],
    ['failed run', 'success', 'failure'],
  ])('reports %s integration verification in emitted comments', async (
    _scenario,
    prerequisiteResult,
    integrationResult
  ) => {
    const summary = workflow.jobs['smart-summary'];
    expect(summary.needs).toContain('integration-prerequisites');
    expect(summary.needs).toContain('integration-tests');
    const script = summary.steps.find(
      (step) => step.name === 'Create smart summary'
    )!.with!.script;
    const expressions: Record<string, string> = {
      'needs.change-analysis.outputs.test-strategy': 'full',
      'needs.change-analysis.outputs.docs-only': 'false',
      'needs.lint-and-typecheck.result': 'success',
      'needs.smart-tests.result': 'success',
      'needs.build-verification-status.result': 'success',
      'needs.integration-prerequisites.result': prerequisiteResult,
      'needs.integration-tests.result': integrationResult,
    };
    const executable = script.replace(/\$\{\{\s*(.*?)\s*\}\}/g, (_, expression) => {
      if (!(expression in expressions)) {
        throw new Error(`Missing synthetic workflow input: ${expression}`);
      }
      return expressions[expression];
    });

    for (const existingComment of [false, true]) {
      const writes: { method: string; request: Record<string, unknown> }[] = [];
      const github = {
        rest: {
          issues: {
            listComments: async () => ({
              data: existingComment
                ? [{ id: 42, user: { type: 'Bot' }, body: '# 🧠 Smart CI Results' }]
                : [],
            }),
            createComment: async (request: Record<string, unknown>) => {
              writes.push({ method: 'create', request });
            },
            updateComment: async (request: Record<string, unknown>) => {
              writes.push({ method: 'update', request });
            },
          },
        },
      };
      await runInNewContext(`(async () => {\n${executable}\n})()`, {
        github,
        context: { repo: { owner: 'test-owner', repo: 'test-repo' }, issue: { number: 7 } },
      }, { timeout: 1000 });
      expect(writes).toHaveLength(1);
      expect(writes[0].method).toBe(existingComment ? 'update' : 'create');
      expect(writes[0].request).toMatchObject({
        owner: 'test-owner',
        repo: 'test-repo',
        ...(existingComment ? { comment_id: 42 } : { issue_number: 7 }),
      });
      const body = writes[0].request.body as string;
      expect(body).toContain(`**Integration Prerequisites**: ${prerequisiteResult}`);
      expect(body).toContain(`**Integration Tests**: ${integrationResult}`);
      const unavailable = 'Real API integration tests were not exercised (not selected or verification unavailable).';
      if (integrationResult === 'skipped') {
        expect(body).toContain(unavailable);
        expect(body).not.toContain('✅ **Integration Tests**');
      } else {
        expect(body).not.toContain(unavailable);
        expect(body).toContain(`${integrationResult === 'success' ? '✅' : '❌'} **Integration Tests**`);
      }
    }
  });
});
