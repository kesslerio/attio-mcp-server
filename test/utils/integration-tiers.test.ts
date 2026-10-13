import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import smoke from '../../configs/vitest/vitest.config.integration-smoke.ts';
import full from '../../configs/vitest/vitest.config.integration.ts';
import mocked from '../../configs/vitest/vitest.config.smoke.ts';

describe('integration tier discovery contract', () => {
  it('selects exactly five live cases without the deterministic rate-limit test', () => {
    const selected: string[] = [];
    for (const file of smoke.test!.include!) {
      const source = readFileSync(resolve(file), 'utf8');
      for (const match of source.matchAll(/it\(\s*['"]([^'"]+)['"]/g)) {
        if ((smoke.test!.testNamePattern as RegExp).test(match[1]))
          selected.push(match[1]);
      }
    }
    expect(selected).toHaveLength(5);
    expect(selected).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^IT-101\.1:/),
        expect.stringMatching(/^IT-101\.2:/),
        expect.stringMatching(/^IT-001\.1:/),
        expect.stringMatching(/^IT-106\.1:/),
        'creates a list with default full-access workspace configuration',
      ])
    );
    expect(smoke.test!.include).not.toContain(
      'test/integration/services/IT-201-rate-limiting.integration.test.ts'
    );
  });
  it('serializes real API tiers and never installs the mocked setup', () => {
    for (const config of [smoke, full]) {
      expect(config.test!.fileParallelism).toBe(false);
      expect(config.test!.maxWorkers).toBe(1);
      expect(config.test!.setupFiles).toBeUndefined();
    }
    expect(mocked.test!.setupFiles).toEqual(['./test/setup.ts']);
    expect(full.test!.testNamePattern).toBeUndefined();
    expect(full.test!.include).toContain('test/integration/**/*.test.ts');
  });
});
