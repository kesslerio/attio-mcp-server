import { describe, expect, it } from 'vitest';
import smoke from '../../configs/vitest/vitest.config.integration-smoke.ts';
import full from '../../configs/vitest/vitest.config.integration.ts';
import mocked from '../../configs/vitest/vitest.config.smoke.ts';

describe('integration tier discovery contract', () => {
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
