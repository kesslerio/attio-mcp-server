export const TEST_PATTERNS = Object.freeze({
  all: 'test/e2e/**/*.e2e.test.ts',
  tools: 'test/e2e/tools/**/*.e2e.test.ts',
  workflows: 'test/e2e/suites/**/*.e2e.test.ts',
  errorHandling: 'test/e2e/suites/error-handling.e2e.test.ts',
  universal: 'test/e2e/suites/universal-*.e2e.test.ts',
  notes: 'test/e2e/suites/notes-*.e2e.test.ts',
  tasks: 'test/e2e/suites/tasks-*.e2e.test.ts',
  lists: 'test/e2e/suites/lists-*.e2e.test.ts',
});

export function resolveTestPattern(patternKey) {
  if (!patternKey || patternKey === 'all') {
    return TEST_PATTERNS.all;
  }

  return TEST_PATTERNS[patternKey] || patternKey;
}

export function listAvailablePatterns() {
  return Object.keys(TEST_PATTERNS).filter((key) => key !== 'all');
}
