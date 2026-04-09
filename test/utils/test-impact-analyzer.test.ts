import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { TestImpactAnalyzer } from '@/utils/test-impact-analyzer.js';

const { execSyncMock, loggerWarnMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
  loggerWarnMock: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: execSyncMock,
}));

vi.mock('@/utils/logger.js', () => ({
  createScopedLogger: () => ({
    warn: loggerWarnMock,
  }),
}));

describe('TestImpactAnalyzer', () => {
  const tempRoots: string[] = [];

  const createTempProject = (): string => {
    const root = mkdtempSync(join(tmpdir(), 'test-impact-analyzer-'));
    tempRoots.push(root);
    return root;
  };

  const writeProjectFile = (
    projectRoot: string,
    relativePath: string,
    content: string
  ): void => {
    const filePath = join(projectRoot, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  };

  beforeEach(() => {
    execSyncMock.mockReset();
    loggerWarnMock.mockReset();
  });

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('discovers impacted tests from source imports without a saved mapping', () => {
    const projectRoot = createTempProject();

    writeProjectFile(
      projectRoot,
      'src/utils/sample.ts',
      'export const sample = 1;\n'
    );
    writeProjectFile(
      projectRoot,
      'test/utils/sample.test.ts',
      [
        "import { describe, expect, it } from 'vitest';",
        "import { sample } from '../../src/utils/sample';",
        '',
        "describe('sample', () => {",
        "  it('returns the sample value', () => {",
        '    expect(sample).toBe(1);',
        '  });',
        '});',
        '',
      ].join('\n')
    );

    execSyncMock.mockReturnValue('M\tsrc/utils/sample.ts\n');

    const analyzer = new TestImpactAnalyzer(projectRoot);
    const selection = analyzer.getAffectedTests();

    expect(selection).toMatchObject({
      affected: ['test/utils/sample.test.ts'],
      category: 'core',
      estimatedTime: '2m',
      reason: '1 tests affected, including smoke tests',
    });
  });

  it('treats documentation-only changes as smoke-only safety checks', () => {
    const projectRoot = createTempProject();

    writeProjectFile(
      projectRoot,
      'config/test-impact-mapping.json',
      JSON.stringify(
        {
          sourceFiles: {},
          testFiles: {},
          categories: {
            smoke: ['test/smoke.test.ts'],
            core: [],
            extended: [],
            integration: [],
          },
        },
        null,
        2
      )
    );

    execSyncMock.mockReturnValue('M\tREADME.md\n');

    const analyzer = new TestImpactAnalyzer(projectRoot);
    const selection = analyzer.getAffectedTests();

    expect(selection).toMatchObject({
      affected: [],
      category: 'smoke',
      estimatedTime: '30s',
      reason: 'Documentation-only changes, running smoke tests for safety',
    });
  });

  it('falls back to smoke tests when git diff inspection fails', () => {
    const projectRoot = createTempProject();

    writeProjectFile(
      projectRoot,
      'config/test-impact-mapping.json',
      JSON.stringify(
        {
          sourceFiles: {},
          testFiles: {},
          categories: {
            smoke: ['test/smoke.test.ts'],
            core: [],
            extended: [],
            integration: [],
          },
        },
        null,
        2
      )
    );

    execSyncMock.mockImplementation(() => {
      throw new Error('git diff failed');
    });

    const analyzer = new TestImpactAnalyzer(projectRoot);
    const selection = analyzer.getAffectedTests();

    expect(selection).toMatchObject({
      affected: ['test/smoke.test.ts'],
      category: 'smoke',
      estimatedTime: '30s',
      reason: 'No specific tests affected, running smoke tests',
    });
    expect(loggerWarnMock).toHaveBeenCalledWith(
      'Failed to get git diff, analyzing all tests',
      { error: 'git diff failed' }
    );
  });
});
